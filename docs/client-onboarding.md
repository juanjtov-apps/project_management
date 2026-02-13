# Client Onboarding Module - How It Works

This document explains the complete client onboarding flow in Proesphere: how admins invite clients, how magic link authentication works, and how the guided tour welcomes first-time users.

**Scope:** Client users only (`role=client`). All other roles (admin, project_manager, office_manager, crew, subcontractor) continue using password-based login and are completely unaffected by this module.

---

## Table of Contents

1. [Overview](#overview)
2. [Phase 1: Admin Invites a Client](#phase-1-admin-invites-a-client)
3. [Phase 2: Client Clicks the Magic Link](#phase-2-client-clicks-the-magic-link)
4. [Phase 3: Guided Tour (First Visit Only)](#phase-3-guided-tour-first-visit-only)
5. [Phase 4: Subsequent Logins](#phase-4-subsequent-logins)
6. [Token Security](#token-security)
7. [White-Labeled Emails](#white-labeled-emails)
8. [API Endpoints](#api-endpoints)
9. [Database Tables](#database-tables)
10. [Environment Variables](#environment-variables)
11. [Key Files](#key-files)

---

## Overview

The onboarding module provides a passwordless, white-labeled experience for construction clients (homeowners/business owners). The client never sees "Proesphere" — everything is branded as their contractor's company.

**The flow at a glance:**

```
Admin clicks "Invite Client"
       │
       ▼
Client user created (no password)
Magic link token generated (SHA-256 hash stored)
White-labeled email sent via Resend
       │
       ▼
Client clicks "View Your Project" in email
       │
       ▼
Token verified → session created → cookie set
       │
       ▼
Client lands on their project dashboard
Guided tour starts (first visit only)
```

---

## Phase 1: Admin Invites a Client

**Where:** Client Portal page → "Invite Client" button (visible to admin, project_manager, and office_manager roles)

**What the admin fills out:**

| Field | Required | Description |
|-------|----------|-------------|
| First name | Yes | Client's first name |
| Last name | Yes | Client's last name |
| Email | Yes | Where the magic link is sent |
| Phone | No | For SMS deep-link (future) |
| Project | Yes | Dropdown of company projects |
| Welcome note | No | Personal message included in the email |

**What happens when they click "Invite Client":**

```
POST /api/v1/onboarding/invite-client
```

1. **Verify the caller** is admin, PM, or office manager
2. **Check if email already exists:**
   - If yes and role = `client` → re-invite (update project, send new link)
   - If yes and role != `client` → error 409 (can't convert existing user)
   - If no → create new user
3. **Create user** with:
   - `role = client`
   - `password = NULL` (no password, ever)
   - `assigned_project_id` = selected project
   - `company_id` = caller's company
4. **Create invitation record** in `client_portal.client_invitations` (tracks delivery timestamps, tour completion, and status)
5. **Invalidate previous invite tokens** for this user (if re-inviting)
6. **Generate magic link token:**
   - `raw_token = secrets.token_urlsafe(64)` — 512 bits of entropy
   - `token_hash = SHA-256(raw_token)`
   - Store **only the hash** in the database
   - The raw token is never stored
7. **Build the magic link URL:**
   ```
   https://{MAGIC_LINK_BASE_URL}/auth/magic-link?token={raw_token}
   ```
8. **Send white-labeled email** via Resend (see [White-Labeled Emails](#white-labeled-emails))
9. **Return success** with delivery status

**Token expiry for invites:** 72 hours (3 days)

---

## Phase 2: Client Clicks the Magic Link

The client receives a branded email from their contractor's company (not "Proesphere"). They click the "View Your Project" button.

**What happens step by step:**

```
Browser opens: /auth/magic-link?token=aB3x...long...token
```

1. **`magic-link.tsx` loads**, shows "Signing you in..." with a spinner
2. **Immediately calls:**
   ```
   POST /api/v1/onboarding/verify-magic-link
   { "token": "aB3x...long...token" }
   ```
3. **Backend hashes** the incoming token: `SHA-256("aB3x...")` → `"7f3a..."`
4. **Query the database:**
   ```sql
   UPDATE magic_link_tokens
   SET used_at = NOW()
   WHERE token_hash = '7f3a...'
     AND used_at IS NULL
     AND expires_at > NOW()
   RETURNING user_id, purpose
   ```
5. **If no match** → 401 error: "Invalid, expired, or already used link"
6. **If match** → token is atomically marked as used (single-use enforcement)
7. **Fetch user data** for the matched `user_id`
8. **Check** the user is active (`is_active = true`)
9. **Create a session** (identical to password login):
   - Generate `session_id` (UUID)
   - Store in PostgreSQL `sessions` table + in-memory cache
   - Generate CSRF token
   - Set `session_id` cookie (`httponly`, `secure` in production, `samesite=lax`)
   - Return CSRF token in `X-CSRF-Token` response header
10. **Since this is an invite** (`purpose = 'invite'`):
    - Check if `first_login_at` is NULL in invitations
    - If NULL → this is the first login:
      - Set `first_login_at = NOW()`
      - Set invitation `status = 'accepted'`
      - Return `isFirstLogin: true`
11. **Frontend receives success**, captures CSRF token, invalidates auth queries
12. **Shows a checkmark** "You're in!" for 1 second
13. **Redirects to:** `/client-portal?showTour=true` (if first login) or `/client-portal` (if returning)

**After verification, the client has the exact same session as a password login.** The `useAuth()` hook on the frontend detects the session, and the `AuthenticatedLayout` auto-redirects client users to the Client Portal with their assigned project pre-selected.

---

## Phase 3: Guided Tour (First Visit Only)

When the Client Portal loads and detects a first-time visitor:

1. **`ClientTour` component** calls `GET /api/v1/onboarding/invitation-status`
2. **Response:** `{ hasCompletedTour: false }`
3. **Tour starts** using react-joyride with 4 tooltip steps:

| Step | Target | Message |
|------|--------|---------|
| 1 | Stages tab | "Track your project progress and milestones" |
| 2 | Issues tab | "Report issues or approve selections" |
| 3 | Forum tab | "Message your project manager" |
| 4 | Materials tab | "View and collaborate on materials" |

4. **When the client clicks "Got it!" or "Skip":**
   - Calls `POST /api/v1/onboarding/complete-tour`
   - Sets `has_completed_tour = true` in the database
5. **On all future visits**, the tour does not appear

---

## Phase 4: Subsequent Logins

Client users have no password. When their session expires (after 7 days) or they clear cookies, they request a new magic link.

**How they get back in:**

1. Client goes to `/login` and clicks **"Client? Sign in with magic link"**, or navigates directly to `/auth/request-link`
2. They enter their email and click **"Send Magic Link"**
3. Backend calls:
   ```
   POST /api/v1/onboarding/request-magic-link
   { "email": "sarah@gmail.com" }
   ```
4. **Rate limiting:**
   - Max 3 requests per email per 15 minutes
   - Max 10 requests per IP per 15 minutes
   - Exceeded → 429 Too Many Requests
5. **Anti-enumeration:** The endpoint always returns the same 200 response:
   ```json
   { "message": "If an account exists, a magic link has been sent to your email." }
   ```
   This is true whether the email exists or not. An attacker cannot discover which emails are registered.
6. **If the email belongs to a client user:** A login magic link is generated (15-minute expiry) and a shorter branded email is sent
7. **If the email doesn't exist or belongs to a non-client role:** Nothing is sent, but the same 200 response is returned
8. **Client clicks the link** → same verification flow as Phase 2, but:
   - `isFirstLogin = false` (first_login_at already set)
   - No `showTour=true` → tour doesn't trigger
   - Client goes straight to their project dashboard

---

## Token Security

| Property | Value |
|----------|-------|
| Entropy | 512 bits (`secrets.token_urlsafe(64)`) |
| Storage | SHA-256 hash only — raw token never in DB |
| Single-use | Marked `used_at` atomically on verification (UPDATE...WHERE used_at IS NULL) |
| Invite expiry | 72 hours |
| Login expiry | 15 minutes |
| Invalidation | New invite invalidates all previous invite tokens for that user |
| Rate limiting | 3 per email per 15 min, 10 per IP per 15 min |
| Anti-enumeration | `request-magic-link` always returns 200 with identical message |
| Session | Same as password login: 7-day TTL, httponly secure cookie, CSRF token |

**Why hash-only storage matters:** If someone breaches the database, they find SHA-256 hashes — not usable magic links. The raw token only exists in the email delivered to the client and briefly in server memory during generation.

---

## White-Labeled Emails

All client-facing emails are branded with the contractor's company identity. The word "Proesphere" never appears.

**Invite email includes:**
- Company logo (if uploaded via Company Branding settings)
- Company name in subject line and body
- Brand color on the CTA button
- PM's name ("Mike from ABC Construction set up your project dashboard")
- Project name
- Optional welcome note (quoted with PM attribution)
- "View Your Project" button linking to the magic link URL
- 72-hour expiry notice
- Footer: "Sent on behalf of [Company Name]"

**Login email includes:**
- Company logo and branding
- "Sign in to your project" heading
- "View Your Project" button
- 15-minute expiry notice

**From address:** `"{Company Name}" <noreply@{RESEND_SENDER_DOMAIN}>`

**Company branding is configured by admins** via `PUT /api/v1/onboarding/company-branding`:
- `logo_url` — GCS-stored company logo
- `brand_color` — hex color for buttons/accents (default: `#2563eb`)
- `sender_name` — custom "From" name in emails

---

## API Endpoints

| Endpoint | Method | Auth | Purpose |
|----------|--------|------|---------|
| `/api/v1/onboarding/invite-client` | POST | Admin/PM/OM | Create client user, generate magic link, send email |
| `/api/v1/onboarding/verify-magic-link` | POST | Public | Verify token, create session, return user + isFirstLogin |
| `/api/v1/onboarding/request-magic-link` | POST | Public | Client requests new magic link (rate-limited, anti-enumeration) |
| `/api/v1/onboarding/complete-tour` | POST | Client | Mark guided tour as completed |
| `/api/v1/onboarding/invitation-status` | GET | Client | Check tour completion and first login status |
| `/api/v1/onboarding/company-branding` | PUT | Admin | Update logo, brand color, sender name |

---

## Database Tables

### `client_portal.magic_link_tokens`

| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| user_id | varchar | FK to users.id |
| token_hash | varchar(128) | SHA-256 hash of the raw token |
| purpose | varchar(20) | `'invite'` or `'login'` |
| expires_at | timestamptz | When this token expires |
| used_at | timestamptz | NULL until consumed (single-use) |
| created_at | timestamptz | When token was generated |
| ip_address | varchar(45) | Client IP on verification (audit) |

### `client_portal.client_invitations`

| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| user_id | varchar | FK to users.id |
| project_id | varchar | FK to projects.id |
| company_id | varchar | FK to companies.id |
| invited_by | varchar | FK to users.id (admin who sent invite) |
| welcome_note | text | Optional personal message |
| email_sent_at | timestamptz | When email was delivered |
| sms_sent_at | timestamptz | When SMS was delivered |
| first_login_at | timestamptz | NULL until client first logs in |
| has_completed_tour | boolean | Whether guided tour was completed |
| status | varchar(20) | `'pending'`, `'accepted'`, or `'expired'` |
| created_at | timestamptz | When invitation was created |

### Columns added to existing tables

- `users.phone` (varchar 20) — client phone number
- `companies.logo_url` (text) — GCS object path for company logo
- `companies.brand_color` (varchar 7) — hex color, default `#2563eb`
- `companies.sender_name` (varchar 200) — custom "From" name for emails

---

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `RESEND_API_KEY` | Yes (for email) | Resend API key for transactional emails |
| `RESEND_SENDER_DOMAIN` | No | Verified sender domain (default: `mail.proesphere.com`) |
| `TWILIO_ACCOUNT_SID` | No | Twilio account SID (for SMS) |
| `TWILIO_AUTH_TOKEN` | No | Twilio auth token |
| `TWILIO_PHONE_NUMBER` | No | Twilio phone number for sending SMS |
| `MAGIC_LINK_BASE_URL` | Yes | Base URL for magic links (e.g., `https://yourapp.com`) |

Email and SMS services gracefully degrade — if credentials aren't configured, invitations are still created in the database but delivery is skipped with a warning log.

---

## Key Files

### Backend
| File | Purpose |
|------|---------|
| `python_backend/src/api/onboarding.py` | All 6 API endpoints |
| `python_backend/src/services/magic_link_service.py` | Token generation, verification, invalidation |
| `python_backend/src/services/email_service.py` | White-labeled HTML email templates + Resend delivery |
| `python_backend/src/services/sms_service.py` | SMS delivery via Twilio |
| `python_backend/src/database/init_client_portal.py` | Database migrations (tables + columns) |
| `python_backend/src/core/config.py` | Resend, Twilio, magic link settings |
| `python_backend/src/middleware/security.py` | CSRF exemptions for public magic link endpoints |

### Frontend
| File | Purpose |
|------|---------|
| `client/src/pages/magic-link.tsx` | Token verification page (auto-login + redirect) |
| `client/src/pages/request-magic-link.tsx` | Email form for requesting new magic links |
| `client/src/components/onboarding/invite-client-dialog.tsx` | Admin invite form (name, email, phone, project, note) |
| `client/src/components/onboarding/client-tour.tsx` | 4-step guided tour using react-joyride |
| `client/src/components/onboarding/company-branding-form.tsx` | Logo upload, brand color, sender name settings |
| `client/src/pages/client-portal.tsx` | Hosts invite button + tour integration |
| `client/src/pages/login.tsx` | "Client? Sign in with magic link" link |
| `client/src/App.tsx` | `/auth/magic-link` and `/auth/request-link` public routes |

### Tests
| File | Tests |
|------|-------|
| `python_backend/tests/test_magic_link_service.py` | 13 tests: token generation, hashing, expiry, invalidation |
| `python_backend/tests/test_email_service.py` | 13 tests: HTML templates, white-labeling, brand colors |
| `python_backend/tests/test_sms_service.py` | 4 tests: SMS formatting, Twilio integration |
| `python_backend/tests/test_onboarding_routes.py` | 13 tests: route registration, auth enforcement, validation |
