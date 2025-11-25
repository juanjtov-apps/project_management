"""
API v1 Router
All v1 API endpoints are organized here with proper versioning.
"""
from fastapi import APIRouter

# Import all v1 routers
from . import auth, projects, tasks, photos, logs, rbac, users, dashboard, activities, objects, companies, client_module, pm_notifications, communications, change_orders, time_entries, invoices

# Import company_admin router from main api (not v1)
try:
    from ...api.company_admin import router as company_admin_router
except ImportError:
    company_admin_router = None

# Import user_management router for complete RBAC endpoints (POST/PATCH/DELETE)
try:
    from ...api.user_management import router as user_management_router
except ImportError:
    user_management_router = None

def create_v1_router() -> APIRouter:
    """Create and configure the v1 API router."""
    v1_router = APIRouter(prefix="/v1", tags=["v1"])
    
    # Include all v1 sub-routers (prefixes are already set in individual routers)
    v1_router.include_router(auth.router, tags=["auth"])
    v1_router.include_router(projects.router, tags=["projects"])
    v1_router.include_router(tasks.router, tags=["tasks"])
    v1_router.include_router(photos.router, tags=["photos"])
    v1_router.include_router(logs.router, tags=["logs"])
    v1_router.include_router(rbac.router, tags=["rbac"])
    v1_router.include_router(users.router, tags=["users"])
    v1_router.include_router(companies.router, tags=["companies"])
    v1_router.include_router(dashboard.router, tags=["dashboard"])
    v1_router.include_router(activities.router, tags=["activities"])
    v1_router.include_router(objects.router, tags=["objects"])
    v1_router.include_router(client_module.router, tags=["client-portal"])
    v1_router.include_router(pm_notifications.router, tags=["pm-notifications"])
    v1_router.include_router(communications.router, tags=["communications"])
    v1_router.include_router(change_orders.router, tags=["change-orders"])
    v1_router.include_router(time_entries.router, tags=["time-entries"])
    v1_router.include_router(invoices.router, tags=["invoices"])
    
    # Include user_management router for complete RBAC CRUD operations
    # This provides POST/PATCH/DELETE endpoints for /api/v1/rbac/*
    if user_management_router:
        v1_router.include_router(user_management_router, tags=["rbac"])
        # Router included silently - use logger if needed for debugging
    else:
        import logging
        logger = logging.getLogger(__name__)
        logger.warning("User management router not available for v1 API")
    
    # Include company-admin router for v1 API (frontend proxy rewrites /api/company-admin to /api/v1/company-admin)
    if company_admin_router:
        v1_router.include_router(company_admin_router, tags=["company-admin"])
    
    return v1_router

