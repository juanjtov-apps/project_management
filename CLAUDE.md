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

## Development Commands

### Start Both Servers
```bash
./start-servers.sh
```

### Start Independently
```bash
# Terminal 1 - Python backend
cd python_backend && python3 main.py

# Terminal 2 - Node.js frontend
npm run dev
```

### Other Commands
```bash
npm run build          # Build frontend for production
npm run check          # TypeScript type checking
npm run db:push        # Push Drizzle schema changes
npm run test:db        # Test Node.js database connection

# Python backend
cd python_backend && pip install -r requirements.txt
cd python_backend && python test_db_connection.py
```

## Key Directories

- `client/` - React frontend (Wouter routing, TanStack Query, Radix UI/shadcn)
- `python_backend/` - FastAPI backend (all business logic)
- `server/` - Express proxy only (no DB operations)
- `shared/` - Database types (reference only)

## Backend Structure (python_backend/)

- `src/api/v1/` - API endpoints (projects, tasks, rbac, users, photos, etc.)
- `src/models/` - Pydantic models for request/response validation
- `src/database/repositories.py` - Repository Pattern for all DB access
- `src/database/connection.py` - asyncpg connection pool
- `src/core/config.py` - Settings and environment variables

## Frontend Structure (client/)

- `src/pages/` - Page components
- `src/components/` - Reusable UI components
- `src/hooks/useAuth.ts` - Authentication hook (React Query)
- `src/lib/queryClient.ts` - TanStack Query configuration

## Coding Standards

### Python (Backend)
- Type hints mandatory: `def get_project(id: int) -> Project:`
- Async/await for all DB operations
- Use Repository Pattern in `repositories.py`
- Raise `HTTPException` for errors
- Use Pydantic models for all request/response schemas

### TypeScript (Frontend)
- Strict mode, no `any` types
- Functional components only
- Use TanStack Query for data fetching (not useEffect)
- Fetch relative paths (`/api/v1/...`) - never hardcode localhost:8000
- Use Wouter for routing (not React Router)

## RBAC System

All RBAC operations are in FastAPI (`python_backend/src/api/v1/rbac.py`):
- 6 role templates: admin, project_manager, office_manager, crew, subcontractor, client
- 26 granular permissions
- Row-level security via company_id filtering in every query

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

Required:
- `DATABASE_URL` - PostgreSQL connection string
- `SESSION_SECRET` - Secret for session encryption

Optional (Cloud SQL):
- `DB_SSL_DIR` - Directory with SSL certificates
