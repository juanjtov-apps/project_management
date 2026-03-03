#!/bin/bash

# Proesphere Production Deployment Script
echo "🚀 Deploying Proesphere..."

# Set production environment
export NODE_ENV=production

# Install dependencies if needed
echo "📦 Installing dependencies..."
npm ci --omit=dev

# Build the application
echo "🔨 Building application..."
npm run build

if [ $? -ne 0 ]; then
    echo "❌ Build failed!"
    exit 1
fi

echo "✅ Build completed successfully!"

# Start services
echo "🌐 Starting production services..."

# Start Python backend in background
echo "🐍 Starting Python FastAPI backend..."
export PYTHON_PORT=8000
python main.py &
PYTHON_PID=$!

# Wait for Python backend to start
echo "⏳ Waiting for Python backend to start..."
sleep 5

# Start Express server
echo "🌐 Starting Express server..."
export PORT=5000
node dist/index.js &
EXPRESS_PID=$!

# Function to handle shutdown
cleanup() {
    echo "🛑 Shutting down services..."
    kill $PYTHON_PID 2>/dev/null
    kill $EXPRESS_PID 2>/dev/null
    wait
    echo "✅ Shutdown complete"
}

# Set up signal handlers
trap cleanup SIGINT SIGTERM

# Wait for both processes
wait $EXPRESS_PID $PYTHON_PID