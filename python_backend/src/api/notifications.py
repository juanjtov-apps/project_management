"""
Notification API endpoints.
"""
from typing import List, Optional
from fastapi import APIRouter, HTTPException, status, Query
from src.models import Notification, NotificationCreate, NotificationUpdate

router = APIRouter(prefix="/notifications", tags=["notifications"])

# For now, return empty list to fix frontend error
@router.get("", response_model=List[Notification])
async def get_notifications(
    user_id: Optional[str] = Query(None, alias="userId"),
    is_read: Optional[bool] = Query(None, alias="isRead")
):
    """Get notifications for a user."""
    try:
        # Return empty array for now to fix frontend
        return []
    except Exception as e:
        print(f"Error fetching notifications: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to fetch notifications"
        )