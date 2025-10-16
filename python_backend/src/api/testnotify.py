"""
Test-only notification endpoints for simulating client events.
These endpoints are protected by NOTIFY_TEST_ENDPOINTS=true feature flag.
"""

import os
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from typing import Optional
from ..database.connection import get_db_pool
from ..services.notification_service import NotificationService
from .auth import get_current_user

router = APIRouter(prefix="/api/testnotify", tags=["test-notifications"])

# Check if test endpoints are enabled
TEST_ENDPOINTS_ENABLED = os.getenv("NOTIFY_TEST_ENDPOINTS", "false").lower() == "true"


class TestIssueNotificationRequest(BaseModel):
    project_id: str
    issue_id: str
    message: str


class TestMessageNotificationRequest(BaseModel):
    project_id: str
    message_id: str
    snippet: str


async def get_notification_service():
    pool = await get_db_pool()
    return NotificationService(pool)


async def check_test_endpoints_enabled():
    """Dependency to check if test endpoints are enabled."""
    if not TEST_ENDPOINTS_ENABLED:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Test endpoints not available"
        )


async def check_admin_or_manager(current_user: dict = Depends(get_current_user)):
    """Ensure only admins or managers can use test endpoints."""
    if current_user.get('role') not in ['admin', 'manager']:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin or manager role required"
        )
    return current_user


@router.post("/issue")
async def simulate_issue_created(
    request: TestIssueNotificationRequest,
    current_user: dict = Depends(check_admin_or_manager),
    service: NotificationService = Depends(get_notification_service),
    _enabled: None = Depends(check_test_endpoints_enabled)
):
    """
    Test endpoint: Simulate a client creating an issue.
    Creates notifications for all managers assigned to the project.
    """
    
    # Get all managers for the project
    # For now, create a notification for the current user to test
    pool = await get_db_pool()
    
    async with pool.acquire() as conn:
        # Get all managers/PMs assigned to this project
        managers = await conn.fetch("""
            SELECT DISTINCT u.id, u.full_name
            FROM users u
            WHERE u.role IN ('admin', 'manager')
            AND u.company_id = (
                SELECT company_id FROM projects WHERE id = $1
            )
        """, request.project_id)
        
        # Create notification for each manager
        notifications_created = []
        for manager in managers:
            notification = await service.create_notification(
                project_id=request.project_id,
                recipient_user_id=manager['id'],
                notification_type='issue_created',
                source_kind='issue',
                source_id=request.issue_id,
                title=f"New Issue: {request.message[:50]}",
                body=request.message
            )
            if notification:
                notifications_created.append(notification)
        
        return {
            "success": True,
            "message": f"Created {len(notifications_created)} notifications for issue",
            "notifications": notifications_created
        }


@router.post("/message")
async def simulate_message_posted(
    request: TestMessageNotificationRequest,
    current_user: dict = Depends(check_admin_or_manager),
    service: NotificationService = Depends(get_notification_service),
    _enabled: None = Depends(check_test_endpoints_enabled)
):
    """
    Test endpoint: Simulate a client posting a forum message.
    Creates notifications for all managers assigned to the project.
    """
    
    pool = await get_db_pool()
    
    async with pool.acquire() as conn:
        # Get all managers/PMs assigned to this project
        managers = await conn.fetch("""
            SELECT DISTINCT u.id, u.full_name
            FROM users u
            WHERE u.role IN ('admin', 'manager')
            AND u.company_id = (
                SELECT company_id FROM projects WHERE id = $1
            )
        """, request.project_id)
        
        # Create notification for each manager
        notifications_created = []
        for manager in managers:
            notification = await service.create_notification(
                project_id=request.project_id,
                recipient_user_id=manager['id'],
                notification_type='message_posted',
                source_kind='message',
                source_id=request.message_id,
                title=f"New Message: {request.snippet[:50]}",
                body=request.snippet
            )
            if notification:
                notifications_created.append(notification)
        
        return {
            "success": True,
            "message": f"Created {len(notifications_created)} notifications for message",
            "notifications": notifications_created
        }
