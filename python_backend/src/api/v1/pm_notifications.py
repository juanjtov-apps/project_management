"""
PM Notifications API endpoints for v1 API - imports from existing pm_notifications router.
"""
from fastapi import APIRouter
from ...api.pm_notifications import router as pm_notifications_router

# Include the existing router
# The v1 router will add /v1, so final path is /api/v1/pm-notifications/unread-count, etc.
router = APIRouter()
router.include_router(pm_notifications_router, tags=["pm-notifications"])

__all__ = ['router']

