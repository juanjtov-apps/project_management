# Schedule Changes and Notifications routes
from fastapi import HTTPException
from typing import Optional, List
import uuid
from datetime import datetime

from .main import app, execute_query, execute_insert, execute_update
from .main import ScheduleChange, ScheduleChangeCreate, ScheduleChangeUpdate
from .main import Notification, NotificationCreate

@app.get("/api/schedule-changes", response_model=List[ScheduleChange])
async def get_schedule_changes(task_id: Optional[str] = None):
    """Get all schedule changes, optionally filtered by task"""
    try:
        if task_id:
            query = "SELECT * FROM schedule_changes WHERE task_id = %s ORDER BY created_at DESC"
            changes = execute_query(query, (task_id,))
        else:
            query = "SELECT * FROM schedule_changes ORDER BY created_at DESC"
            changes = execute_query(query)
        return changes
    except Exception as e:
        raise HTTPException(status_code=500, detail="Failed to fetch schedule changes")

@app.post("/api/schedule-changes", response_model=ScheduleChange, status_code=201)
async def create_schedule_change(change: ScheduleChangeCreate):
    """Create a new schedule change"""
    try:
        change_id = str(uuid.uuid4())
        query = """
            INSERT INTO schedule_changes (id, task_id, user_id, reason, original_date, new_date, status)
            VALUES (%s, %s, %s, %s, %s, %s, %s)
        """
        params = (
            change_id,
            change.task_id,
            change.user_id,
            change.reason,
            change.original_date,
            change.new_date,
            change.status
        )
        result = execute_insert(query, params)
        
        # Create notification for project manager
        notification_id = str(uuid.uuid4())
        notification_query = """
            INSERT INTO notifications (id, user_id, title, message, type, is_read, related_entity_type, related_entity_id)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
        """
        notification_params = (
            notification_id,
            "manager-id",  # In a real app, this would be determined from the project
            "Schedule Change Alert",
            f"Schedule change reported for task: {change.reason}",
            "warning",
            False,
            "schedule_change",
            change_id
        )
        execute_insert(notification_query, notification_params)
        
        return result
    except Exception as e:
        raise HTTPException(status_code=400, detail="Invalid schedule change data")

@app.patch("/api/schedule-changes/{change_id}", response_model=ScheduleChange)
async def update_schedule_change(change_id: str, updates: ScheduleChangeUpdate):
    """Update a schedule change"""
    try:
        # Build dynamic update query
        update_fields = []
        params = []
        
        update_data = updates.model_dump(exclude_unset=True)
        
        for field, value in update_data.items():
            # Convert field names to database column names
            if field == "originalDate":
                field = "original_date"
            elif field == "newDate":
                field = "new_date"
            
            update_fields.append(f"{field} = %s")
            params.append(value)
        
        if not update_fields:
            raise HTTPException(status_code=400, detail="No fields to update")
        
        params.append(change_id)
        query = f"UPDATE schedule_changes SET {', '.join(update_fields)} WHERE id = %s"
        
        result = execute_update(query, tuple(params))
        if not result:
            raise HTTPException(status_code=404, detail="Schedule change not found")
        return result
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=400, detail="Invalid schedule change data")

# Notifications routes
@app.get("/api/notifications", response_model=List[Notification])
async def get_notifications(user_id: Optional[str] = None):
    """Get notifications for a user"""
    try:
        if not user_id:
            # Return empty list if no user_id provided (matching TypeScript behavior)
            return []
        
        query = "SELECT * FROM notifications WHERE user_id = %s ORDER BY created_at DESC"
        notifications = execute_query(query, (user_id,))
        return notifications
    except Exception as e:
        raise HTTPException(status_code=500, detail="Failed to fetch notifications")

@app.patch("/api/notifications/{notification_id}/read", status_code=204)
async def mark_notification_as_read(notification_id: str):
    """Mark a notification as read"""
    try:
        query = "UPDATE notifications SET is_read = true WHERE id = %s"
        rowcount = execute_query(query, (notification_id,), fetch_all=False)
        if rowcount == 0:
            raise HTTPException(status_code=404, detail="Notification not found")
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail="Failed to mark notification as read")

@app.patch("/api/notifications/mark-all-read", status_code=204)
async def mark_all_notifications_as_read(request_data: dict):
    """Mark all notifications as read for a user"""
    try:
        user_id = request_data.get("userId")
        if not user_id:
            raise HTTPException(status_code=400, detail="User ID is required")
        
        query = "UPDATE notifications SET is_read = true WHERE user_id = %s"
        execute_query(query, (user_id,), fetch_all=False)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail="Failed to mark all notifications as read")

# Dashboard stats route
from .main import DashboardStats

@app.get("/api/dashboard/stats", response_model=DashboardStats)
async def get_dashboard_stats():
    """Get dashboard statistics"""
    try:
        # Get active projects count
        active_projects_query = "SELECT COUNT(*) as count FROM projects WHERE status = 'active'"
        active_projects_result = execute_query(active_projects_query, fetch_one=True)
        active_projects = active_projects_result["count"] if active_projects_result else 0
        
        # Get pending tasks count
        pending_tasks_query = "SELECT COUNT(*) as count FROM tasks WHERE status IN ('pending', 'in-progress')"
        pending_tasks_result = execute_query(pending_tasks_query, fetch_one=True)
        pending_tasks = pending_tasks_result["count"] if pending_tasks_result else 0
        
        # Get total photos count
        photos_query = "SELECT COUNT(*) as count FROM photos"
        photos_result = execute_query(photos_query, fetch_one=True)
        photos_uploaded = photos_result["count"] if photos_result else 0
        
        # Get photos uploaded today
        today = datetime.now().date()
        photos_today_query = "SELECT COUNT(*) as count FROM photos WHERE DATE(created_at) = %s"
        photos_today_result = execute_query(photos_today_query, (today,), fetch_one=True)
        photos_uploaded_today = photos_today_result["count"] if photos_today_result else 0
        
        return DashboardStats(
            active_projects=active_projects,
            pending_tasks=pending_tasks,
            photos_uploaded=photos_uploaded,
            photos_uploaded_today=photos_uploaded_today,
            crew_members=28  # Static for demo
        )
    except Exception as e:
        print(f"Dashboard stats error: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch dashboard stats")