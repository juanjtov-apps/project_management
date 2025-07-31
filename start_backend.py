#!/usr/bin/env python3
"""
Direct backend starter that keeps running
"""
import os
import sys
import signal
import threading
import time
from contextlib import asynccontextmanager

# Set up environment
os.chdir('/home/runner/workspace')
sys.path.insert(0, '/home/runner/workspace')

# Import FastAPI and create the app
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import uvicorn
import asyncio

# Import the main app
from main import app

# Global flag for shutdown
shutdown_event = threading.Event()

def signal_handler(signum, frame):
    print(f"Received signal {signum}, shutting down...")
    shutdown_event.set()

def run_server():
    """Run the uvicorn server"""
    try:
        print("🚀 Starting Tower Flow Backend...")
        print("📍 Working directory:", os.getcwd())
        print("🔗 Server will be available at: http://0.0.0.0:8000")
        print("🏥 Health check: http://0.0.0.0:8000/health")
        
        # Configure uvicorn
        config = uvicorn.Config(
            app=app,
            host="0.0.0.0",
            port=8000,
            log_level="info",
            access_log=True,
            reload=False  # Disable reload to prevent issues
        )
        
        server = uvicorn.Server(config)
        
        # Run the server
        asyncio.run(server.serve())
        
    except Exception as e:
        print(f"❌ Server error: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    # Set up signal handlers
    signal.signal(signal.SIGINT, signal_handler)
    signal.signal(signal.SIGTERM, signal_handler)
    
    # Start the server in the main thread
    try:
        run_server()
    except KeyboardInterrupt:
        print("Server stopped by user")
    except Exception as e:
        print(f"Server failed: {e}")
        sys.exit(1)