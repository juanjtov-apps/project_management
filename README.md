# Proesphere - Construction Project Management System

A comprehensive construction project management application designed to streamline workflows, enhance collaboration, and improve oversight for construction projects. Proesphere provides tools for managing projects, tasks, crew members, photo documentation, project logs, and scheduling, enabling users to build smarter, deliver on time, on budget, and with high quality.

## 🎯 MVP Success Criteria

**A foreman can:**
1. Log in
2. View all projects
3. Inline-edit a task and see it persist after refresh
4. Add and remove projects
5. Use dropdowns and change the tasks' status

### MVP User Journeys
- Open `/projects` → list or cards view
- Click a project → edit task fields inline
- Auto-save with toast → refresh to confirm persistence

## 🏗️ Architecture

The application uses a **fully independent server architecture** with clear separation between frontend and backend. 

> **✅ Recent Update**: All RBAC operations (users, roles, permissions, companies) have been migrated from Node.js to FastAPI. The Node.js server now acts as a pure proxy for all API requests. See [RBAC_MIGRATION_TO_FASTAPI.md](./RBAC_MIGRATION_TO_FASTAPI.md) for details.

All backend logic, including RBAC, is now handled exclusively by FastAPI:

```
┌─────────────────┐         HTTP         ┌─────────────────┐
│  Node.js Server │  ──────────────────> │  Python Backend │
│  (Port 5000)    │  <────────────────── │  (Port 8000)    │
│  Frontend Only  │      Proxy/Forward   │  FastAPI        │
│  + Auth Proxy   │      ALL API Calls    │  ALL Backend    │
└─────────────────┘                      └─────────────────┘
                                              │
                                              ▼
                                        ┌─────────────┐
                                        │ PostgreSQL  │
                                        │  Database   │
                                        └─────────────┘
```

### Architecture Principles

- **Frontend (Node.js)**: Serves React app, handles session management, proxies ALL API requests
- **Backend (FastAPI)**: Handles ALL business logic, database operations, and API endpoints
- **No Database Operations in Node.js**: All data operations are handled by FastAPI
- **RBAC Migration Complete**: All RBAC operations (users, roles, permissions, companies) migrated to FastAPI

### Frontend (Node.js/React)
- **Port**: 5000
- **Framework**: React 18 with TypeScript
- **State Management**: TanStack Query for server state
- **UI Components**: Radix UI components with shadcn/ui design system
- **Styling**: Tailwind CSS with custom construction-themed palette
- **Purpose**: Serves React frontend, handles session-based authentication, proxies ALL API requests to FastAPI
- **Note**: No database operations - all backend logic is handled by FastAPI

### Backend (Python FastAPI)
- **Port**: 8000
- **Framework**: FastAPI with async/await
- **Database**: PostgreSQL with asyncpg
- **Purpose**: Handles ALL API logic, database operations, and business logic
- **Features**: 
  - Auto-reload enabled for development
  - RESTful API with OpenAPI docs
  - Complete RBAC system (users, roles, permissions, companies)
  - Multi-tenant architecture with row-level security
- **Migration Status**: ✅ All RBAC operations migrated from Node.js to FastAPI

### Database
- **Type**: PostgreSQL (Neon serverless for both development and production)
- **ORM**: Drizzle ORM for type-safe operations
- **Connection**: Automatic SSL detection and configuration
- **Schemas**: `public` (core business logic) and `client_portal` (client-facing features)

## ✨ Key Features

### Core Modules

- **📊 Dashboard**: Multi-tab interface with overview, tasks, communications, and financial health
- **🔨 Unified Work Module**: Combined Projects and Tasks interface with segmented navigation
- **📝 Project Logs**: Documentation with enhanced tag management and photo attachments
- **📸 Photos**: Image documentation with unified gallery, filtering, and search
- **📅 Schedule Changes**: Timeline and Calendar views for modifications
- **🔔 PM Notifications**: Real-time notifications with deep linking
- **👥 User Management**: Role-based access control (RBAC) with multi-tenant architecture
- **🏢 Company Management**: Multi-company support with company-level isolation
- **📊 Project Health**: Visual health scores, risk matrices, and dashboards

### Client Portal Module

