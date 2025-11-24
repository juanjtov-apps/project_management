"""
Client Portal API endpoints for v1 API - imports from existing client_module router.
"""
from fastapi import APIRouter
from ...api.client_module import router as client_router

# Include the existing router
# The v1 router will add /v1, so final path is /api/v1/client-issues, etc.
router = APIRouter()
router.include_router(client_router, tags=["client-portal"])

__all__ = ['router']

