#!/bin/bash
# Start the backend using the keep_alive supervisor so the process restarts
# automatically and sends periodic heartbeats.
cd python_backend
echo "🚀 Starting Python FastAPI backend with keep-alive..."
exec python keep_alive.py

