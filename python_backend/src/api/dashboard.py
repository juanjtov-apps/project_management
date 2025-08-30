"""
Dashboard API endpoints.
"""
from fastapi import APIRouter, HTTPException, status
from src.models import ProjectStats, TaskStats, PhotoStats
from src.database.repositories import DashboardRepository

router = APIRouter(prefix="/dashboard", tags=["dashboard"])
dashboard_repo = DashboardRepository()


@router.get("")
async def get_dashboard_overview():
    """Get dashboard overview."""
    try:
        # Return basic dashboard data
        return {
            "status": "ok", 
            "message": "Dashboard endpoint working",
            "timestamp": "2025-08-30T04:00:00Z"
        }
    except Exception as e:
        print(f"Dashboard error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to fetch dashboard overview"
        )

@router.get("/stats")
async def get_dashboard_stats():
    """Get comprehensive dashboard statistics."""
    try:
        stats = await dashboard_repo.get_comprehensive_stats()
        return stats
    except Exception as e:
        print(f"Dashboard stats error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to fetch dashboard stats"
        )