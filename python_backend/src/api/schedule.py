"""Schedule changes API endpoints with authentication and company scoping"""
import logging
from fastapi import APIRouter, HTTPException, Depends, status
from typing import List, Optional, Dict, Any
import uuid
from datetime import datetime

logger = logging.getLogger(__name__)

from ..database.repositories import ScheduleChangeRepository, TaskRepository, ProjectRepository
from ..models.schedule_change import ScheduleChange, ScheduleChangeCreate, ScheduleChangeUpdate
from ..api.auth import get_current_user_dependency, is_root_admin

router = APIRouter(prefix="/schedule-changes", tags=["schedule"])
schedule_repo = ScheduleChangeRepository()
task_repo = TaskRepository()
project_repo = ProjectRepository()

@router.get("", response_model=List[ScheduleChange])
async def get_schedule_changes(
    taskId: Optional[str] = None,
    current_user: Dict[str, Any] = Depends(get_current_user_dependency)
):
    """Get all schedule changes with company scoping, optionally filtered by task"""
    try:
        changes = await schedule_repo.get_all(task_id=taskId)
        
        # Apply company filtering unless root admin
        if not is_root_admin(current_user):
            user_company_id = str(current_user.get('companyId') or current_user.get('company_id'))
            filtered_changes = []
            for change in changes:
                # Get task to check company
                task_id = change.get('task_id') or change.get('taskId')
                if task_id:
                    task = await task_repo.get_by_id(task_id)
                    if task:
                        task_company_id = str(task.get('company_id'))
                        if task_company_id == user_company_id:
                            filtered_changes.append(change)
                # If no task_id, skip this change (orphaned)
            changes = filtered_changes
            logger.debug(f"Schedule changes: User {current_user.get('email')} retrieved {len(changes)} changes after company filtering")
        else:
            logger.debug(f"Schedule changes: Root admin retrieved {len(changes)} changes (no filtering)")
        
        return changes
    except Exception as e:
        logger.error(f"Schedule changes error: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch schedule changes")

@router.post("", response_model=ScheduleChange, status_code=201)
async def create_schedule_change(
    change: ScheduleChangeCreate,
    current_user: Dict[str, Any] = Depends(get_current_user_dependency)
):
    """Create a new schedule change with company verification and immediately update the task"""
    try:
        # Verify task exists and user has access
        task = await task_repo.get_by_id(change.task_id)
        if not task:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Task not found"
            )
        
        # Verify company access (unless root admin)
        if not is_root_admin(current_user):
            user_company_id = str(current_user.get('companyId') or current_user.get('company_id'))
            task_company_id = str(task.get('company_id'))
            if task_company_id != user_company_id:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Access denied: Task belongs to different company"
                )
        
        # Create the schedule change record
        new_change = await schedule_repo.create(change)
        
        # Immediately update the task's due date
        await task_repo.update_due_date(change.task_id, change.new_date)
        
        return new_change
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Create schedule change error: {e}")
        raise HTTPException(status_code=400, detail="Failed to create schedule change")

@router.patch("/{change_id}", response_model=ScheduleChange)
async def update_schedule_change(
    change_id: str,
    updates: ScheduleChangeUpdate,
    current_user: Dict[str, Any] = Depends(get_current_user_dependency)
):
    """Update a schedule change with company verification and immediately update the task"""
    try:
        # Verify schedule change exists and user has access
        existing_change = await schedule_repo.get_by_id(change_id)
        if not existing_change:
            raise HTTPException(status_code=404, detail="Schedule change not found")
        
        # Verify company access via task (unless root admin)
        if not is_root_admin(current_user):
            task_id = existing_change.get('task_id') or existing_change.get('taskId')
            if task_id:
                task = await task_repo.get_by_id(task_id)
                if task:
                    user_company_id = str(current_user.get('companyId') or current_user.get('company_id'))
                    task_company_id = str(task.get('company_id'))
                    if task_company_id != user_company_id:
                        raise HTTPException(
                            status_code=status.HTTP_403_FORBIDDEN,
                            detail="Access denied: Schedule change belongs to different company"
                        )
        
        updated_change = await schedule_repo.update(change_id, updates)
        if not updated_change:
            raise HTTPException(status_code=404, detail="Schedule change not found")
        
        # If the new date was updated, update the task as well
        if updates.new_date:
            task_id = updated_change.get('task_id') or updated_change.get('taskId')
            if task_id:
                await task_repo.update_due_date(task_id, updates.new_date)
        
        return updated_change
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Update schedule change error: {e}")
        raise HTTPException(status_code=400, detail="Failed to update schedule change")

@router.delete("/{change_id}")
async def delete_schedule_change(
    change_id: str,
    current_user: Dict[str, Any] = Depends(get_current_user_dependency)
):
    """Delete a schedule change with company verification"""
    try:
        # Verify schedule change exists and user has access
        existing_change = await schedule_repo.get_by_id(change_id)
        if not existing_change:
            raise HTTPException(status_code=404, detail="Schedule change not found")
        
        # Verify company access via task (unless root admin)
        if not is_root_admin(current_user):
            task_id = existing_change.get('task_id') or existing_change.get('taskId')
            if task_id:
                task = await task_repo.get_by_id(task_id)
                if task:
                    user_company_id = str(current_user.get('companyId') or current_user.get('company_id'))
                    task_company_id = str(task.get('company_id'))
                    if task_company_id != user_company_id:
                        raise HTTPException(
                            status_code=status.HTTP_403_FORBIDDEN,
                            detail="Access denied: Schedule change belongs to different company"
                        )
        
        success = await schedule_repo.delete(change_id)
        if not success:
            raise HTTPException(status_code=404, detail="Schedule change not found")
        return {"message": "Schedule change deleted successfully"}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Delete schedule change error: {e}")
        raise HTTPException(status_code=400, detail="Failed to delete schedule change")