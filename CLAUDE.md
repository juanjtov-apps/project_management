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

## Database Schemas

The database uses two PostgreSQL schemas:

### `public` Schema (Core Business Logic)

| Table | Purpose |
|-------|---------|
| `companies` | Multi-tenant company entities |
| `users` | User accounts with role assignments |
| `projects` | Construction projects |
| `tasks` | Project tasks/punch list items |
| `roles` | Role definitions (6 templates) |
| `permissions` | 26 granular permissions |
| `role_permissions` | Role-to-permission mappings |
| `audit_logs` | System-wide audit trail |
| `sessions` | User session management |

### `client_portal` Schema (Client-Facing Features)

| Feature | Tables |
|---------|--------|
| Issues | `issues`, `issue_comments`, `issue_attachments`, `issue_audit_log` |
| Forum | `forum_threads`, `forum_messages`, `forum_attachments` |
| Materials | `material_areas`, `material_items`, `material_templates` |
| Payments | `payment_schedules`, `payment_installments`, `invoices`, `payment_receipts`, `payment_documents` |
| Stages | `project_stages`, `stage_templates`, `stage_template_items` |
| Notifications | `pm_notifications`, `pm_notification_prefs` |

**Schema initialization:** `python_backend/src/database/init_client_portal.py`

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

### Required
- `DATABASE_URL_DEV` - Neon PostgreSQL for development
- `DATABASE_URL_PROD` - Neon PostgreSQL for production (Replit)
- `DATABASE_URL` - Fallback PostgreSQL connection string
- `SESSION_SECRET` - Secret for session encryption

### Optional (Legacy Cloud SQL)
- `DB_SSL_DIR` - Directory with SSL certificates
- `DB_SSL_ROOT_CERT`, `DB_SSL_CERT`, `DB_SSL_KEY` - Individual cert paths

**Note:** Development and production both use Neon PostgreSQL. Cloud SQL configuration is retained for legacy compatibility but is not actively used.

## GCS Photo Upload Pattern

### The Problem We Solved

When implementing photo uploads with Google Cloud Storage signed URLs, we encountered a bug where **photo previews showed errors** before saving. The root cause:

1. **PUT signed URLs cannot be used for GET operations** - The upload endpoint returned only a PUT URL for uploading files
2. **Frontend used the PUT URL as image src** - This fails because PUT URLs are only valid for uploading, not viewing
3. **URLs expire quickly** - Even if they worked, 15-minute expiry caused stale previews

### Correct Implementation Pattern

When implementing GCS file uploads with preview functionality, always return **three values** from the upload endpoint:

#### Backend (`/api/objects/upload`)
```python
@router.post("/upload")
async def get_upload_url():
    object_id = str(uuid.uuid4())
    object_path = get_object_path(object_id, clean_private_dir)

    # PUT URL for uploading (short expiry is fine)
    upload_url = await generate_signed_url(bucket_id, object_path, method="PUT", expires_minutes=15)

    # GET URL for preview (longer expiry for user interaction time)
    preview_url = await generate_signed_url(bucket_id, object_path, method="GET", expires_minutes=60)

    return {
        "uploadURL": upload_url,      # For uploading the file
        "previewURL": preview_url,    # For displaying preview in UI
        "objectPath": object_path     # For storing in database
    }
```

#### Frontend Upload Handler
```typescript
// Separate state for display vs storage
const [previewUrls, setPreviewUrls] = useState<string[]>([]);  // For <img src>
const [objectPaths, setObjectPaths] = useState<string[]>([]);  // For API submission

const handleGetUploadParameters = async () => {
  const response = await apiRequest("/api/objects/upload", { method: "POST" });
  const data = await response.json();
  return {
    method: "PUT" as const,
    url: data.uploadURL,
    previewURL: data.previewURL,
    objectPath: data.objectPath,
  };
};

const handleUploadComplete = (results: Array<{ previewURL: string; objectPath: string }>) => {
  setPreviewUrls([...previewUrls, ...results.map(r => r.previewURL)]);
  setObjectPaths([...objectPaths, ...results.map(r => r.objectPath)]);
};

// On form submit, send objectPaths (NOT previewUrls)
const onSubmit = () => {
  apiRequest("/api/endpoint", {
    method: "POST",
    body: { photos: objectPaths }  // Store paths, not URLs
  });
};
```

#### Database Storage
- **Store object paths** (e.g., `.private/uploads/uuid`), NOT signed URLs
- Signed URLs expire; object paths are permanent
- Generate fresh signed URLs when retrieving photos for display

### Key Files for Reference
- `python_backend/src/api/objects.py` - Upload endpoint returning all three values
- `client/src/components/ObjectUploader.tsx` - Reusable upload component with `UploadResult` interface
- `client/src/components/client-portal/issues-tab.tsx` - Example usage with separate preview/path state

### Checklist for New Photo Upload Features
- [ ] Backend returns `uploadURL`, `previewURL`, and `objectPath`
- [ ] Frontend has separate state for preview URLs (display) and object paths (storage)
- [ ] Form submission sends object paths, not preview URLs
- [ ] Remove handlers update both preview and path arrays
- [ ] Reset functions clear both arrays
- [ ] Backend stores object paths in database
- [ ] Retrieval endpoint generates fresh signed URLs from stored paths
