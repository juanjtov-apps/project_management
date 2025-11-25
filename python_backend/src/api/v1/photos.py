"""
Photo API endpoints for v1 API - imports from existing photos router.
"""
from fastapi import APIRouter
from ...api.photos import router as photos_router

# Include the existing router (it already has /photos prefix)
# The v1 router will add /v1, so final path is /api/v1/photos
router = APIRouter()
router.include_router(photos_router)

__all__ = ['router']

