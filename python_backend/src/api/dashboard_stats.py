"""
Dashboard statistics API endpoint.
Provides comprehensive dashboard statistics with company filtering.
"""

from fastapi import APIRouter, HTTPException, status, Depends
from typing import Dict, Any
from ..database.repositories import DashboardRepository
from .auth import get_current_user_dependency, is_root_admin

router = APIRouter(prefix="/dashboard", tags=["dashboard"])
dashboard_repo = DashboardRepository()

@router.get("/stats")
async def get_dashboard_stats(current_user: Dict[str, Any] = Depends(get_current_user_dependency)):
    """Get comprehensive dashboard statistics with company filtering."""
    try:
        print(f"Fetching dashboard stats for user {current_user.get('email')}")
        
        # Apply company filtering unless root admin
        user_company_id = None
        if not is_root_admin(current_user):
            user_company_id = str(current_user.get('companyId') or current_user.get('company_id'))
            if not user_company_id:
                print(f"Warning: User {current_user.get('email')} has no company_id, returning empty stats")
                return {
                    "projects": {"totalProjects": 0, "activeProjects": 0, "completedProjects": 0, "averageProgress": 0},
                    "tasks": {"totalTasks": 0, "completedTasks": 0, "pendingTasks": 0, "overdueTasks": 0},
                    "photos": {"totalPhotos": 0, "photosThisWeek": 0},
                    "users": {"totalUsers": 0, "activeUsers": 0, "crewMembers": 0, "managers": 0}
                }
        
        # Get comprehensive stats with company filtering
        stats = await dashboard_repo.get_comprehensive_stats(company_id=user_company_id)
        
        # Transform nested structure to flat structure expected by frontend
        # Keys are converted to camelCase by _convert_to_camel_case
        projects = stats.get("projects", {})
        tasks = stats.get("tasks", {})
        photos = stats.get("photos", {})
        users = stats.get("users", {})
        
        # Return flat structure matching frontend interface
        # Note: photosThisWeek is used as approximation for photosUploadedToday
        return {
            "activeProjects": projects.get("activeProjects", 0),
            "pendingTasks": tasks.get("pendingTasks", 0),
            "photosUploaded": photos.get("totalPhotos", 0),
            "photosUploadedToday": photos.get("photosThisWeek", 0),  # Approximation - could add separate query for today
            "crewMembers": users.get("crewMembers", 0)
        }
        
    except Exception as e:
        print(f"Error fetching dashboard stats: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to fetch dashboard statistics"
        )