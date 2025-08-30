#!/bin/bash
cd python_backend
echo "🚀 Starting Python FastAPI backend..."
exec uvicorn main:app --host 0.0.0.0 --port 8000 --log-level debug --workers 1
