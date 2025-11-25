# Independent Server Architecture

## Overview

The application now uses **fully independent servers** - the Node.js frontend and Python backend start separately and communicate via HTTP. This provides better separation of concerns, easier debugging, and more flexible deployment options.

## Architecture

```
┌─────────────────┐         HTTP         ┌─────────────────┐
│  Node.js Server │  ──────────────────> │  Python Backend │
│  (Port 5000)    │  <────────────────── │  (Port 8000)    │
│  Frontend Only  │      Proxy/Forward   │  FastAPI        │
└─────────────────┘                      └─────────────────┘
```

### Node.js Server (Frontend)
- **Port**: 5000
- **Purpose**: Serves React frontend, proxies API requests
- **Does NOT**: Start or manage Python backend
- **Start**: `npm run dev` or `npx tsx server/index.ts`

### Python Backend (API)
- **Port**: 8000
- **Purpose**: Handles all API requests
- **Start**: `cd python_backend && python3 main.py`
- **Independent**: Can run without Node.js server

## Starting the Servers

### Option 1: Start Both with Script (Recommended)

```bash
./start-servers.sh
```

This script:
- Starts Python backend independently
- Starts Node.js frontend independently
- Monitors both servers
- Handles cleanup on exit

### Option 2: Start Independently (Development)

**Terminal 1 - Python Backend:**
```bash
cd python_backend
python3 main.py
```

**Terminal 2 - Node.js Frontend:**
```bash
npm run dev
```

### Option 3: Using Package Scripts

You can add npm scripts for convenience:

```json
{
  "scripts": {
    "dev": "NODE_ENV=development tsx server/index.ts",
    "dev:backend": "cd python_backend && python3 main.py",
    "dev:both": "./start-servers.sh"
  }
}
```

## Benefits of Independent Architecture

### 1. **True Independence**
- Backend can run without frontend
- Frontend can run without backend (with graceful degradation)
- Each server can be restarted independently

### 2. **Easier Debugging**
- Separate logs for each server
- Can test backend API directly (e.g., with Postman)
- Can test frontend with mock data

### 3. **Better Development Experience**
- Hot reload works independently
- Can restart one server without affecting the other
- Clearer error messages (know which server has the issue)

### 4. **Production Ready**
- Can deploy servers on different machines
- Can scale backend and frontend independently
- Can use different process managers (PM2, systemd, etc.)

### 5. **Flexibility**
- Can use different Python versions for backend
- Can use different Node.js versions for frontend
- Can run backend in Docker while frontend runs natively

## Health Checks

### Check Backend Status
```bash
curl http://127.0.0.1:8000/health
```

### Check Frontend Status
```bash
curl http://127.0.0.1:5000/api/backend-status
```

This endpoint tells you if the backend is available (but doesn't start it).

## Troubleshooting

### Backend Not Starting
1. Check Python is installed: `python3 --version`
2. Check dependencies: `cd python_backend && pip list`
3. Check database connection: `echo $DATABASE_URL`
4. Check logs: `tail -f /tmp/python-backend.log`

### Frontend Can't Connect to Backend
1. Verify backend is running: `curl http://127.0.0.1:8000/health`
2. Check backend logs for errors
3. Verify port 8000 is not blocked
4. Check Node.js proxy configuration in `server/index.ts`

### Port Conflicts
```bash
# Check what's using port 8000
lsof -i:8000

# Check what's using port 5000
lsof -i:5000

# Kill process on port (replace PORT)
lsof -ti:PORT | xargs kill
```

## Migration Notes

### What Changed
- **Removed**: Python backend spawning from Node.js
- **Removed**: Auto-restart logic in Node.js
- **Removed**: Backend process management in Node.js
- **Added**: Health check endpoint that doesn't start backend
- **Added**: Periodic health monitoring (every 10 seconds)

### Backward Compatibility
- The proxy forwarding still works the same way
- API endpoints are unchanged
- Frontend code is unchanged
- Only the startup process changed

## Production Deployment

### Recommended Setup

**Backend (Python):**
```bash
# Using systemd
sudo systemctl start proesphere-backend

# Using PM2
pm2 start python_backend/main.py --name backend

# Using Docker
docker run -p 8000:8000 proesphere-backend
```

**Frontend (Node.js):**
```bash
# Using systemd
sudo systemctl start proesphere-frontend

# Using PM2
pm2 start npm --name frontend -- run start

# Using Docker
docker run -p 5000:5000 proesphere-frontend
```

## Next Steps

1. **Process Managers**: Consider using PM2 or systemd for production
2. **Docker**: Create Dockerfiles for both servers
3. **Kubernetes**: Can deploy as separate pods/services
4. **Load Balancing**: Can add multiple backend instances behind a load balancer
5. **Monitoring**: Set up separate monitoring for each server

