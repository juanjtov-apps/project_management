"""
Dashboard API endpoints.
"""
from fastapi import APIRouter, HTTPException, status
from src.models import ProjectStats, TaskStats, PhotoStats, UserStats
from src.database.repositories import DashboardRepository

router = APIRouter(prefix="/api/dashboard", tags=["dashboard"])
dashboard_repo = DashboardRepository()


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