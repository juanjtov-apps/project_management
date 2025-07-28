"""
ContractorPro FastAPI Application - Restructured Version
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
from src.database.connection import db_manager
from src.api import create_api_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan events."""
    # Startup
    await db_manager.connect()
    yield
    # Shutdown
    await db_manager.disconnect()


# Create FastAPI app
app = FastAPI(
    title="ContractorPro API", 
    version="1.0.0",
    lifespan=lifespan
)

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

# Development catch-all route
if settings.debug:
    @app.get("/{path:path}")
    async def catch_all(path: str):
        """Catch-all route for development mode."""
        return {"detail": "Not Found", "path": path}


if __name__ == "__main__":
    import uvicorn
    
    if settings.debug:
        print("Starting Python backend in development mode...")
        print(f"Note: Frontend should be served by Vite dev server on a different port")
    
    # Force port 8000 for Python backend
    backend_port = int(os.getenv("PORT", "8000")) if os.getenv("PORT") != "5000" else 8000
    uvicorn.run(
        app, 
        host=settings.host, 
        port=backend_port,
        reload=False  # Disable reload to avoid conflicts
    )