# Local Development Setup Guide

This guide will help you set up and run the application locally for development.

## Prerequisites

- Node.js (v18 or higher)
- Python 3.8+ 
- PostgreSQL database (Cloud SQL or Neon)
- npm or yarn

## Step 1: Install Dependencies

### Node.js Dependencies
```bash
npm install
```

### Python Dependencies
```bash
cd python_backend
pip install -r requirements.txt
# Or if using a virtual environment:
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
```

## Step 2: Set Up Environment Variables

Create a `.env` file in the project root (or export them in your shell):

```bash
# Database Configuration (Cloud SQL for development)
DATABASE_URL="postgresql://user:password@PUBLIC_IP:5432/dbname"
DB_SSL_DIR="/path/to/ssl/certificates"

# OR for Neon (production):
# DATABASE_URL="postgresql://user:password@xxx.neon.tech/dbname?sslmode=require"

# Node.js Server Configuration
PORT=5000
NODE_ENV=development
SESSION_SECRET="your-secret-key-here-change-in-production"

# Optional: For Replit Auth (if using)
# REPLIT_DOMAINS="your-domain.replit.app"
# REPL_ID="your-repl-id"
```

### Generate SESSION_SECRET

You can generate a secure session secret:

```bash
# Using Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Or using Python
python -c "import secrets; print(secrets.token_hex(32))"

# Or using openssl
openssl rand -hex 32
```

## Step 3: Verify Database Connection

### Test Python Backend Connection
```bash
cd python_backend
python test_db_connection.py
```

### Test Node.js Connection
```bash
npm run test:db
```

Both should show successful connections. If not, check your `DATABASE_URL` and SSL certificates.

## Step 4: Start the Application

You have two options:

### Option A: Start Both Servers Together (Recommended)

```bash
./start-both-servers.sh
```

This will:
- Start Python backend on port 8000
- Start Node.js server on port 5000
- Serve the frontend and proxy API requests

### Option B: Start Servers Separately

**Terminal 1 - Python Backend:**
```bash
cd python_backend
python main.py
```

**Terminal 2 - Node.js Server:**
```bash
npm run dev
```

## Step 5: Access the Application

- **Frontend**: http://localhost:5000
- **Python API Docs**: http://localhost:8000/docs
- **Python API Health**: http://localhost:8000/health
- **Node.js Backend Status**: http://localhost:5000/api/backend-status

## Step 6: Verify Everything Works

1. **Check Python Backend:**
   ```bash
   curl http://localhost:8000/health
   ```
   Should return: `{"status": "healthy", "service": "proesphere-api"}`

2. **Check Node.js Server:**
   ```bash
   curl http://localhost:5000/api/backend-status
   ```
   Should return: `{"ready": true, "message": "Backend ready"}`

3. **Check Frontend:**
   Open http://localhost:5000 in your browser. You should see the application.

## Architecture Overview

```
┌─────────────────┐
│   Browser       │
│  localhost:5000 │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Node.js Server │
│  (Express)      │
│  Port 5000      │
│                 │
│  - Serves       │
│    Frontend     │
│  - Handles Auth │
│  - Proxies API  │
│    to Python    │
└────────┬────────┘
         │
         ├─────────────────┐
         │                 │
         ▼                 ▼
┌─────────────────┐  ┌─────────────────┐
│  Python Backend │  │   PostgreSQL   │
│  (FastAPI)      │  │   (Cloud SQL)   │
│  Port 8000      │  │                 │
│                 │  │                 │
│  - API Routes   │  │  - Database     │
│  - Business     │  │  - Sessions     │
│    Logic        │  │  - Data         │
└─────────────────┘  └─────────────────┘
```

## Common Issues & Solutions

### Port Already in Use

If port 5000 or 8000 is already in use:

```bash
# Find what's using the port
lsof -i :5000
lsof -i :8000

# Kill the process or change PORT in .env
export PORT=5001  # For Node.js
export PORT=8001  # For Python (update in python_backend/src/core/config.py)
```

### Database Connection Fails

1. Verify `DATABASE_URL` is correct
2. Check SSL certificates exist and paths are correct
3. Ensure Cloud SQL allows connections from your IP
4. Test connections separately:
   ```bash
   npm run test:db
   cd python_backend && python test_db_connection.py
   ```

### Python Backend Not Starting

1. Check Python version: `python --version` (should be 3.8+)
2. Verify dependencies: `pip list`
3. Check for import errors in the logs
4. Ensure you're in the `python_backend` directory when running

### Node.js Server Not Starting

1. Check Node version: `node --version` (should be 18+)
2. Verify dependencies: `npm list`
3. Check for TypeScript errors: `npm run check`
4. Ensure `SESSION_SECRET` is set

### Frontend Not Loading

1. Check browser console for errors
2. Verify both servers are running
3. Check CORS settings if making direct API calls
4. Clear browser cache

## Development Workflow

1. **Make code changes** in your editor
2. **Node.js server** auto-reloads with `tsx` (in dev mode)
3. **Python backend** needs manual restart (or use a file watcher)
4. **Frontend** hot-reloads via Vite (in dev mode)

### Restarting Servers

- **Node.js**: Usually auto-reloads, but you can restart with `Ctrl+C` and `npm run dev`
- **Python**: Stop with `Ctrl+C` and restart with `python main.py`

## Environment Variables Reference

| Variable | Required | Description | Default |
|----------|----------|-------------|---------|
| `DATABASE_URL` | ✅ Yes | PostgreSQL connection string | - |
| `DB_SSL_DIR` | Cloud SQL | Directory with SSL certificates | - |
| `DB_SSL_ROOT_CERT` | Cloud SQL | Path to server-ca.pem | - |
| `DB_SSL_CERT` | Cloud SQL | Path to client-cert.pem | - |
| `DB_SSL_KEY` | Cloud SQL | Path to client-key.pem | - |
| `PORT` | No | Node.js server port | 5000 |
| `NODE_ENV` | No | Environment mode | development |
| `SESSION_SECRET` | ✅ Yes | Secret for session encryption | - |
| `REPLIT_DOMAINS` | Optional | Comma-separated domains for Replit auth | - |
| `REPL_ID` | Optional | Replit ID for OIDC | - |

## Next Steps

Once everything is running:

1. ✅ Test database connections
2. ✅ Access the frontend
3. ✅ Try logging in (if auth is set up)
4. ✅ Test API endpoints via `/docs` (Python FastAPI)
5. ✅ Check browser console for any errors
6. ✅ Review server logs for warnings

## Useful Commands

```bash
# Test database connections
npm run test:db
cd python_backend && python test_db_connection.py

# Check TypeScript types
npm run check

# Build for production
npm run build

# Run production build
npm start

# Database migrations (if using Drizzle)
npm run db:push
```

## Getting Help

If you encounter issues:

1. Check server logs for error messages
2. Verify all environment variables are set
3. Test database connections separately
4. Check that ports are not in use
5. Review this guide for common issues

Happy coding! 🚀

