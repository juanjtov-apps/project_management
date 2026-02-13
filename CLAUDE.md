# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Proesphere** - A construction project management system with a "Pure Proxy" architecture where Node.js serves only as a frontend server and API proxy, while Python FastAPI handles all backend logic.

## Architecture

```
Browser → Node.js (port 5000) → FastAPI (port 8000) → PostgreSQL
            ↑                        ↑
      Serves React             ALL business logic
      + API proxy              RBAC + Database ops
```

### Critical Architecture Rules

1. **Node.js (Port 5000)**: ONLY serves React frontend and proxies `/api/*` requests to FastAPI
   - NO database queries or business logic in `server/`
   - NO imports of `db` or `drizzle` in endpoint handlers
   - Session management is allowed

2. **FastAPI (Port 8000)**: Handles ALL backend logic
   - All database operations via Repository Pattern
   - All RBAC checks and business logic
   - All API endpoints at `/api/v1/*`

3. **Authentication is entirely in FastAPI**: Sessions are stored in PostgreSQL (not Node.js). The login flow is: frontend → Node proxy → FastAPI `/api/v1/auth/login` → bcrypt validation → DB session (7-day TTL). The `useAuth` hook queries `/api/v1/auth/user` for session state.

## Database

### Two PostgreSQL Schemas

**`public` schema** — Core business: `companies`, `users`, `projects`, `tasks`, `roles`, `permissions`, `role_permissions`, `audit_logs`, `sessions`

**`client_portal` schema** — Client-facing: issues, forum, materials, payments, stages, notifications (see `python_backend/src/database/init_client_portal.py` for full table list)

### Schema Initialization

Schemas are initialized at FastAPI startup via safe, additive SQL migrations (CREATE TABLE IF NOT EXISTS) inside transactions. See `init_client_portal.py` and `init_agent_schema.py`. These run automatically — no manual migration step needed for new schemas.

### Drizzle (Node.js reference only)

`shared/schema.ts` defines types for the Node.js layer. Push schema changes with `npm run db:push`. Config: `drizzle.config.ts`.

## Development Commands

### Start Both Servers
```bash
./start-servers.sh    # Starts both with health checks, port conflict detection, monitoring
```

### Start Independently
```bash
# Terminal 1 - Python backend
cd python_backend && python3 main.py

# Terminal 2 - Node.js frontend
npm run dev
```

### Python Tests
```bash
cd python_backend && python -m pytest                    # Run all tests
cd python_backend && python -m pytest tests/test_api_routes.py  # Single file
cd python_backend && python -m pytest -k "test_name"     # Single test by name
```
pytest.ini: `asyncio_mode = auto`, test discovery in `python_backend/tests/`. Uses `pytest-asyncio` and `httpx` AsyncClient.

### Other Commands
```bash
npm run build          # Build frontend for production
npm run check          # TypeScript type checking
npm run db:push        # Push Drizzle schema changes
```

## Key Directories

- `client/` - React frontend (Wouter routing, TanStack Query, Radix UI/shadcn)
- `python_backend/` - FastAPI backend (all business logic)
- `server/` - Express proxy only (no DB operations)
- `shared/` - Drizzle schema types (Node.js reference only)

## Backend Structure (python_backend/)

- `src/api/v1/` - Core API routers (auth, projects, tasks, photos, logs, rbac, users, etc.)
- `src/api/` - Additional routers (company_admin, onboarding, schedule, etc.) imported via try/except in `src/api/v1/__init__.py`
- `src/models/` - Pydantic models for request/response validation
- `src/database/repositories.py` - Repository Pattern for all DB access
- `src/database/auth_repositories.py` - Auth-specific DB queries
- `src/database/connection.py` - asyncpg connection pool (auto-detects Neon vs Cloud SQL for SSL)
- `src/services/` - Business logic services (email via Resend, SMS via Twilio, magic links)
- `src/middleware/` - Security headers, rate limiting, CSRF, request tracking
- `src/core/config.py` - Settings and environment variables

### Router Registration Pattern

Routers in `src/api/v1/__init__.py` use try/except imports for optional modules. Core routers are always included; optional routers (schedule, notifications, agent, etc.) gracefully degrade if their module doesn't exist.

## Frontend Structure (client/)

- `src/pages/` - Page components
- `src/components/` - Reusable UI components
- `src/hooks/useAuth.ts` - Authentication hook (React Query)
- `src/lib/queryClient.ts` - TanStack Query configuration

### Vite Path Aliases
- `@` → `client/src`
- `@shared` → `shared`
- `@assets` → `attached_assets`

### Tailwind Theme
Custom construction-themed palette with `pro-*` color tokens, `mint`, `brand`, `navy`. Dark mode via class strategy. Config: `tailwind.config.ts`.

## Coding Standards

### Python (Backend)
- Type hints mandatory: `def get_project(id: int) -> Project:`
- Async/await for all DB operations
- Use Repository Pattern in `repositories.py`
- Raise `HTTPException` for errors
- Use Pydantic models for all request/response schemas
- Early returns for error conditions; happy path last
- Use descriptive names with auxiliary verbs: `is_active`, `has_permission`

### TypeScript (Frontend)
- Strict mode, no `any` types
- Functional components only
- Use TanStack Query for data fetching (not useEffect)
- Fetch relative paths (`/api/v1/...`) - never hardcode localhost:8000
- Use Wouter for routing (not React Router)

## RBAC System

All RBAC operations are in FastAPI (`python_backend/src/api/v1/rbac.py` and `python_backend/src/api/user_management.py`):
- 6 role templates: admin, project_manager, office_manager, crew, subcontractor, client
- 26 granular permissions
- Row-level security via company_id filtering in every query
- Frontend uses `ProtectedRoute` component with `requiredPermission` prop

## Construction Domain Terms

- "Foreman" = Site Supervisor
- "RFI" = Request for Information
- "Punch List" = Task list
- "Sub" = Subcontractor

## API Documentation

- Swagger UI: http://localhost:8000/docs
- ReDoc: http://localhost:8000/redoc
- Health check: http://localhost:8000/health

## Environment Variables

### Required
- `DATABASE_URL_DEV` - Neon PostgreSQL for development
- `DATABASE_URL_PROD` - Neon PostgreSQL for production (Replit)
- `DATABASE_URL` - Fallback PostgreSQL connection string
- `SESSION_SECRET` - Secret for session encryption

### Optional
- `MAGIC_LINK_BASE_URL` - Base URL for client onboarding magic links
- `RESEND_API_KEY` - Email service (Resend)
- `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_PHONE_NUMBER` - SMS service
- `DB_SSL_DIR`, `DB_SSL_ROOT_CERT`, `DB_SSL_CERT`, `DB_SSL_KEY` - Legacy Cloud SQL SSL certs (not actively used; dev and prod use Neon)

## GCS Photo Upload Pattern

When implementing GCS file uploads with preview, the upload endpoint must return **three values**: `uploadURL` (PUT signed URL), `previewURL` (GET signed URL), and `objectPath` (permanent path for DB storage).

**Key rules:**
- PUT signed URLs cannot be used for GET (previews) — always generate separate GET URLs
- Frontend must have separate state for preview URLs (display) and object paths (storage)
- Form submission sends object paths, NOT preview URLs
- Database stores object paths; retrieval endpoints generate fresh signed URLs

**Reference files:**
- `python_backend/src/api/objects.py` - Upload endpoint
- `client/src/components/ObjectUploader.tsx` - Reusable upload component
- `client/src/components/client-portal/issues-tab.tsx` - Example usage
