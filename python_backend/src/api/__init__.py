"""
API package.
All routes are consolidated under the v1 router.
"""
import logging
from fastapi import APIRouter

logger = logging.getLogger(__name__)


def create_api_router() -> APIRouter:
    """Create the main API router.

    All routes are now consolidated in the v1 router.
    This function returns an empty router that will host the v1 sub-router.
    """
    api_router = APIRouter(prefix="/api")
    logger.debug("Main API router created - routes are in v1 sub-router")
    return api_router
