#!/usr/bin/env python3
"""
Persistent backend using the working subprocess approach
"""
import os
import sys
import subprocess
import time
import signal
import threading

class PersistentBackend:
    def __init__(self):
        self.process = None
        self.running = True
        self.restart_count = 0
        
    def start_backend_process(self):
        """Start the backend as a subprocess"""
        backend_script = '''
import os
import sys
os.chdir('/home/runner/workspace')
sys.path.insert(0, '/home/runner/workspace')
from main import app
import uvicorn
print("Backend process starting...")
uvicorn.run(app, host="0.0.0.0", port=8000, log_level="info")
'''
        
        try:
            self.process = subprocess.Popen(
                [sys.executable, '-c', backend_script],
                stdout=subprocess.PIPE,
                stderr=subprocess.STDOUT,
                text=True,
                cwd='/home/runner/workspace'
            )
            return True
        except Exception as e:
            print(f"Failed to start backend process: {e}")
            return False
    
    def monitor_backend(self):
        """Monitor and restart backend if needed"""
        while self.running:
            if self.process is None or self.process.poll() is not None:
                self.restart_count += 1
                print(f"Starting backend (attempt #{self.restart_count})")
                
                if self.start_backend_process():
                    print("Backend process started")
                    # Wait for startup
                    time.sleep(5)
                    
                    # Test connection
                    try:
                        import requests
                        response = requests.get('http://localhost:8000/health', timeout=3)
                        if response.status_code == 200:
                            print(f"✅ Backend running on port 8000 - Health check passed")
                        else:
                            print(f"Backend started but health check failed: {response.status_code}")
                    except Exception as e:
                        print(f"Backend started but connection test failed: {e}")
                        
                else:
                    print("Failed to start backend, retrying in 5 seconds...")
                    time.sleep(5)
            else:
                # Backend running, check every 30 seconds
                time.sleep(30)
                
    def shutdown(self):
        """Graceful shutdown"""
        self.running = False
        if self.process:
            self.process.terminate()
            self.process.wait()
            
    def signal_handler(self, signum, frame):
        print(f"Received signal {signum}, shutting down...")
        self.shutdown()
        sys.exit(0)

if __name__ == "__main__":
    backend = PersistentBackend()
    
    # Set up signal handlers
    signal.signal(signal.SIGINT, backend.signal_handler)
    signal.signal(signal.SIGTERM, backend.signal_handler)
    
    print("🚀 Starting Tower Flow Persistent Backend Monitor")
    print("📍 Working directory:", os.getcwd())
    print("🔗 Backend will be available at: http://localhost:8000")
    print("Press Ctrl+C to stop")
    
    try:
        backend.monitor_backend()
    except KeyboardInterrupt:
        backend.shutdown()
    except Exception as e:
        print(f"Monitor failed: {e}")
        backend.shutdown()
        sys.exit(1)