"""
Activities API endpoints for v1 API - imports from existing activities router.
"""
from fastapi import APIRouter
from ...api.activities import router as activities_router

# Include the existing router (it already has /activities prefix)
router = APIRouter()
router.include_router(activities_router)

__all__ = ['router']

