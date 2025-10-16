"""
PM Notifications API Endpoints
Handles notification listing, marking as read, and unread count
"""

from fastapi import APIRouter, Depends, HTTPException, Query, status
from typing import Optional, List
from pydantic import BaseModel
from ..database.connection import get_db_pool
from ..services.notification_service import NotificationService
from .auth import get_current_user

router = APIRouter(prefix="/pm-notifications", tags=["pm-notifications"])


# Pydantic models
class NotificationResponse(BaseModel):
    id: str
    project_id: str
    recipient_user_id: str
    type: str
    source_kind: str
    source_id: str
    title: str
    body: Optional[str]
    is_read: bool
    created_at: str
    route_path: str


class NotificationListResponse(BaseModel):
    items: List[NotificationResponse]
    next_cursor: Optional[str]


class UnreadCountResponse(BaseModel):
    count: int


class MarkReadRequest(BaseModel):
    notification_id: str


# Helper function to get notification service
async def get_notification_service():
    pool = await get_db_pool()
    return NotificationService(pool)


@router.get("", response_model=NotificationListResponse)
async def list_notifications(
    limit: int = Query(20, ge=1, le=100),
    cursor: Optional[str] = Query(None),
    is_read: Optional[bool] = Query(None),
    current_user: dict = Depends(get_current_user),
    service: NotificationService = Depends(get_notification_service)
):
    """Get paginated list of notifications for current user."""
    result = await service.list_notifications(
        recipient_user_id=current_user['id'],
        limit=limit,
        cursor=cursor,
        is_read=is_read
    )
    
    # Add route_path to each notification
    items_with_routes = []
    for item in result['items']:
        route_path = service.generate_route_path(item)
        items_with_routes.append({
            **item,
            "route_path": route_path,
            "created_at": item['created_at'].isoformat() if item['created_at'] else None
        })
    
    return {
        "items": items_with_routes,
        "next_cursor": result['next_cursor']
    }


@router.get("/unread-count", response_model=UnreadCountResponse)
async def get_unread_count(
    current_user: dict = Depends(get_current_user),
    service: NotificationService = Depends(get_notification_service)
):
    """Get count of unread notifications for current user."""
    count = await service.unread_count(current_user['id'])
    return {"count": count}


@router.post("/{notification_id}/read", status_code=status.HTTP_204_NO_CONTENT)
async def mark_notification_read(
    notification_id: str,
    current_user: dict = Depends(get_current_user),
    service: NotificationService = Depends(get_notification_service)
):
    """Mark a single notification as read."""
    success = await service.mark_read(notification_id, current_user['id'])
    
    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Notification not found or access denied"
        )
    
    return None


@router.post("/read-all", status_code=status.HTTP_204_NO_CONTENT)
async def mark_all_notifications_read(
    current_user: dict = Depends(get_current_user),
    service: NotificationService = Depends(get_notification_service)
):
    """Mark all notifications as read for current user."""
    await service.mark_all_read(current_user['id'])
    return None
