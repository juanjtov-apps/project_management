"""
Authentication API endpoints for v1 API.
Uses existing auth router which already has proper validation.
"""
from fastapi import APIRouter
from ...api.auth import router as auth_router

# Include the existing router (it already has /auth prefix and validation)
router = APIRouter()
router.include_router(auth_router)

__all__ = ['router']
