#!/usr/bin/env python3
"""
Robust startup script for Tower Flow backend
"""
import os
import sys
import time
import subprocess
import uvicorn
from pathlib import Path

def start_backend():
    """Start the backend server"""
    try:
        # Change to correct directory
        os.chdir('/home/runner/workspace')
        
        # Import the app
        from main import app
        
        print("Starting Tower Flow FastAPI backend on port 8000...")
        uvicorn.run(
            app, 
            host="0.0.0.0", 
            port=8000,
            log_level="info",
            reload=False
        )
    except Exception as e:
        print(f"Failed to start backend: {e}")
        sys.exit(1)

if __name__ == "__main__":
    start_backend()