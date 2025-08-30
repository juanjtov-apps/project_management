#!/usr/bin/env python3
"""Utility to keep the FastAPI backend alive.

The original project relied on the hosting environment to keep the Python
process running.  When the environment became less stable we added this small
supervisor that starts the backend, restarts it on failure and periodically
performs a simple health check.  The health check pings the backend which helps
prevent certain platforms (such as Replit) from suspending the instance due to
inactivity.  The script has no external dependencies and can be executed from
any working directory.
"""

from pathlib import Path
import subprocess
import threading
import time
import os
import signal
import sys

# `requests` is optional; fall back to urllib if it's unavailable.
try:
    import requests  # type: ignore
except Exception:  # pragma: no cover - optional dependency
    requests = None  # type: ignore
import urllib.request

# Resolve the project directory so the script can be launched from anywhere
BASE_DIR = Path(__file__).resolve().parent
os.chdir(BASE_DIR)

BACKEND_SCRIPT = "main.py"
MAX_RESTARTS = 10
RESTART_DELAY = 2
HEARTBEAT_INTERVAL = 25  # seconds


def heartbeat(stop_event: threading.Event) -> None:
    """Continuously ping the backend health endpoint.

    Some development environments pause containers that do not receive traffic.
    By sending a request every few seconds we keep the process marked as active
    and detect when the server stops responding.
    """
    while not stop_event.is_set():
        try:
            if requests:
                requests.get("http://localhost:8000/health", timeout=5)
            else:  # Fallback using urllib
                urllib.request.urlopen("http://localhost:8000/health", timeout=5).read()
        except Exception:
            # Ignore connectivity errors; the monitor loop handles restarts.
            pass
        stop_event.wait(HEARTBEAT_INTERVAL)

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
                bufsize=1,
            )

            # Start heartbeat thread to keep environment active
            stop_event = threading.Event()
            hb_thread = threading.Thread(target=heartbeat, args=(stop_event,), daemon=True)
            hb_thread.start()

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

            # Stop heartbeat when process exits
            stop_event.set()
            hb_thread.join(timeout=1)

        except KeyboardInterrupt:
            print("🛑 Interrupted by user")
            try:
                stop_event.set()
                hb_thread.join(timeout=1)
            except Exception:
                pass
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