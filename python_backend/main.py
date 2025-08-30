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


import logging
logger = logging.getLogger("uvicorn.error")

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Robust application lifespan with proper error handling."""
    try:
        logger.info("🚀 Starting up application...")
        
        # Initialize database pool with retry logic
        max_retries = 3
        for attempt in range(max_retries):
            try:
                await get_db_pool()
                logger.info("✅ Database connection pool created successfully")
                break
            except Exception as e:
                logger.warning(f"Database connection attempt {attempt + 1}/{max_retries} failed: {e}")
                if attempt == max_retries - 1:
                    logger.error("❌ Failed to establish database connection after all retries")
                    raise
                import asyncio
                await asyncio.sleep(1)  # Wait before retry
        
        logger.info("🎯 Application startup complete")
        yield
        
    except Exception as e:
        logger.exception("💥 Startup error: %s", e)
        raise
    finally:
        logger.info("🔄 Shutting down application...")
        try:
            await close_db_pool()
            logger.info("✅ Database connections closed successfully")
        except Exception as e:
            logger.exception("❌ Error closing database connections: %s", e)


# Create FastAPI app
app = FastAPI(
    title="Proesphere API", 
    version="1.0.0",
    lifespan=lifespan
)

# Add debug logging middleware first
from debug_middleware import LogRequests
app.add_middleware(LogRequests)

# Setup security middleware
from src.middleware.security import setup_security_middleware
setup_security_middleware(app)

# Add CORS middleware - must be configured properly for browser requests
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
    allow_headers=["*"],
    expose_headers=["*"],
)

# Health check endpoint for keep_alive monitoring
@app.get("/health")
async def health_check():
    """Health check endpoint for monitoring scripts"""
    return {"status": "healthy", "service": "proesphere-api"}

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