#!/usr/bin/env python3
"""
Keep the Python FastAPI backend alive with automatic restart.
This ensures the backend stays running for continuous frontend connectivity.
"""

import subprocess
import time
import os
import signal
import sys

BACKEND_SCRIPT = "main.py"
LOG_FILE = "backend.log"
MAX_RESTARTS = 10
RESTART_DELAY = 2

def signal_handler(sig, frame):
    print("🛑 Gracefully shutting down backend...")
    sys.exit(0)

def keep_backend_alive():
    """Keep the FastAPI backend running with automatic restart."""
    restart_count = 0
    
    print("🐍 Starting Python FastAPI backend with auto-restart...")
    
    while restart_count < MAX_RESTARTS:
        try:
            # Start the backend process
            print(f"🚀 Starting backend (attempt {restart_count + 1})...")
            process = subprocess.Popen(
                [sys.executable, BACKEND_SCRIPT],
                stdout=subprocess.PIPE,
                stderr=subprocess.STDOUT,
                universal_newlines=True,
                bufsize=1
            )
            
            # Monitor the process
            while True:
                line = process.stdout.readline()
                if line:
                    print(line.strip())
                    if "Uvicorn running" in line:
                        print("✅ Backend successfully started and running!")
                
                # Check if process is still running
                if process.poll() is not None:
                    print(f"⚠️ Backend process terminated with code {process.returncode}")
                    break
                    
                time.sleep(0.1)
            
        except KeyboardInterrupt:
            print("🛑 Interrupted by user")
            if process and process.poll() is None:
                process.terminate()
            break
        except Exception as e:
            print(f"❌ Error starting backend: {e}")
        
        restart_count += 1
        if restart_count < MAX_RESTARTS:
            print(f"🔄 Restarting in {RESTART_DELAY} seconds...")
            time.sleep(RESTART_DELAY)
    
    print("🚨 Maximum restart attempts reached. Exiting.")

if __name__ == "__main__":
    signal.signal(signal.SIGINT, signal_handler)
    signal.signal(signal.SIGTERM, signal_handler)
    keep_backend_alive()