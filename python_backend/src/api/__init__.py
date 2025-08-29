"""
API package.
"""
from fastapi import APIRouter

# Import routers with error handling
try:
    from .projects import router as projects_router
    print("✅ Projects router imported")
except Exception as e:
    print(f"❌ Error importing projects router: {e}")
    projects_router = None

try:
    from .tasks import router as tasks_router
    print("✅ Tasks router imported")
except Exception as e:
    print(f"❌ Error importing tasks router: {e}")
    tasks_router = None

try:
    from .photos import router as photos_router
    print("✅ Photos router imported")
except Exception as e:
    print(f"❌ Error importing photos router: {e}")
    photos_router = None

try:
    from .dashboard import router as dashboard_router
    print("✅ Dashboard router imported")
except Exception as e:
    print(f"❌ Error importing dashboard router: {e}")
    dashboard_router = None

try:
    from .notifications import router as notifications_router
    print("✅ Notifications router imported")
except Exception as e:
    print(f"❌ Error importing notifications router: {e}")
    notifications_router = None

try:
    from .schedule import router as schedule_router
    print("✅ Schedule router imported")
except Exception as e:
    print(f"❌ Error importing schedule router: {e}")
    schedule_router = None

try:
    from .client_module import router as client_router
    print("✅ Client module router imported")
except Exception as e:
    print(f"❌ Error importing client module router: {e}")
    client_router = None

try:
    from .users import router as users_router
    print("✅ Users router imported")
except Exception as e:
    print(f"❌ Error importing users router: {e}")
    import traceback
    traceback.print_exc()
    users_router = None

try:
    from .subcontractor_assignments import router as subcontractor_assignments_router
    print("✅ Subcontractor assignments router imported")
except Exception as e:
    print(f"❌ Error importing subcontractor assignments router: {e}")
    subcontractor_assignments_router = None

try:
    from .rbac import router as rbac_router
    print("✅ RBAC router imported")
except Exception as e:
    print(f"❌ Error importing rbac router: {e}")
    rbac_router = None

# Import other routers as they are created
# from .logs import router as logs_router

def create_api_router() -> APIRouter:
    """Create and configure the main API router."""
    api_router = APIRouter(prefix="/api")
    
    # Include all sub-routers
    print("🔍 DEBUG: Including API routers...")
    
    if projects_router:
        api_router.include_router(projects_router, prefix="/projects", tags=["projects"])
        print("✅ Projects router included")
    else:
        print("⚠️  Projects router skipped (import failed)")
        
    if tasks_router:
        api_router.include_router(tasks_router, prefix="/tasks", tags=["tasks"])
        print("✅ Tasks router included")
    else:
        print("⚠️  Tasks router skipped (import failed)")
        
    if photos_router:
        api_router.include_router(photos_router, prefix="/photos", tags=["photos"])
        print("✅ Photos router included")
    else:
        print("⚠️  Photos router skipped (import failed)")
        
    if dashboard_router:
        api_router.include_router(dashboard_router, prefix="/dashboard", tags=["dashboard"])
        print("✅ Dashboard router included")
    else:
        print("⚠️  Dashboard router skipped (import failed)")
        
    if notifications_router:
        api_router.include_router(notifications_router, prefix="/notifications", tags=["notifications"])
        print("✅ Notifications router included")
    else:
        print("⚠️  Notifications router skipped (import failed)")
        
    if schedule_router:
        api_router.include_router(schedule_router, prefix="/schedule-changes", tags=["schedule"])
        print("✅ Schedule router included")
    else:
        print("⚠️  Schedule router skipped (import failed)")

    if client_router:
        api_router.include_router(client_router, tags=["client"])
        print("✅ Client module router included")
    else:
        print("⚠️  Client module router skipped (import failed)")
    
    if users_router:
        try:
            api_router.include_router(users_router, prefix="/users", tags=["users"])
            print("✅ Users router included successfully")
        except Exception as e:
            print(f"❌ ERROR including users router: {e}")
            import traceback
            traceback.print_exc()
    else:
        print("⚠️  Users router skipped (import failed)")
    
    if subcontractor_assignments_router:
        api_router.include_router(subcontractor_assignments_router, prefix="/subcontractor-assignments", tags=["subcontractor-assignments"])
        print("✅ Subcontractor assignments router included")
    else:
        print("⚠️  Subcontractor assignments router skipped (import failed)")
        
    if rbac_router:
        api_router.include_router(rbac_router)
        print("✅ RBAC router included")
    else:
        print("⚠️  RBAC router skipped (import failed)")
    
    # Include additional routers as they are implemented
    # api_router.include_router(logs_router)
    
    return api_router