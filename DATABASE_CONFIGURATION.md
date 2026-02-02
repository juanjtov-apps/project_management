# Database Configuration Guide

This project uses **Neon PostgreSQL** for both development and production environments.

## Primary Configuration: Neon

Both development and production use Neon serverless PostgreSQL:

```bash
# Development
export DATABASE_URL_DEV="postgresql://user:password@ep-xxx.neon.tech/dbname?sslmode=require"

# Production (Replit)
export DATABASE_URL_PROD="postgresql://user:password@ep-yyy.neon.tech/dbname?sslmode=require"

# Fallback
export DATABASE_URL="postgresql://user:password@xxx.neon.tech/dbname?sslmode=require"
```

The system automatically:
- Selects `DATABASE_URL_DEV` when `NODE_ENV=development`
- Selects `DATABASE_URL_PROD` when `NODE_ENV=production`
- Falls back to `DATABASE_URL` if specific env not set
- Uses `sslmode=require` for Neon connections

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

## Environment Variables Summary

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL_DEV` | Development | Neon PostgreSQL for development |
| `DATABASE_URL_PROD` | Production | Neon PostgreSQL for production (Replit) |
| `DATABASE_URL` | Fallback | PostgreSQL connection string (fallback) |
| `NODE_ENV` | No | Determines which database URL to use |

## Testing Connections

### Python Backend
```bash
cd python_backend
python test_db_connection.py
```

### Node.js Server
The server will log connection status on startup:
- `🔵 Connecting to Neon database` - Neon detected
- `✅ Database connection established` - Connection successful

## Legacy: Cloud SQL Configuration

Cloud SQL is no longer used for development but configuration is retained for legacy compatibility:

```bash
export DATABASE_URL="postgresql://user:password@PUBLIC_IP:5432/dbname"
export DB_SSL_DIR="/path/to/ssl/certificates"
```

SSL certificate files required for Cloud SQL:
- `server-ca.pem` (required)
- `client-cert.pem` (optional)
- `client-key.pem` (optional)

| Variable | Description |
|----------|-------------|
| `DB_SSL_DIR` | Directory containing SSL certificates |
| `DB_SSL_ROOT_CERT` | Path to server CA certificate |
| `DB_SSL_CERT` | Path to client certificate |
| `DB_SSL_KEY` | Path to client private key |

