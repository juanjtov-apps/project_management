# Proesphere

Construction project management platform built for general contractors. Manage projects, tasks, schedules, budgets, photos, client communications, and AI-assisted operations — all from one place.

## Architecture

Proesphere uses a **Pure Proxy** architecture where Node.js serves the React frontend and proxies API requests, while Python FastAPI handles all business logic.

```
Browser → Node.js (port 5000) → FastAPI (port 8000) → PostgreSQL (Neon)
             ↑                        ↑
       Serves React             ALL business logic
       + API proxy              RBAC + Database ops
```

- **Node.js (port 5000)**: Serves the React SPA and proxies `/api/*` — no database queries or business logic
- **FastAPI (port 8000)**: All API endpoints, RBAC, database operations via asyncpg
- **PostgreSQL**: Two schemas — `public` (core business) and `client_portal` (client-facing features)
- **Google Cloud Storage**: Photo and file uploads with signed URLs

## Tech Stack

| Layer | Technologies |
|-------|-------------|
| Frontend | React 18, TypeScript, Wouter, TanStack Query, Tailwind CSS |
| UI Components | Radix UI / shadcn, Framer Motion, GSAP, Recharts, Lucide icons |
| Forms & DnD | React Hook Form, Zod, @dnd-kit |
| File Upload | Uppy (GCS signed URLs) |
| Backend | Python FastAPI, asyncpg, Pydantic, bcrypt |
| Database | Neon PostgreSQL (dev & prod) |
| Storage | Google Cloud Storage (signed URLs) |
| Email | Resend (transactional, white-labeled) |
| SMS | Twilio |
| AI | Agentic AI with tool-based orchestration and SSE streaming |

## Features

### Dashboard

Overview of all active projects with KPI cards, activity feed, and quick actions. Four tabbed views:

- **Project Overview** — multi-project summary with recent activity and quick actions
- **Task Management** — expired/upcoming tasks, today's assignments
- **Communications** — cross-project communication feed
- **Financial Health** — budget tracking, cost analysis, margin monitoring

### Projects & Tasks

Unified work management at `/work` with a segmented Projects/Tasks view.

- Project CRUD with status, budget, and progress tracking
- Task assignment, priorities, due dates, and status updates
- Visual project stages with drag-and-drop reordering
- Inline task editing with auto-save
- Overdue task detection and filtering
- Project quick-view drawer

### Client Portal

A dedicated portal for construction clients (homeowners/business owners) with six tabbed modules:

| Tab | Features |
|-----|----------|
| **Stages** | Visual project timeline, stage templates, progress tracking, insert-between, drag-and-drop |
| **Issues** | Ticket creation, comments, photo attachments, assignments, visibility control, full audit log |
| **Forum** | Discussion threads, nested replies, thread pinning, file attachments |
| **Materials** | Material areas (rooms/zones), item specs, vendor links, status tracking, templates, drag-and-drop |
| **Payments** | Payment schedules, installment tracking, receipts, invoice attachments, due date management |
| **Notifications** | PM notification preferences, event-based alerts, channel and cadence settings |

### Client Onboarding (Magic Link Auth)

Passwordless, white-labeled onboarding exclusively for client users. Admins invite clients in 30 seconds — clients authenticate via magic links, never needing a password. All other roles continue using password-based login.

- **Admin invite flow**: Name, email, phone, project, welcome note — branded email + SMS sent automatically
- **Magic link verification**: SHA-256 hashed tokens, single-use, 72h invite / 15min login expiry
- **White-labeled emails**: Contractor's logo, brand color, company name — "Proesphere" never appears
- **Guided tour**: 4-step react-joyride walkthrough on first visit (Stages, Issues, Forum, Materials)
- **Anti-enumeration**: `request-magic-link` always returns 200 regardless of email existence
- **Rate limiting**: 3 requests/email/15min, 10 requests/IP/15min
- **Company branding**: Admin-configurable logo, brand color, and email sender name

See [docs/client-onboarding.md](docs/client-onboarding.md) for the full technical walkthrough.