- **Issues Reporting**: Tracking with photo uploads, priority, status, and comments
- **Forum Messaging**: Project-level communication
- **Material Lists**: Area-based material organization with cost calculations
- **Payment System**: Payment schedules, installments, document uploads, and invoice generation

### RBAC System

Comprehensive three-tier role-based access control **fully implemented in FastAPI**:
- **Root Admin**: System-wide access across all companies
- **Company Admin**: Company-level administration with data isolation
- **Regular Users**: 6 role templates (admin, project_manager, office_manager, subcontractor, client, crew)
- **26 Permissions**: Granular permission system with integer-based IDs
- **Row-Level Security**: Multi-tenant data isolation at database level
- **API Endpoints**: All RBAC operations available at `/api/v1/rbac/*`
- **Migration Status**: ✅ All RBAC operations migrated from Node.js to FastAPI (see [RBAC_MIGRATION_TO_FASTAPI.md](./RBAC_MIGRATION_TO_FASTAPI.md))

## 🛠️ Tech Stack

### Frontend
- **React 18** with TypeScript
- **TanStack Query** for server state management
- **Radix UI** + **shadcn/ui** for components
- **Tailwind CSS** for styling
- **Vite** for build tooling
- **Wouter** for routing

### Backend
- **FastAPI** (Python 3.10+) - All API logic and business operations
- **Uvicorn** ASGI server
- **asyncpg** for PostgreSQL async operations
- **Pydantic** for data validation and request/response models
- **bcrypt** for password hashing
- **Repository Pattern** for database operations
- **RBAC System** - Complete role-based access control implementation

### Database
- **PostgreSQL** (Neon or Cloud SQL)
- **Drizzle ORM** for schema management

### Infrastructure
- **Google Cloud Storage** for photo storage
- **Express.js** for frontend server (proxy only, no database operations)
- **Express Sessions** for session-based authentication
- **PostgreSQL** with automatic SSL detection (Neon/Cloud SQL)

## 📋 Prerequisites

- **Node.js** (v18 or higher)
- **Python** (3.10 or higher)
- **PostgreSQL** database access (Neon or Cloud SQL)
- **npm** or **yarn**
- **pip** (Python package manager)

## 🚀 Quick Start

### 1. Clone the Repository

```bash
git clone <repository-url>
cd project_management
```

### 2. Install Dependencies

**Frontend (Node.js):**
```bash
npm install
```

**Backend (Python):**
```bash
cd python_backend
pip install -r requirements.txt
# Or with virtual environment:
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
```

### 3. Configure Environment Variables

Create a `.env` file in the project root:

```bash
# Database Configuration (Neon PostgreSQL)
DATABASE_URL_DEV="postgresql://user:password@ep-xxx.neon.tech/dbname?sslmode=require"
DATABASE_URL_PROD="postgresql://user:password@ep-yyy.neon.tech/dbname?sslmode=require"
DATABASE_URL="postgresql://user:password@ep-xxx.neon.tech/dbname?sslmode=require"  # Fallback

# Node.js Server Configuration
PORT=5000
NODE_ENV=development  # Use 'production' for prod database
SESSION_SECRET="your-secret-key-here"  # Generate with: openssl rand -hex 32

# Optional: Replit Auth (if using)
# REPLIT_DOMAINS="your-domain.replit.app"
# REPL_ID="your-repl-id"

# Legacy: Cloud SQL SSL certificates (not needed for Neon)
# DB_SSL_DIR="/path/to/ssl/certificates"
```

**Generate SESSION_SECRET:**
```bash
# Using Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Or using Python
python -c "import secrets; print(secrets.token_hex(32))"

# Or using openssl
openssl rand -hex 32
```

### 4. Start the Application

**Option A: Start Both Servers Together (Recommended)**

```bash
./start-servers.sh
```

This script:
- Starts Python backend on port 8000
- Starts Node.js frontend on port 5000
- Monitors both servers
- Handles cleanup on exit

**Option B: Start Servers Independently**

**Terminal 1 - Python Backend:**
```bash
cd python_backend
python3 main.py
```

**Terminal 2 - Node.js Frontend:**
```bash
npm run dev
```

### 5. Access the Application

