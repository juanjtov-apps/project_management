#!/bin/bash
echo "🐍 Starting Python FastAPI backend..."

cd python_backend

# Kill any existing Python processes
pkill -f "python main.py" 2>/dev/null || true
sleep 2

# Start Python backend with error handling
exec python main.py 2>&1