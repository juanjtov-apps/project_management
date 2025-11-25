#!/usr/bin/env python3
"""
Robust backend startup script with automatic restart and better error handling.
"""
import asyncio
import signal
import sys
import os
import time
from contextlib import asynccontextmanager
import uvicorn
from main import app

# Add current directory to path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

class BackendManager:
    def __init__(self):
        self.should_exit = False
        self.server = None
        
    def signal_handler(self, signum, frame):
        print(f"🛑 Received signal {signum}, shutting down gracefully...")
        self.should_exit = True
        if self.server:
            self.server.should_exit = True
    
    async def run_server(self):
        """Run the backend server with better error handling."""
        config = uvicorn.Config(
            app=app,
            host="0.0.0.0", 
            port=8000,
            reload=True,  # Enable auto-reload for development
            log_level="info",
            access_log=True,
            loop="asyncio"
        )
        
        self.server = uvicorn.Server(config)
        
        print("🐍 Starting robust Python FastAPI backend...")
        print("🌐 Server will be available at http://0.0.0.0:8000")
        print("📋 API documentation at http://0.0.0.0:8000/docs")
        print("🔧 Backend manager initialized with signal handling")
        
        try:
            await self.server.serve()
        except Exception as e:
            print(f"❌ Server error: {e}")
            return False
        return True
    
    async def start(self):
        """Start the backend with monitoring."""
        # Set up signal handlers
        signal.signal(signal.SIGINT, self.signal_handler)
        signal.signal(signal.SIGTERM, self.signal_handler)
        
        print("🚀 Backend manager starting...")
        
        while not self.should_exit:
            try:
                success = await self.run_server()
                if not success and not self.should_exit:
                    print("⚠️ Server stopped unexpectedly, restarting in 3 seconds...")
                    await asyncio.sleep(3)
                elif self.should_exit:
                    print("✅ Graceful shutdown completed")
                    break
            except KeyboardInterrupt:
                print("🛑 Keyboard interrupt received, shutting down...")
                break
            except Exception as e:
                print(f"❌ Unexpected error: {e}")
                if not self.should_exit:
                    print("🔄 Restarting in 5 seconds...")
                    await asyncio.sleep(5)

if __name__ == "__main__":
    manager = BackendManager()
    asyncio.run(manager.start())