#!/bin/bash
echo "🐍 Starting Python FastAPI backend..."

cd python_backend

# Kill any existing backend processes
pkill -f "keep_alive.py" 2>/dev/null || true
sleep 2

# Start Python backend via supervisor with auto-restart
exec python keep_alive.py 2>&1

