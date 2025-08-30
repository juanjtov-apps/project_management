"""
Tower Flow FastAPI Application - Restructured Version
"""
import os
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from pathlib import Path

import sys
import os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from src.core.config import settings
from src.database.connection import db_manager, get_db_pool, close_db_pool
from src.api import create_api_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan events."""
    # Startup
    try:
        await get_db_pool()
        print("Database connection pool created successfully")
    except Exception as e:
        print(f"Failed to create database connection pool: {e}")
        raise
    yield
    # Shutdown
    try:
        await close_db_pool()
        print("Database connections closed successfully")
    except Exception as e:
        print(f"Error closing database connections: {e}")


# Create FastAPI app
app = FastAPI(
    title="Proesphere API", 
    version="1.0.0",
    lifespan=lifespan
)

# Setup security middleware first
from src.middleware.security import setup_security_middleware
setup_security_middleware(app)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include API routes
app.include_router(create_api_router())

# Static file serving for production
if not settings.debug:
    if Path("dist/public").exists():
        app.mount("/", StaticFiles(directory="dist/public", html=True), name="static")

# Note: Removed catch-all route to prevent interference with API endpoints


if __name__ == "__main__":
    import uvicorn
    
    print("🐍 Starting Python FastAPI backend...")
    print("🌐 Server will be available at http://0.0.0.0:8000")
    print("📋 API documentation at http://0.0.0.0:8000/docs")
    
    try:
        uvicorn.run(
            app,  # Use app instance directly
            host="0.0.0.0",
            port=8000,
            reload=False,
            log_level="info",
            access_log=True
        )
    except KeyboardInterrupt:
        print("🛑 Python backend shutdown requested")
    except Exception as e:
        print(f"❌ Python backend error: {e}")
        raise