- **Frontend**: http://localhost:5000
- **Python API Docs**: http://localhost:8000/docs
- **Python API Health**: http://localhost:8000/health
- **Node.js Backend Status**: http://localhost:5000/api/backend-status

## 🔧 Development Workflow

### Auto-Reload

Both servers support auto-reload during development:

- **Python Backend**: Automatically restarts when Python files change (enabled by default)
- **Node.js Frontend**: Hot-reloads via Vite in development mode
- **React Components**: Hot module replacement for instant updates

### Making Changes

1. **Backend Changes**: Edit Python files in `python_backend/src/` - server auto-reloads
2. **Frontend Changes**: Edit React components in `client/src/` - hot-reloads automatically
3. **API Changes**: Update FastAPI routes in `python_backend/src/api/` - auto-reloads

### Restarting Servers

- **Node.js**: Usually auto-reloads, but restart with `Ctrl+C` and `npm run dev`
- **Python**: Auto-reloads on file changes, or manually restart with `Ctrl+C` and `python3 main.py`

## 📁 Project Structure

```
project_management/
├── client/                    # React frontend application
│   ├── src/
│   │   ├── pages/            # Page components
│   │   ├── components/       # Reusable components
│   │   ├── hooks/            # Custom React hooks
│   │   └── lib/              # Utilities and helpers
│   └── public/               # Static assets
│
├── python_backend/           # Python FastAPI backend
│   ├── src/
│   │   ├── api/             # API route handlers
│   │   │   ├── v1/         # Versioned API endpoints
│   │   │   ├── auth.py     # Authentication
│   │   │   ├── projects.py # Project endpoints
│   │   │   ├── tasks.py    # Task endpoints
│   │   │   └── ...
│   │   ├── models/         # Pydantic models
│   │   ├── database/       # Database layer
│   │   │   ├── connection.py
│   │   │   ├── repositories.py
│   │   │   └── migrations/
│   │   ├── core/           # Core configuration
│   │   ├── middleware/     # Middleware
│   │   ├── services/       # Business logic services
│   │   └── utils/          # Utilities
│   ├── main.py             # Application entry point
│   └── requirements.txt    # Python dependencies
│
├── server/                  # Node.js Express server
│   ├── index.ts            # Frontend server and API proxy
│   ├── routes.ts           # Legacy routes (most migrated to FastAPI)
│   └── storage.ts          # Legacy storage (RBAC operations removed)
│
├── shared/                  # Shared TypeScript types
│   └── schema.ts           # Database schema types
│
├── start-servers.sh        # Script to start both servers
├── start_python_backend.sh # Python backend starter
├── package.json            # Node.js dependencies
└── README.md              # This file
```

## 📡 API Documentation

### Base URLs

- **Development**: `http://localhost:8000`
- **API Version**: `/api/v1`

### Interactive API Docs

FastAPI provides automatic OpenAPI documentation:
- **Swagger UI**: http://localhost:8000/docs
- **ReDoc**: http://localhost:8000/redoc

### Main API Endpoints

#### Authentication
- `POST /api/v1/auth/login` - User login
- `POST /api/v1/auth/logout` - User logout
- `GET /api/v1/auth/me` - Get current user

#### Projects
- `GET /api/v1/projects` - List projects
- `POST /api/v1/projects` - Create project
- `GET /api/v1/projects/{id}` - Get project
- `PUT /api/v1/projects/{id}` - Update project
- `DELETE /api/v1/projects/{id}` - Delete project

#### Tasks
- `GET /api/v1/tasks` - List tasks
- `POST /api/v1/tasks` - Create task
- `GET /api/v1/tasks/{id}` - Get task
- `PUT /api/v1/tasks/{id}` - Update task
- `PATCH /api/v1/tasks/{id}/assign` - Assign task to user
- `DELETE /api/v1/tasks/{id}` - Delete task