### RBAC Admin

Granular role-based access control with three-tier authorization:

- **6 role templates**: admin, project_manager, office_manager, crew, subcontractor, client
- **26 granular permissions** across projects, tasks, RBAC, client portal, and more
- **User management**: Create, edit, activate/deactivate users with role assignment
- **Company management** (root admin): Multi-tenant company creation, subscription tiers, company settings
- **Row-level security**: Multi-tenant data isolation at the database level via company_id filtering

### Project Health

Health scoring and risk assessment dashboard:

- Overall health score (0–100) with category breakdowns (schedule, budget, quality, resources)
- Risk identification with impact/probability matrix and mitigation plans
- Color-coded health cards per project

### Schedule

Four-view schedule management:

- **Overview**: Schedule change requests with approval/rejection workflow
- **Timeline**: Visual timeline of project milestones
- **Gantt**: Gantt chart view across projects
- **Calendar**: Monthly calendar with day-by-day task visualization

### Photos

GCS-backed photo gallery with tagging and organization:

- Upload with signed URLs (PUT for upload, GET for preview, object path for storage)
- Tag system, project filtering, and full-text search
- Grid and list views with full-screen preview
- Photos linked to daily log entries

### Logs

Project documentation with four log types:

- **General**: Daily notes and observations
- **Issue**: Problem documentation and tracking
- **Milestone**: Achievement and phase completion records
- **Safety**: Safety incidents and concerns

Each log supports rich descriptions, multi-photo attachments, tags, and status tracking.

### Agentic AI

Natural language interface for project operations powered by a tool-based agent architecture:

- **8+ agent tools**: Projects, tasks, stages, materials, issues, payments, and dynamic database queries
- **Conversation persistence**: Multi-turn conversations with project context switching
- **Real-time streaming**: Server-sent events (SSE) for live responses
- **Tool execution feedback**: Visual indicators for each tool call in the chat UI
- **Feedback system**: Thumbs up/down on agent responses for continuous improvement
- **Confirmation workflows**: High-risk actions require explicit user approval

### Notifications

In-app notification system with bell icon, unread counts, and a full notification center. PM-specific notifications with configurable preferences (event types, channels, cadence).

## Database

Two PostgreSQL schemas handle data isolation between core business logic and client-facing features:

**`public` schema** — companies, users, projects, tasks, photos, project_logs, roles, permissions, role_permissions, sessions, audit_logs

**`client_portal` schema** — issues (+ comments, attachments, audit), forum (threads, messages, attachments), materials (items, areas, templates), payments (schedules, installments, invoices, receipts, documents), stages (+ templates), notifications (+ preferences), magic_link_tokens, client_invitations

## Getting Started

### Prerequisites

- Node.js 18+
- Python 3.10+
- PostgreSQL (Neon recommended)
- Google Cloud Storage bucket (for photos)

### Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL_DEV` | Yes | Neon PostgreSQL connection string (development) |
| `DATABASE_URL_PROD` | Yes | Neon PostgreSQL connection string (production) |
| `DATABASE_URL` | Fallback | PostgreSQL connection string (fallback) |
| `SESSION_SECRET` | Yes | Secret for session encryption |
| `GCP_PROJECT_ID` | Yes | Google Cloud project ID |
| `RESEND_API_KEY` | For email | Resend API key for transactional emails |
| `RESEND_SENDER_DOMAIN` | No | Verified sender domain (default: `mail.proesphere.com`) |
| `TWILIO_ACCOUNT_SID` | For SMS | Twilio account SID |
| `TWILIO_AUTH_TOKEN` | For SMS | Twilio auth token |
| `TWILIO_PHONE_NUMBER` | For SMS | Twilio sender phone number |
| `MAGIC_LINK_BASE_URL` | Yes | Base URL for magic links (e.g., `https://yourapp.com`) |

### Install Dependencies

```bash
# Frontend
npm install

# Backend
cd python_backend && pip install -r requirements.txt
```

### Start Both Servers

