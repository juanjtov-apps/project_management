"""
Task API endpoints for v1 API - imports from existing tasks router.
"""
from fastapi import APIRouter
from ...api.tasks import router as tasks_router

# Include the existing router with /tasks prefix
# The v1 router will add /v1, so final path is /api/v1/tasks
router = APIRouter()
router.include_router(tasks_router, prefix="/tasks", tags=["tasks"])

__all__ = ['router']

