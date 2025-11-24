"""
Dashboard API endpoints for v1 API - imports from existing dashboard router.
"""
from fastapi import APIRouter
from ...api.dashboard_stats import router as dashboard_router

# Include the existing router (it already has /dashboard prefix)
router = APIRouter()
router.include_router(dashboard_router)

__all__ = ['router']

