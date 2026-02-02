# Feature Status Tracker

This document tracks features that are partially implemented, hidden, or pending completion.
It serves as a reference for developers working on the codebase.

---

## Hidden Features (UI exists but disabled)

### Risk Assessments

- **Status:** Hidden - Backend not implemented
- **Frontend:** `client/src/components/project-health/add-risk-dialog.tsx`
- **Schema:** `shared/schema.ts` - `riskAssessments` table defined
- **Database:** Table exists in Drizzle schema but not actively used

**Missing Implementation:**
1. `python_backend/src/api/v1/risk_assessments.py` - CRUD endpoints
2. Repository functions in `repositories.py`
3. Frontend integration and display

**To Enable:**
1. Create API endpoint at `/api/v1/risk-assessments` with:
   - `GET /` - List risk assessments (with project filtering)
   - `POST /` - Create new risk assessment
   - `PATCH /{id}` - Update risk assessment
   - `DELETE /{id}` - Delete risk assessment
2. Add router to `python_backend/src/api/v1/__init__.py`
3. Unhide the Add Risk dialog in the frontend

**Priority:** Low - Not needed for initial launch

---

## Fully Implemented Features

### Client Portal

| Feature | Status | Files |
|---------|--------|-------|
| Issues | Complete | `client_module.py`, `issues-tab.tsx` |
| Issue Comments | Complete | `client_module.py` |
| Issue Photos | Complete | `client_module.py`, `ObjectUploader.tsx` |
| Issue Audit Log | Complete | `client_module.py` |
| Materials | Complete | `client_module.py`, `materials-tab.tsx` |
| Material Areas | Complete | `client_module.py` |
| Material Templates | Complete | `client_module.py`, `stage_repository.py` |
| Material Approval Workflow | Complete | `client_module.py` |
| Material Order Status | Complete | `client_module.py` |
| Payments | Complete | `client_module.py`, `payments-tab.tsx` |
| Payment Schedules | Complete | `client_module.py` |
| Payment Installments | Complete | `client_module.py` |
| Payment Receipts | Complete | `client_module.py` |
| Invoices (Client Portal) | Complete | `client_module.py` |
| Project Stages | Complete | `stages.py`, `stage_repository.py` |
| Stage Templates | Complete | `stages.py` |
| Forum | Complete | `client_module.py`, `forum-tab.tsx` |
| PM Notifications | Complete | `client_module.py`, `notification_service.py` |

### Core Features

| Feature | Status | Files |
|---------|--------|-------|
| Authentication | Complete | `auth.py` |
| Session Management | Complete | `auth.py` (in-memory + DB) |
| RBAC | Complete | `rbac.py`, `rbac_init.py` |
| Projects CRUD | Complete | `projects.py` |
| Tasks/Punch List | Complete | `tasks.py` |
| Photo Management | Complete | `photos.py`, `objects.py` |
| User Management | Complete | `user_management.py` |
| Company Management | Complete | `company_admin.py` |
| Project Logs | Complete | `logs.py` |
| Audit Logging | Complete | Various endpoints |

---

## Stub Endpoints (Return empty/501)

### Invoices API (v1)

- **File:** `python_backend/src/api/v1/invoices.py`
- **Status:** GET returns `[]`, POST returns 501 Not Implemented
- **Reason:** Client portal has its own invoice system in `client_module.py`
- **Action:** Consider removing stub or implementing for non-portal use

### Risk Assessments

- **File:** Does not exist
- **Status:** Frontend exists, backend missing
- **Action:** Implement when feature is needed

---

## Known Limitations

### Session Storage

- **Current:** In-memory with database backup
- **Limitation:** Sessions lost on server restart, doesn't support multiple server instances
- **Solution:** Implement Redis-based session storage
- **Priority:** Medium - works for single-instance deployment

### Rate Limiting

- **Current:** Basic rate limiting middleware exists
- **Limitation:** No specific auth endpoint rate limiting
- **Risk:** Brute force attacks on login
- **Solution:** Implement per-endpoint rate limits
- **Priority:** Medium

### CSRF Protection

- **Current:** 15-minute token expiration, in-memory storage
- **Limitation:** Tokens lost on restart
- **Solution:** Store in Redis
- **Priority:** Low - acceptable for current use

---

## Future Enhancements (Not Started)

| Feature | Description | Priority |
|---------|-------------|----------|
| Redis Sessions | Replace in-memory session store | Medium |
| Auth Rate Limiting | Stricter limits on login/password reset | Medium |
| Email Notifications | Send emails for issues, payments, etc. | Low |
| WebSocket Updates | Real-time updates for collaborative features | Low |
| File Type Validation | Validate uploaded file types server-side | Low |
| Report Generation | PDF reports for projects, payments | Low |

---

## Schema Status

### Public Schema (Drizzle-managed)

All tables defined in `shared/schema.ts`:
- companies, users, roles, permissions, role_permissions
- projects, tasks, project_logs, photos
- user_activities, notifications, schedule_changes
- time_entries, subcontractor_assignments
- project_health_metrics, risk_assessments (unused)
- health_check_templates, communications
- change_orders, invoices, audit_logs, waitlist, sessions

### Client Portal Schema (SQL-managed)

All tables defined via migrations in `python_backend/src/database/migrations/`:
- issues, issue_comments, issue_attachments, issue_audit_log
- forum_threads, forum_messages, forum_attachments
- material_areas, material_items, material_templates
- payment_schedules, payment_installments, payment_documents
- payment_receipts, invoices, payment_events
- project_stages, stage_templates, stage_template_items
- pm_notifications, pm_notification_prefs
- alembic_version (migration tracking)

---

*Last updated: February 2026*