#### Users & RBAC
- `GET /api/v1/users` - List users (admin only)
- `GET /api/v1/users/managers` - Get managers for task assignment
- `GET /api/v1/rbac/users` - List users with RBAC filtering
- `POST /api/v1/rbac/users` - Create user (admin only)
- `PATCH /api/v1/rbac/users/{id}` - Update user (admin only)
- `DELETE /api/v1/rbac/users/{id}` - Delete user (admin only)
- `GET /api/v1/rbac/roles` - List roles
- `POST /api/v1/rbac/roles` - Create role (admin only)
- `PATCH /api/v1/rbac/roles/{id}` - Update role (admin only)
- `DELETE /api/v1/rbac/roles/{id}` - Delete role (admin only)
- `GET /api/v1/rbac/permissions` - List all available permissions
- `GET /api/v1/rbac/companies` - List companies (admin only)
- `POST /api/v1/rbac/companies` - Create company (admin only)
- `PATCH /api/v1/rbac/companies/{id}` - Update company (admin only)
- `DELETE /api/v1/rbac/companies/{id}` - Delete company (root admin only)
- `GET /api/v1/rbac/companies/{id}/users` - Get users for a company
- `GET /api/v1/companies` - List companies (legacy endpoint)
- `POST /api/v1/companies` - Create company (legacy endpoint)
- `PATCH /api/v1/companies/{id}` - Update company (legacy endpoint)
- `DELETE /api/v1/companies/{id}` - Delete company (legacy endpoint)

#### Dashboard
- `GET /api/v1/dashboard` - Dashboard overview
- `GET /api/v1/dashboard/stats` - Dashboard statistics

#### Photos
- `GET /api/v1/photos` - List photos
- `POST /api/v1/photos` - Upload photo
- `DELETE /api/v1/photos/{id}` - Delete photo

#### Project Logs
- `GET /api/v1/logs` - List project logs
- `POST /api/v1/logs` - Create log entry
- `PATCH /api/v1/logs/{id}` - Update log entry
- `DELETE /api/v1/logs/{id}` - Delete log entry

## 🗄️ Database Configuration

The system uses **Neon PostgreSQL** for both development and production:

### Neon (Primary - Both Environments)
```bash
# Development
export DATABASE_URL_DEV="postgresql://user:password@ep-xxx.neon.tech/dbname?sslmode=require"

# Production (Replit)
export DATABASE_URL_PROD="postgresql://user:password@ep-yyy.neon.tech/dbname?sslmode=require"

# Fallback
export DATABASE_URL="postgresql://user:password@xxx.neon.tech/dbname?sslmode=require"
```
- Simple SSL connection (`sslmode=require`)
- No certificate files needed
- Automatically detected from `neon.tech` in URL

### Database Schemas

| Schema | Purpose |
|--------|---------|
| `public` | Core business logic (users, projects, tasks, RBAC) |
| `client_portal` | Client-facing features (issues, forum, materials, payments, stages) |

### Legacy: Cloud SQL (Optional)
```bash
export DATABASE_URL="postgresql://user:password@PUBLIC_IP:5432/dbname"
export DB_SSL_DIR="/path/to/ssl/certificates"
```
- Full SSL certificate authentication (legacy, not actively used)

See [DATABASE_CONFIGURATION.md](./DATABASE_CONFIGURATION.md) for detailed configuration.

## 🧪 Testing

### Test Database Connection

**Python Backend:**
```bash
cd python_backend
python test_db_connection.py
```

**Node.js Server:**
```bash
npm run test:db
```

### Run API Tests

```bash
# Comprehensive Python test suite
python test_api_endpoints.py

# RBAC Migration Test (verifies all RBAC endpoints in FastAPI)
python test_rbac_fastapi_migration.py

# Simple bash test (requires browser login first)
chmod +x simple_test_endpoints.sh
./simple_test_endpoints.sh
```

### Test Endpoints

1. **Health Check**: `curl http://localhost:8000/health`
2. **Backend Status**: `curl http://localhost:5000/api/backend-status`
3. **RBAC Roles**: `curl http://localhost:8000/api/v1/rbac/roles` (requires auth)
4. **RBAC Permissions**: `curl http://localhost:8000/api/v1/rbac/permissions` (requires auth)

## 🚢 Deployment

### Production Considerations

1. **Disable Auto-Reload**: Set `reload=False` in production
2. **Environment Variables**: Use secure secret management
3. **Database**: Use Neon or managed PostgreSQL
4. **SSL**: Configure proper SSL certificates
5. **Process Management**: Use PM2, systemd, or Docker