```bash
./start-servers.sh
```

The script starts both servers, monitors health, handles port conflicts, and provides colored console output.

### Start Independently

```bash
# Terminal 1 — Python backend (port 8000)
cd python_backend && python3 main.py

# Terminal 2 — Node.js frontend + proxy (port 5000)
npm run dev
```

### Access the Application

- **Frontend**: http://localhost:5000
- **Swagger UI**: http://localhost:8000/docs
- **ReDoc**: http://localhost:8000/redoc
- **Health check**: http://localhost:8000/health

## Other Commands

```bash
npm run build          # Build frontend for production
npm run check          # TypeScript type checking

# Python tests
cd python_backend && python3 -m pytest tests/ -v
```

## Project Structure

```
├── client/                     # React frontend
│   └── src/
│       ├── pages/              # Page components (dashboard, work, photos, logs, etc.)
│       ├── components/         # Reusable UI components
│       │   ├── client-portal/  # Client portal tabs (issues, forum, materials, etc.)
│       │   ├── onboarding/     # Invite dialog, guided tour, company branding
│       │   ├── rbac/           # RBAC admin components
│       │   ├── dashboard/      # Dashboard widgets
│       │   ├── agent/          # AI chat interface
│       │   └── ui/             # shadcn base components
│       ├── hooks/              # Custom hooks (useAuth, etc.)
│       └── lib/                # Utilities (queryClient, etc.)
├── python_backend/             # FastAPI backend
│   └── src/
│       ├── api/                # API endpoints
│       │   └── v1/             # Versioned routes
│       ├── agent/              # Agentic AI (orchestrator, tools, context)
│       ├── services/           # Email, SMS, magic link services
│       ├── models/             # Pydantic request/response models
│       ├── database/           # Connection pool, repositories, migrations
│       ├── middleware/          # Security, CSRF, rate limiting
│       └── core/               # Settings and configuration
├── server/                     # Express proxy (no business logic)
├── docs/                       # Documentation and PRDs
└── start-servers.sh            # Combined server startup script
```

## Documentation

| Document | Description |
|----------|-------------|
| [CLAUDE.md](CLAUDE.md) | Architecture rules, coding standards, and development reference |
| [docs/client-onboarding.md](docs/client-onboarding.md) | Magic link onboarding technical walkthrough |
| [docs/prds/onboarding.md](docs/prds/onboarding.md) | Client onboarding PRD |
| [docs/prds/Proesphere_Agentic_AI_PRD.md](docs/prds/Proesphere_Agentic_AI_PRD.md) | Agentic AI specification |

## Security

- **Session-based auth**: PostgreSQL-backed sessions with bcrypt password hashing
- **Magic link auth**: SHA-256 hash-only storage, single-use tokens, expiry enforcement
- **RBAC**: 26 granular permissions with row-level multi-tenant isolation
- **CSRF protection**: Token-based CSRF with exemptions for public endpoints
- **Rate limiting**: Per-endpoint rate limiting on sensitive operations
- **Anti-enumeration**: Magic link requests return identical responses regardless of email existence
- **Company isolation**: All queries scoped by company_id — no cross-tenant data access

## Troubleshooting

### Port Already in Use

```bash
lsof -i :5000    # Check port 5000
lsof -i :8000    # Check port 8000
lsof -ti:5000 | xargs kill   # Free port 5000
lsof -ti:8000 | xargs kill   # Free port 8000
```

### Database Connection Fails

1. Verify `DATABASE_URL_DEV` or `DATABASE_URL_PROD` is set correctly
2. Test Python connection: `cd python_backend && python test_db_connection.py`
3. Test Node connection: `npm run test:db`
4. Ensure the database allows connections from your IP

### Python Backend Not Starting

1. Check Python version: `python3 --version` (must be 3.10+)
2. Verify dependencies: `pip install -r python_backend/requirements.txt`
3. Check for import errors in the console output

### Frontend Not Loading

1. Check browser console for errors
2. Verify both servers are running
3. Clear browser cache and retry
