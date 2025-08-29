#!/bin/bash

# Start both Python backend and Node.js frontend
echo "🚀 Starting Proesphere with Python FastAPI backend..."

# Start Python backend in background
echo "🐍 Starting Python FastAPI backend on port 8000..."
cd python_backend && python main.py &
PYTHON_PID=$!

# Wait a moment for Python backend to start
sleep 3

# Start Node.js frontend
echo "🌐 Starting Node.js frontend on port 5000..."
cd ..
NODE_ENV=development tsx server/index.ts &
NODE_PID=$!

# Keep track of both processes
echo "✅ Python backend PID: $PYTHON_PID"
echo "✅ Node.js frontend PID: $NODE_PID"

# Wait for any process to exit
wait