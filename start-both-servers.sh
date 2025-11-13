#!/bin/bash

# Start both Python backend and Node.js frontend
echo "🚀 Starting Proesphere with Python FastAPI backend..."

# Get the directory where this script is located
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd "$SCRIPT_DIR"

# Check if virtual environment exists and activate it
# if [ -d "python_backend/venv" ]; then
#     echo "🐍 Activating Python virtual environment..."
#     source python_backend/venv/bin/activate
# ficd

# Start Python backend in background
echo "🐍 Starting Python FastAPI backend on port 8000..."
cd python_backend
python main.py &
PYTHON_PID=$!
cd ..

# Wait a moment for Python backend to start
echo "⏳ Waiting for Python backend to initialize..."
sleep 3

# Start Node.js frontend
echo "🌐 Starting Node.js frontend on port 5000..."
NODE_ENV=development npx tsx server/index.ts &
NODE_PID=$!

# Keep track of both processes
echo ""
echo "✅ Python backend PID: $PYTHON_PID"
echo "✅ Node.js frontend PID: $NODE_PID"
echo ""
echo "📝 To stop both servers, press Ctrl+C or run:"
echo "   kill $PYTHON_PID $NODE_PID"
echo ""
echo "🌐 Frontend: http://localhost:5000"
echo "📚 API Docs: http://localhost:8000/docs"
echo ""

# Function to cleanup on exit
cleanup() {
    echo ""
    echo "🛑 Shutting down servers..."
    kill $PYTHON_PID $NODE_PID 2>/dev/null
    wait $PYTHON_PID $NODE_PID 2>/dev/null
    echo "✅ Servers stopped"
    
}

# Trap Ctrl+C and call cleanup
trap cleanup SIGINT SIGTERM

# Wait for any process to exit
wait