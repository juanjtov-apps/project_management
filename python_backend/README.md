# Proesphere Python Backend

A well-structured Python backend for the Proesphere construction project management system built with FastAPI.

## Architecture

### Directory Structure

```
python_backend/
├── src/
│   ├── api/                 # API route handlers
│   │   ├── projects.py      # Project endpoints
│   │   ├── tasks.py         # Task endpoints  
│   │   ├── photos.py        # Photo endpoints
│   │   ├── dashboard.py     # Dashboard endpoints
│   │   └── __init__.py      # API router configuration
│   ├── models/              # Pydantic models
│   │   ├── base.py          # Base models and enums
│   │   ├── project.py       # Project models
│   │   ├── task.py          # Task models
│   │   ├── user.py          # User models
│   │   ├── photo.py         # Photo models
│   │   ├── log.py           # Project log models
│   │   ├── notification.py  # Notification models
│   │   ├── schedule_change.py # Schedule change models
│   │   └── __init__.py      # Model exports
│   ├── database/            # Database layer
│   │   ├── connection.py    # Database connection management
│   │   ├── repositories.py  # Data access repositories
│   │   └── __init__.py
│   ├── core/                # Core configuration
│   │   ├── config.py        # Application settings
│   │   └── __init__.py
│   ├── utils/               # Utilities
│   │   ├── data_conversion.py # camelCase/snake_case conversion
│   │   └── __init__.py
│   └── __init__.py
├── tests/                   # Test files
├── migrations/              # Database migrations
├── main.py                  # Application entry point
├── requirements.txt         # Python dependencies
└── README.md               # This file
```

## Features

### API Endpoints
- **Projects**: CRUD operations for construction projects
- **Tasks**: Task management with categories and assignments
- **Photos**: File upload and management with project association
- **Dashboard**: Statistics and overview data
- **Users**: User management and authentication (ready)
- **Logs**: Project logging and documentation (ready)
- **Notifications**: Real-time notification system (ready)
- **Schedule Changes**: Crew schedule modification requests (ready)

### Database Integration
- PostgreSQL with asyncpg for async operations
- Repository pattern for clean data access
- Automatic camelCase/snake_case conversion for frontend compatibility
- Connection pooling for performance

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

**Schema initialization:** `src/database/init_client_portal.py`

### Development Features
- FastAPI with automatic API documentation
- Pydantic models for data validation
- CORS middleware for frontend integration
- File upload handling for photos
- Environment-based configuration

## Installation

1. Install dependencies:
```bash
cd python_backend
pip install -r requirements.txt
```

2. Set environment variables:
```bash
# Development (Neon PostgreSQL)
export DATABASE_URL_DEV="postgresql://user:pass@ep-xxx.us-east-2.aws.neon.tech/dbname?sslmode=require"
export NODE_ENV="development"

# Production (Neon PostgreSQL on Replit)
export DATABASE_URL_PROD="postgresql://user:pass@ep-yyy.us-east-2.aws.neon.tech/dbname?sslmode=require"
```

### Database Configuration

**Primary: Neon PostgreSQL** (used for both development and production)
- `DATABASE_URL_DEV` - Development database (local development)
- `DATABASE_URL_PROD` - Production database (Replit deployment)
- `DATABASE_URL` - Fallback if specific env not set

The system automatically uses `sslmode=require` for Neon connections.

### Legacy: Cloud SQL (GCP) Configuration

For connecting to Google Cloud SQL (retained for legacy compatibility):

**Option 1: Using a certificate directory**
```bash
export DATABASE_URL="postgresql://user:password@PUBLIC_IP:5432/dbname"
export DB_SSL_DIR="/path/to/ssl/certificates"
```
The directory should contain:
- `server-ca.pem` (required) - Server CA certificate
- `client-cert.pem` (optional) - Client certificate
- `client-key.pem` (optional) - Client private key

**Option 2: Using individual certificate paths**
```bash
export DB_SSL_ROOT_CERT="/path/to/server-ca.pem"
export DB_SSL_CERT="/path/to/client-cert.pem"
export DB_SSL_KEY="/path/to/client-key.pem"
```

**Note:** Cloud SQL is no longer used for development. Neon PostgreSQL is the primary database for both environments.

3. Run the application:
```bash
python main.py
```

The API will be available at `http://localhost:8000` with documentation at `http://localhost:8000/docs`.

## Configuration

Configuration is managed in `src/core/config.py` using Pydantic settings:

### Database Settings
- `DATABASE_URL_DEV`: Neon PostgreSQL for development (primary)
- `DATABASE_URL_PROD`: Neon PostgreSQL for production/Replit (primary)
- `DATABASE_URL`: Fallback PostgreSQL connection string
- `NODE_ENV`: Environment mode - determines which database URL to use

### Legacy Cloud SQL Settings (optional)
- `DB_SSL_DIR`: Directory containing SSL certificates
- `DB_SSL_ROOT_CERT`: Path to server CA certificate (server-ca.pem)
- `DB_SSL_CERT`: Path to client certificate (client-cert.pem)
- `DB_SSL_KEY`: Path to client private key (client-key.pem)

### Other Settings
- `PORT`: Server port (default: 8000)
- `UPLOAD_DIR`: Directory for file uploads (default: uploads)

### Database Connection

The backend automatically detects database type and configures SSL appropriately:
- **Neon databases**: Uses `sslmode=require` (automatic for neon.tech URLs)
- **Cloud SQL**: Uses certificate-based SSL if certs provided (legacy)
- **Local PostgreSQL**: No SSL required

## Development

### Adding New Endpoints

1. Create model in `src/models/`
2. Add repository methods in `src/database/repositories.py`
3. Create API router in `src/api/`
4. Register router in `src/api/__init__.py`

### Data Conversion

The system automatically converts between camelCase (frontend) and snake_case (database) using utilities in `src/utils/data_conversion.py`.

### Testing

Test files should be placed in the `tests/` directory following the same structure as the source code.

## Deployment

For production deployment:

1. Set `NODE_ENV=production`
2. Configure proper database connection
3. Use a production WSGI server like Gunicorn
4. Set up proper logging and monitoring

## API Documentation

FastAPI automatically generates interactive API documentation available at `/docs` when running the server.