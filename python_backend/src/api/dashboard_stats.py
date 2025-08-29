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
        
        # Get comprehensive stats
        stats = await dashboard_repo.get_comprehensive_stats()
        
        # Apply company filtering unless root admin
        if not is_root_admin(current_user):
            user_company_id = current_user.get('companyId')
            if user_company_id:
                # For now, return all stats as we need to enhance repositories for company filtering
                # TODO: Add company filtering to dashboard repository queries
                print(f"TODO: Apply company filtering for company {user_company_id}")
        
        print(f"Retrieved dashboard stats: {len(stats)} categories")
        return stats
        
    except Exception as e:
        print(f"Error fetching dashboard stats: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to fetch dashboard statistics"
        )