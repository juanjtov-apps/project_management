"""
API package.
"""
import logging
from fastapi import APIRouter

logger = logging.getLogger(__name__)

# Import routers with error handling
try:
    from .projects import router as projects_router
    logger.debug("Projects router imported")
except Exception as e:
    logger.error(f"Error importing projects router: {e}")
    projects_router = None

try:
    from .tasks import router as tasks_router
    logger.debug("Tasks router imported")
except Exception as e:
    logger.error(f"Error importing tasks router: {e}")
    tasks_router = None

try:
    from .photos import router as photos_router
    logger.debug("Photos router imported")
except Exception as e:
    logger.error(f"Error importing photos router: {e}")
    photos_router = None

try:
    from .dashboard import router as dashboard_router
    logger.debug("Dashboard router imported")
except Exception as e:
    logger.error(f"Error importing dashboard router: {e}")
    dashboard_router = None

try:
    from .notifications import router as notifications_router
    logger.debug("Notifications router imported")
except Exception as e:
    logger.error(f"Error importing notifications router: {e}")
    notifications_router = None

try:
    from .pm_notifications import router as pm_notifications_router
    logger.debug("PM Notifications router imported")
except Exception as e:
    logger.error(f"Error importing PM notifications router: {e}")
    pm_notifications_router = None

try:
    from .testnotify import router as testnotify_router
    logger.debug("Test Notify router imported")
except Exception as e:
    logger.error(f"Error importing Test Notify router: {e}")
    testnotify_router = None

try:
    from .schedule import router as schedule_router
    logger.debug("Schedule router imported")
except Exception as e:
    logger.error(f"Error importing schedule router: {e}")
    schedule_router = None

try:
    from .client_module import router as client_router
    logger.debug("Client module router imported")
except Exception as e:
    logger.error(f"Error importing client module router: {e}")
    client_router = None

try:
    from .users import router as users_router
    logger.debug("Users router imported")
except Exception as e:
    logger.error(f"Error importing users router: {e}")
    import traceback
    traceback.print_exc()
    users_router = None

try:
    from .subcontractor_assignments import router as subcontractor_assignments_router
    logger.debug("Subcontractor assignments router imported")
except Exception as e:
    logger.error(f"Error importing subcontractor assignments router: {e}")
    subcontractor_assignments_router = None

try:
    from .rbac import router as rbac_router
    logger.debug("RBAC router imported")
except Exception as e:
    logger.error(f"Error importing rbac router: {e}")
    rbac_router = None

try:
    from .auth import router as auth_router
    logger.debug("Auth router imported")
except Exception as e:
    logger.error(f"Error importing auth router: {e}")
    auth_router = None

try:
    from .user_management import router as user_management_router
    logger.debug("User management router imported")
except Exception as e:
    logger.error(f"Error importing user management router: {e}")
    user_management_router = None

try:
    from .dashboard_stats import router as dashboard_stats_router
    logger.debug("Dashboard stats router imported")
except Exception as e:
    logger.error(f"Error importing dashboard stats router: {e}")
    dashboard_stats_router = None

try:
    from .activities import router as activities_router
    logger.debug("Activities router imported")
except Exception as e:
    logger.error(f"Error importing activities router: {e}")
    activities_router = None

try:
    from .objects import router as objects_router
    logger.debug("Objects router imported")
except Exception as e:
    logger.error(f"Error importing objects router: {e}")
    objects_router = None

try:
    from .admin import router as admin_router
    logger.debug("Admin router imported")
except Exception as e:
    logger.error(f"Error importing admin router: {e}")
    admin_router = None

try:
    from .company_admin import router as company_admin_router
    logger.debug("Company admin router imported")
except Exception as e:
    logger.error(f"Error importing company admin router: {e}")
    company_admin_router = None

try:
    from .waitlist import router as waitlist_router
    logger.debug("Waitlist router imported")
except Exception as e:
    logger.error(f"Error importing waitlist router: {e}")
    waitlist_router = None

# Import other routers as they are created
# from .logs import router as logs_router

