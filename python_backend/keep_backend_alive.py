#!/usr/bin/env python3
"""
Backend keeper script - ensures Python backend stays running for testing
"""
import subprocess
import time
import signal
import sys
import os
import requests
from pathlib import Path

class BackendKeeper:
    def __init__(self):
        self.process = None
        self.should_exit = False
        self.restart_count = 0
        self.max_restarts = 10
        
    def signal_handler(self, signum, frame):
        print(f"🛑 Received signal {signum}, shutting down...")
        self.should_exit = True
        if self.process:
            self.process.terminate()
        sys.exit(0)
    
    def is_backend_healthy(self):
        """Check if backend is responding to requests"""
        try:
            response = requests.get("http://localhost:8000/api/dashboard", timeout=5)
            return response.status_code == 200
        except:
            return False
    
    def start_backend(self):
        """Start the backend process"""
        try:
            print(f"🚀 Starting Python backend (attempt {self.restart_count + 1})")
            self.process = subprocess.Popen(
                [sys.executable, "main.py"],
                cwd=Path(__file__).parent,
                stdout=subprocess.PIPE,
                stderr=subprocess.STDOUT,
                text=True,
                bufsize=1,
                universal_newlines=True
            )
            return True
        except Exception as e:
            print(f"❌ Failed to start backend: {e}")
            return False
    
    def monitor_backend(self):
        """Monitor backend process and restart if needed"""
        while not self.should_exit and self.restart_count < self.max_restarts:
            if not self.process or self.process.poll() is not None:
                print("⚠️ Backend process died, restarting...")
                if self.start_backend():
                    self.restart_count += 1
                    print(f"⏱️ Waiting for backend to start...")
                    time.sleep(10)  # Give backend time to start
                else:
                    print("❌ Failed to restart backend")
                    break
            
            # Check if backend is healthy
            if self.is_backend_healthy():
                print("✅ Backend is healthy and responding")
                time.sleep(30)  # Check every 30 seconds
            else:
                print("⚠️ Backend not responding, will restart...")
                if self.process:
                    self.process.terminate()
                time.sleep(5)
        
        print(f"🛑 Backend keeper stopping (restarts: {self.restart_count})")
    
    def run(self):
        """Main run loop"""
        # Set up signal handlers
        signal.signal(signal.SIGINT, self.signal_handler)
        signal.signal(signal.SIGTERM, self.signal_handler)
        
        print("🔧 Backend Keeper starting...")
        print("📋 Will monitor and restart Python backend as needed")
        
        # Start initial backend
        if self.start_backend():
            self.restart_count = 1
            self.monitor_backend()
        else:
            print("❌ Failed to start initial backend")

if __name__ == "__main__":
    keeper = BackendKeeper()
    keeper.run()