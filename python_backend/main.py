"""
Proesphere FastAPI Application
"""
import os
import sys

# Load environment variables from .env file before anything else
from dotenv import load_dotenv
load_dotenv()

# Ensure NODE_ENV is set
if not os.getenv('NODE_ENV'):
    os.environ['NODE_ENV'] = 'development'

# Detect production environment
IS_PRODUCTION = os.getenv('NODE_ENV') == 'production' or os.getenv('REPLIT_DEPLOYMENT')

from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from pathlib import Path

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from src.core.config import settings
from src.database.connection import db_manager, get_db_pool, close_db_pool
from src.api import create_api_router
from src.api.v1 import create_v1_router


import logging
logger = logging.getLogger("uvicorn.error")

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Robust application lifespan with proper error handling."""
    db_connected = False
    try:
        logger.info("🚀 Starting up application...")
        print("🚀 Starting up application...")
        
        # Initialize database pool with retry logic
        max_retries = 5  # Increased retries
        retry_delay = 2  # Start with 2 seconds
        
        for attempt in range(max_retries):
            try:
                await get_db_pool()
                db_connected = True
                logger.info("✅ Database connection pool created successfully")
                print("✅ Database connection pool created successfully")
                break
            except Exception as e:
                logger.warning(f"Database connection attempt {attempt + 1}/{max_retries} failed: {e}")
                print(f"⚠️  Database connection attempt {attempt + 1}/{max_retries} failed: {e}")
                
                if attempt == max_retries - 1:
                    logger.error("❌ Failed to establish database connection after all retries")
                    logger.error("⚠️  Server will start but database operations will fail")
                    print("❌ Failed to establish database connection after all retries")
                    print("⚠️  Server will start but database operations will fail")
                    # Don't raise - allow server to start even if DB is unavailable
                    # This allows the server to be restarted when DB becomes available
                else:
                    import asyncio
                    await asyncio.sleep(retry_delay)
                    retry_delay = min(retry_delay * 1.5, 10)  # Exponential backoff, max 10s
        
        # Initialize client portal schema (only if DB is connected)
        if db_connected:
            try:
                from src.database.init_client_portal import init_client_portal_schema
                await init_client_portal_schema()
                logger.info("✅ Client portal schema verified/initialized")
                print("✅ Client portal schema verified/initialized")
            except Exception as e:
                logger.warning(f"⚠️ Client portal schema initialization error: {e}")
                print(f"⚠️  Client portal schema initialization error: {e}")
                # Don't fail startup if schema initialization fails

        # Initialize agent schema (only if DB is connected)
        if db_connected:
            try:
                from src.database.init_agent_schema import init_agent_schema
                await init_agent_schema()
                logger.info("✅ Agent schema verified/initialized")
                print("✅ Agent schema verified/initialized")
            except Exception as e:
                logger.warning(f"⚠️ Agent schema initialization error: {e}")
                print(f"⚠️  Agent schema initialization error: {e}")
                # Don't fail startup if schema initialization fails

        # Initialize subcontractor module schema (only if DB is connected)
        if db_connected:
            try:
                from src.database.init_subcontractor_schema import init_subcontractor_schema
                await init_subcontractor_schema()
                logger.info("✅ Subcontractor module schema verified/initialized")
                print("✅ Subcontractor module schema verified/initialized")
            except Exception as e:
                logger.warning(f"⚠️ Subcontractor module schema initialization error: {e}")
                print(f"⚠️  Subcontractor module schema initialization error: {e}")
                # Don't fail startup if schema initialization fails
        
        # Initialize beta invitations schema (only if DB is connected)
        if db_connected:
            try:
                from src.database.init_beta_schema import init_beta_schema
                await init_beta_schema()
                logger.info("Beta invitations schema verified/initialized")
            except Exception as e:
                logger.warning(f"Beta invitations schema initialization error: {e}")

        # Initialize analytics schema (only if DB is connected)
        if db_connected:
            try:
                from src.database.init_analytics_schema import init_analytics_schema
                await init_analytics_schema()
                logger.info("Analytics schema verified/initialized")
            except Exception as e:
                logger.warning(f"Analytics schema initialization error: {e}")

        # Seed progress + AI insights for existing projects
        if db_connected:
            try:
                from src.services.progress_service import recompute_all_project_progress
                from src.services.insight_service import seed_missing_insights
                await recompute_all_project_progress()
                await seed_missing_insights()
                logger.info("✅ Project progress and insights seeded")
                print("✅ Project progress and insights seeded")
            except Exception as e:
                logger.warning(f"⚠️ Progress/insight seeding error: {e}")
                print(f"⚠️  Progress/insight seeding error: {e}")

        # Start session cleanup background task
        import asyncio
        try:
            from src.api.auth import start_session_cleanup_task
            cleanup_task = asyncio.create_task(start_session_cleanup_task())
            logger.info("Session cleanup task started")
        except Exception as e:
            logger.warning(f"Failed to start session cleanup task: {e}")
            cleanup_task = None

        # Start analytics heartbeat cleanup background task
        analytics_cleanup_task = None
        try:
            from src.api.analytics import start_heartbeat_cleanup_task
            analytics_cleanup_task = asyncio.create_task(start_heartbeat_cleanup_task())
            logger.info("Analytics heartbeat cleanup task started")
        except Exception as e:
            logger.warning(f"Failed to start analytics cleanup task: {e}")

        logger.info("Application startup complete")
        print("Server is ready at http://0.0.0.0:8000")
        print("API documentation at http://0.0.0.0:8000/docs")
        yield

        # Cancel cleanup tasks on shutdown
        if cleanup_task:
            cleanup_task.cancel()
        if analytics_cleanup_task:
            analytics_cleanup_task.cancel()
        
    except KeyboardInterrupt:
        logger.info("🛑 Shutdown requested by user")
        print("🛑 Shutdown requested by user")
        raise
    except Exception as e:
        logger.exception("💥 Startup error: %s", e)
        print(f"💥 Startup error: {e}")
        # Re-raise to prevent server from starting in a broken state
        raise
    finally:
        logger.info("🔄 Shutting down application...")
        print("🔄 Shutting down application...")
        try:
            if db_connected:
                await close_db_pool()
                logger.info("✅ Database connections closed successfully")
                print("✅ Database connections closed successfully")
        except Exception as e:
            logger.exception("❌ Error closing database connections: %s", e)
            print(f"❌ Error closing database connections: {e}")


# Create FastAPI app
app = FastAPI(
    title="Proesphere API", 
    version="1.0.0",
    lifespan=lifespan
)

# Add debug logging middleware (development only)
if not IS_PRODUCTION:
    from debug_middleware import LogRequests
    app.add_middleware(LogRequests)

# Add request tracking middleware (for request IDs)
from src.middleware.request_tracking import RequestTrackingMiddleware
app.add_middleware(RequestTrackingMiddleware)

# Add analytics tracking middleware (counts API actions per user)
from src.middleware.analytics_tracking import AnalyticsTrackingMiddleware
app.add_middleware(AnalyticsTrackingMiddleware)

# Setup security middleware
from src.middleware.security import setup_security_middleware
setup_security_middleware(app)

# Client route guard — defense-in-depth layer that restricts client-role users
# to a whitelist of API endpoints (blocks access to admin/PM routes at middleware level)
from src.middleware.client_route_guard import ClientRouteGuardMiddleware
app.add_middleware(ClientRouteGuardMiddleware)

# Add CORS middleware - allow development and production origins with credentials support
# Production domains include Replit deployment URLs
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5000",
        "http://127.0.0.1:5000",
        "http://0.0.0.0:5000",
        "https://localhost:5000",
        "https://127.0.0.1:5000",
    ],
    allow_origin_regex=r"https://.*\.replit\.app|https://.*\.replit\.dev|https://.*\.repl\.co",
    allow_credentials=True,  # Enable credentials for session auth
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=[
        "Content-Type",
        "Authorization",
        "X-CSRF-Token",
        "Cookie",
        "Accept",
        "Origin",
        "X-Requested-With",
    ],
    expose_headers=["X-CSRF-Token", "X-Total-Count", "X-Page-Count"],
)

# Health check endpoint for keep_alive monitoring
@app.get("/health")
async def health_check():
    """Health check endpoint for monitoring scripts"""
    return {"status": "healthy", "service": "proesphere-api"}

# Include API routes - v1 is the primary versioned API
api_router = create_api_router()
api_router.include_router(create_v1_router())
app.include_router(api_router)

# Static file serving for production
if not settings.debug:
    if Path("dist/public").exists():
        app.mount("/", StaticFiles(directory="dist/public", html=True), name="static")

# Note: Removed catch-all route to prevent interference with API endpoints


if __name__ == "__main__":
    import uvicorn

    print("🐍 Starting Python FastAPI backend...")
    print(f"🌐 Environment: {'Production' if IS_PRODUCTION else 'Development'}")
    print("🌐 Server will be available at http://0.0.0.0:8000")
    print("📋 API documentation at http://0.0.0.0:8000/docs")

    try:
        uvicorn.run(
            "main:app",  # Use import string for reload to work properly
            host="0.0.0.0",
            port=8000,
            reload=not IS_PRODUCTION,  # Enable auto-reload for development only
            log_level="info",
            access_log=True
        )
    except KeyboardInterrupt:
        print("🛑 Python backend shutdown requested")
    except Exception as e:
        print(f"❌ Python backend error: {e}")
        raise