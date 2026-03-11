"""
API v1 Router
All v1 API endpoints are organized here with proper versioning.
"""
from fastapi import APIRouter

# Import all v1 routers
from . import auth, projects, tasks, photos, logs, rbac, users, dashboard, activities, objects, companies, client_module, pm_notifications, stages, materials

# Import company_admin router from main api (not v1)
try:
    from ...api.company_admin import router as company_admin_router
except ImportError:
    company_admin_router = None

# Import admin router from main api (root admin endpoints)
try:
    from ...api.admin import router as admin_router
except ImportError:
    admin_router = None

# Import waitlist router (public endpoint, no auth required)
try:
    from ...api.waitlist import router as waitlist_router
except ImportError:
    waitlist_router = None

# Import user_management router for complete RBAC endpoints (POST/PATCH/DELETE)
try:
    from ...api.user_management import router as user_management_router
except ImportError:
    user_management_router = None

# Import schedule router for schedule changes
try:
    from ...api.schedule import router as schedule_router
except ImportError:
    schedule_router = None

# Import testnotify router (test endpoints)
try:
    from ...api.testnotify import router as testnotify_router
except ImportError:
    testnotify_router = None

# Import subcontractor_assignments router
try:
    from ...api.subcontractor_assignments import router as subcontractor_assignments_router
except ImportError:
    subcontractor_assignments_router = None

# Import dashboard_stats router
try:
    from ...api.dashboard_stats import router as dashboard_stats_router
except ImportError:
    dashboard_stats_router = None

# Import onboarding router (client magic link auth)
try:
    from ...api.onboarding import router as onboarding_router
except ImportError:
    onboarding_router = None

# Import subcontractor module router
try:
    from ...api.sub_module import router as sub_module_router
except ImportError:
    sub_module_router = None

# Import beta admin router (company invitation flow)
try:
    from ...api.beta_admin import router as beta_admin_router
except ImportError:
    beta_admin_router = None

# Import agent chat router
try:
    from ...agent.api.chat import router as agent_router
except ImportError:
    agent_router = None

# Import analytics router (platform usage analytics)
try:
    from ...api.analytics import router as analytics_router
except ImportError:
    analytics_router = None

# Import agent health dashboard router (observability)
try:
    from ...api.agent_health import router as agent_health_router
except ImportError:
    agent_health_router = None

# Import agent troubleshooting router (root admin error tracking)
try:
    from ...api.agent_troubleshooting import router as agent_troubleshooting_router
except ImportError:
    agent_troubleshooting_router = None

# Import briefing router (morning briefing)
try:
    from . import briefing as briefing_module
    briefing_router = briefing_module.router
except ImportError:
    briefing_router = None

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
    v1_router.include_router(stages.router, tags=["stages"])
    v1_router.include_router(materials.router, tags=["materials"])

    # Include schedule router for schedule changes
    if schedule_router:
        v1_router.include_router(schedule_router, tags=["schedule"])

    # Include testnotify router (test endpoints)
    if testnotify_router:
        v1_router.include_router(testnotify_router, tags=["test-notifications"])

    # Include subcontractor_assignments router
    if subcontractor_assignments_router:
        v1_router.include_router(subcontractor_assignments_router, prefix="/subcontractor-assignments", tags=["subcontractor-assignments"])

    # Include dashboard_stats router
    if dashboard_stats_router:
        v1_router.include_router(dashboard_stats_router, tags=["dashboard-stats"])

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
    
    # Include admin router for v1 API (root admin endpoints)
    if admin_router:
        v1_router.include_router(admin_router, tags=["admin"])
    
    # Include waitlist router (public endpoint)
    if waitlist_router:
        v1_router.include_router(waitlist_router, tags=["waitlist"])

    # Include onboarding router for client magic link auth
    if onboarding_router:
        v1_router.include_router(onboarding_router, tags=["onboarding"])

    # Include subcontractor module router
    if sub_module_router:
        v1_router.include_router(sub_module_router, tags=["subcontractor-module"])

    # Include beta admin router for company invitation flow
    if beta_admin_router:
        v1_router.include_router(beta_admin_router, tags=["beta-admin"])

    # Include agent router for AI chat functionality
    if agent_router:
        v1_router.include_router(agent_router, tags=["agent"])

    # Include analytics router for platform usage tracking
    if analytics_router:
        v1_router.include_router(analytics_router, tags=["analytics"])

    # Include briefing router for morning briefing
    if briefing_router:
        v1_router.include_router(briefing_router, tags=["briefing"])

    # Include agent health dashboard router (observability)
    if agent_health_router:
        v1_router.include_router(agent_health_router, tags=["agent-health"])

    # Include agent troubleshooting router (root admin error tracking)
    if agent_troubleshooting_router:
        v1_router.include_router(agent_troubleshooting_router, tags=["agent-troubleshooting"])

    return v1_router

