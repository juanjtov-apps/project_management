#!/usr/bin/env python3
import os
import sys
import subprocess
import time

os.chdir('/home/runner/workspace')

print("=== Backend Debug Session ===")
print(f"Working directory: {os.getcwd()}")
print(f"Python executable: {sys.executable}")

# Try to run uvicorn directly with main:app
print("\n1. Testing uvicorn main:app directly...")
try:
    process = subprocess.Popen(
        [sys.executable, "-m", "uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"],
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        text=True
    )
    
    # Wait a bit and check if it's still running
    time.sleep(3)
    
    if process.poll() is None:
        print("✅ Process is running")
        # Try to access it
        try:
            import requests
            response = requests.get("http://localhost:8000/health", timeout=2)
            print(f"✅ Health check: {response.status_code}")
        except Exception as e:
            print(f"❌ Health check failed: {e}")
        
        # Kill the process
        process.terminate()
        process.wait()
    else:
        stdout, stderr = process.communicate()
        print(f"❌ Process died immediately")
        print(f"STDOUT: {stdout}")
        print(f"STDERR: {stderr}")
        
except Exception as e:
    print(f"❌ Failed to start: {e}")

print("\n=== Debug Complete ===")