def create_api_router() -> APIRouter:
    """Create and configure the main API router."""
    api_router = APIRouter(prefix="/api")
    
    # Include all sub-routers
    logger.debug("Including API routers...")
    
    if projects_router:
        api_router.include_router(projects_router, prefix="/projects", tags=["projects"])
        logger.debug("Projects router included")
    else:
        logger.warning("Projects router skipped (import failed)")
        
    if tasks_router:
        api_router.include_router(tasks_router, prefix="/tasks", tags=["tasks"])
        logger.debug("Tasks router included")
    else:
        logger.warning("Tasks router skipped (import failed)")
        
    if photos_router:
        api_router.include_router(photos_router, tags=["photos"])
        logger.debug("Photos router included")
    else:
        logger.warning("Photos router skipped (import failed)")
        
    if dashboard_router:
        api_router.include_router(dashboard_router, tags=["dashboard"])
        logger.debug("Dashboard router included")
    else:
        logger.warning("Dashboard router skipped (import failed)")
        
    if dashboard_stats_router:
        api_router.include_router(dashboard_stats_router, tags=["dashboard-stats"])
        logger.debug("Dashboard stats router included")
    else:
        logger.warning("Dashboard stats router skipped (import failed)")
        
    if notifications_router:
        api_router.include_router(notifications_router, tags=["notifications"])
        logger.debug("Notifications router included")
    else:
        logger.warning("Notifications router skipped (import failed)")
        
    if pm_notifications_router:
        api_router.include_router(pm_notifications_router, tags=["pm-notifications"])
        logger.debug("PM Notifications router included")
    else:
        logger.warning("PM Notifications router skipped (import failed)")
        
    if testnotify_router:
        api_router.include_router(testnotify_router, tags=["test-notifications"])
        logger.debug("Test Notify router included")
    else:
        logger.warning("Test Notify router skipped (import failed)")
        
    if schedule_router:
        api_router.include_router(schedule_router, tags=["schedule"])
        logger.debug("Schedule router included")
    else:
        logger.warning("Schedule router skipped (import failed)")

    if client_router:
        api_router.include_router(client_router, tags=["client"])
        logger.debug("Client module router included")
    else:
        logger.warning("Client module router skipped (import failed)")
    
    if users_router:
        try:
            api_router.include_router(users_router, prefix="/users", tags=["users"])
            logger.debug("Users router included successfully")
        except Exception as e:
            logger.error(f"ERROR including users router: {e}")
            import traceback
            traceback.print_exc()
    else:
        logger.warning("Users router skipped (import failed)")
    
    if subcontractor_assignments_router:
        api_router.include_router(subcontractor_assignments_router, prefix="/subcontractor-assignments", tags=["subcontractor-assignments"])
        logger.debug("Subcontractor assignments router included")
    else:
        logger.warning("Subcontractor assignments router skipped (import failed)")
        
    if rbac_router:
        api_router.include_router(rbac_router)
        logger.debug("RBAC router included")
    else:
        logger.warning("RBAC router skipped (import failed)")
        
    if auth_router:
        api_router.include_router(auth_router)
        logger.debug("Auth router included")
    else:
        logger.warning("Auth router skipped (import failed)")
        
    if user_management_router:
        api_router.include_router(user_management_router, prefix="/users", tags=["user-management"])
        api_router.include_router(user_management_router, tags=["rbac"])  # Also include without prefix for RBAC endpoints
        logger.debug("User management router included")
    else:
        logger.warning("User management router skipped (import failed)")
        
    if activities_router:
        api_router.include_router(activities_router, tags=["activities"])
        logger.debug("Activities router included")
    else:
        logger.warning("Activities router skipped (import failed)")
        
    if objects_router:
        api_router.include_router(objects_router, tags=["objects"])
        logger.debug("Objects router included")
    else:
        logger.warning("Objects router skipped (import failed)")
    
    if admin_router:
        api_router.include_router(admin_router, tags=["admin"])
        logger.debug("Admin router included")
    else:
        logger.warning("Admin router skipped (import failed)")
    
    if company_admin_router:
        api_router.include_router(company_admin_router, tags=["company-admin"])
        logger.debug("Company admin router included")
    else:
        logger.warning("Company admin router skipped (import failed)")
    
    if waitlist_router:
        api_router.include_router(waitlist_router, tags=["waitlist"])
        logger.debug("Waitlist router included")
    else:
        logger.warning("Waitlist router skipped (import failed)")
    
    # Include additional routers as they are implemented
    # api_router.include_router(logs_router)
    
    return api_router