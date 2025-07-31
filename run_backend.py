#!/usr/bin/env python3
"""
Simple backend runner that stays running
"""
import os
import sys
import signal
import threading
import time

# Set working directory
os.chdir('/home/runner/workspace')

# Import and run the app
from main import app
import uvicorn

def signal_handler(sig, frame):
    print('Backend shutting down...')
    sys.exit(0)

signal.signal(signal.SIGINT, signal_handler)
signal.signal(signal.SIGTERM, signal_handler)

if __name__ == "__main__":
    print("🚀 Starting Tower Flow FastAPI backend on port 8000...")
    print("📍 Working directory:", os.getcwd())
    print("🔗 Health check: http://localhost:8000/health")
    print("📚 API docs: http://localhost:8000/docs")
    
    try:
        uvicorn.run(
            app, 
            host="0.0.0.0", 
            port=8000,
            log_level="info",
            access_log=True
        )
    except Exception as e:
        print(f"❌ Failed to start backend: {e}")
        sys.exit(1)