"""
Object storage API endpoints for v1 API - imports from existing objects router.
"""
from fastapi import APIRouter
from ...api.objects import router as objects_router

# Include the existing router (it already has /objects prefix)
router = APIRouter()
router.include_router(objects_router)

__all__ = ['router']

