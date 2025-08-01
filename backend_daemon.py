#!/usr/bin/env python3
"""
Persistent backend daemon that restarts on failure
"""
import os
import sys
import time
import subprocess
import signal
import threading
from pathlib import Path

# Ensure we're in the right directory
os.chdir('/home/runner/workspace')

class BackendDaemon:
    def __init__(self):
        self.running = True
        self.process = None
        self.restart_count = 0
        
    def signal_handler(self, sig, frame):
        print('\n🛑 Daemon shutting down...')
        self.running = False
        if self.process:
            self.process.terminate()
        sys.exit(0)
        
    def start_backend(self):
        """Start the backend process"""
        cmd = [sys.executable, '-m', 'uvicorn', 'main:app', '--host', '0.0.0.0', '--port', '8000', '--reload']
        
        try:
            self.process = subprocess.Popen(
                cmd,
                stdout=subprocess.PIPE,
                stderr=subprocess.STDOUT,
                text=True,
                cwd='/home/runner/workspace'
            )
            return True
        except Exception as e:
            print(f"❌ Failed to start backend: {e}")
            return False
    
    def monitor_backend(self):
        """Monitor backend and restart if it dies"""
        while self.running:
            if self.process is None or self.process.poll() is not None:
                self.restart_count += 1
                print(f"🔄 Starting backend (attempt #{self.restart_count})")
                
                if self.start_backend():
                    print(f"✅ Backend started on port 8000")
                    # Wait a moment for startup
                    time.sleep(3)
                    
                    # Test if it's actually running
                    try:
                        import requests
                        response = requests.get('http://localhost:8000/health', timeout=5)
                        if response.status_code == 200:
                            print(f"✅ Backend health check passed")
                        else:
                            print(f"⚠️ Backend health check failed: {response.status_code}")
                    except Exception as e:
                        print(f"⚠️ Backend health check error: {e}")
                else:
                    print(f"❌ Failed to start backend, waiting 5 seconds...")
                    time.sleep(5)
            else:
                # Backend is running, check periodically
                time.sleep(10)
    
    def run(self):
        """Main daemon loop"""
        signal.signal(signal.SIGINT, self.signal_handler)
        signal.signal(signal.SIGTERM, self.signal_handler)
        
        print("🚀 Starting Tower Flow Backend Daemon")
        print("📍 Working directory:", os.getcwd())
        print("🔗 Backend will be available at: http://localhost:8000")
        print("🏥 Health check: http://localhost:8000/health")
        print("📚 API docs: http://localhost:8000/docs")
        print("Press Ctrl+C to stop")
        
        self.monitor_backend()

if __name__ == "__main__":
    daemon = BackendDaemon()
    daemon.run()