### Using PM2

**Backend:**
```bash
pm2 start python_backend/main.py --name backend --interpreter python3
```

**Frontend:**
```bash
pm2 start npm --name frontend -- run start
```

### Using Docker

See deployment documentation for Docker setup.

## 🐛 Troubleshooting

### Port Already in Use

```bash
# Check what's using the port
lsof -i :5000
lsof -i :8000

# Kill process on port
lsof -ti:5000 | xargs kill
lsof -ti:8000 | xargs kill
```

### Database Connection Fails

1. Verify `DATABASE_URL` is correct
2. Check SSL certificates exist (for Cloud SQL)
3. Ensure database allows connections from your IP
4. Test connections separately:
   ```bash
   npm run test:db
   cd python_backend && python test_db_connection.py
   ```

### Python Backend Not Starting

1. Check Python version: `python3 --version` (should be 3.10+)
2. Verify dependencies: `pip list`
3. Check for import errors in logs
4. Ensure you're in the `python_backend` directory

### Node.js Server Not Starting

1. Check Node version: `node --version` (should be 18+)
2. Verify dependencies: `npm list`
3. Check TypeScript errors: `npm run check`
4. Ensure `SESSION_SECRET` is set

### Frontend Not Loading

1. Check browser console for errors
2. Verify both servers are running
3. Check CORS settings
4. Clear browser cache

## 📚 Additional Documentation

- [Local Setup Guide](./LOCAL_SETUP.md) - Detailed local development setup
- [Database Configuration](./DATABASE_CONFIGURATION.md) - Database setup details
- [Independent Servers](./INDEPENDENT_SERVERS.md) - Architecture details
- [Testing Guide](./TESTING_GUIDE.md) - Testing procedures
- [Setup Checklist](./SETUP_CHECKLIST.md) - Pre-deployment checklist
- [RBAC Migration to FastAPI](./RBAC_MIGRATION_TO_FASTAPI.md) - Complete RBAC migration documentation

## 🔐 Security

- **Authentication**: Session-based with bcrypt password hashing
- **RBAC**: Role-based access control with row-level security (fully implemented in FastAPI)
- **Multi-Tenant**: Company-level data isolation enforced at API and database levels
- **CORS**: Configured for development and production
- **SSL**: Required for database connections (automatic detection for Neon/Cloud SQL)
- **Secrets**: Environment variables for sensitive data
- **Authorization**: All RBAC operations require admin privileges with company scoping

## 📝 Environment Variables Reference

| Variable | Required | Description | Default |
|----------|----------|-------------|---------|
| `DATABASE_URL_DEV` | ✅ Dev | Neon PostgreSQL for development | - |
| `DATABASE_URL_PROD` | ✅ Prod | Neon PostgreSQL for production (Replit) | - |
| `DATABASE_URL` | Fallback | PostgreSQL connection string (fallback) | - |
| `DB_SSL_DIR` | Legacy | Directory with SSL certificates (Cloud SQL) | - |
| `DB_SSL_ROOT_CERT` | Legacy | Path to server-ca.pem (Cloud SQL) | - |
| `DB_SSL_CERT` | Legacy | Path to client-cert.pem (Cloud SQL) | - |
| `DB_SSL_KEY` | Legacy | Path to client-key.pem (Cloud SQL) | - |
| `PORT` | No | Node.js server port | 5000 |
| `NODE_ENV` | No | Environment mode (selects DEV/PROD URL) | development |
| `SESSION_SECRET` | ✅ Yes | Secret for session encryption | - |
| `REPLIT_DOMAINS` | Optional | Comma-separated domains for Replit auth | - |
| `REPL_ID` | Optional | Replit ID for OIDC | - |

## 🎯 Post-Launch Backlog

- Calendar / Gantt view
- File uploads (enhanced)
- Summary of the day
- Email with daily tasks
- Mobile app
- Advanced reporting
- Integration with external tools

## 📄 License

See [LICENSE](./LICENSE) file for details.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 📞 Support

For issues and questions:
1. Check the troubleshooting section
2. Review server logs
3. Check documentation files
4. Open an issue on the repository

---

**Built with ❤️ for the construction industry**
