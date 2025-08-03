"""
API package.
"""
from fastapi import APIRouter
from .projects import router as projects_router
from .tasks import router as tasks_router
from .photos import router as photos_router
from .dashboard import router as dashboard_router
from .notifications import router as notifications_router
from .schedule import router as schedule_router
from .users import router as users_router
from .subcontractor_assignments import router as subcontractor_assignments_router
from .rbac import router as rbac_router

# Import other routers as they are created
# from .logs import router as logs_router

def create_api_router() -> APIRouter:
    """Create and configure the main API router."""
    api_router = APIRouter(prefix="/api")
    
    # Include all sub-routers
    api_router.include_router(projects_router)
    api_router.include_router(tasks_router)
    api_router.include_router(photos_router)
    api_router.include_router(dashboard_router)
    api_router.include_router(notifications_router)
    api_router.include_router(schedule_router)
    api_router.include_router(users_router)
    api_router.include_router(subcontractor_assignments_router, prefix="/subcontractor-assignments", tags=["subcontractor-assignments"])
    api_router.include_router(rbac_router)
    
    # Include additional routers as they are implemented
    # api_router.include_router(logs_router)
    
    return api_router