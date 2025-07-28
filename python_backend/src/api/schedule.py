"""Schedule changes API endpoints"""
from fastapi import APIRouter, HTTPException
from typing import List, Optional
import uuid
from datetime import datetime

from ..database.repositories import ScheduleChangeRepository
from ..models.schedule_change import ScheduleChange, ScheduleChangeCreate, ScheduleChangeUpdate

router = APIRouter(prefix="/schedule-changes", tags=["schedule"])
schedule_repo = ScheduleChangeRepository()

@router.get("", response_model=List[ScheduleChange])
async def get_schedule_changes(taskId: Optional[str] = None):
    """Get all schedule changes, optionally filtered by task"""
    try:
        changes = await schedule_repo.get_all(task_id=taskId)
        return changes
    except Exception as e:
        print(f"Schedule changes error: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch schedule changes")

@router.post("", response_model=ScheduleChange, status_code=201)
async def create_schedule_change(change: ScheduleChangeCreate):
    """Create a new schedule change"""
    try:
        new_change = await schedule_repo.create(change)
        return new_change
    except Exception as e:
        print(f"Create schedule change error: {e}")
        raise HTTPException(status_code=400, detail="Failed to create schedule change")

@router.patch("/{change_id}", response_model=ScheduleChange)
async def update_schedule_change(change_id: str, updates: ScheduleChangeUpdate):
    """Update a schedule change"""
    try:
        updated_change = await schedule_repo.update(change_id, updates)
        if not updated_change:
            raise HTTPException(status_code=404, detail="Schedule change not found")
        return updated_change
    except HTTPException:
        raise
    except Exception as e:
        print(f"Update schedule change error: {e}")
        raise HTTPException(status_code=400, detail="Failed to update schedule change")

@router.delete("/{change_id}")
async def delete_schedule_change(change_id: str):
    """Delete a schedule change"""
    try:
        success = await schedule_repo.delete(change_id)
        if not success:
            raise HTTPException(status_code=404, detail="Schedule change not found")
        return {"message": "Schedule change deleted successfully"}
    except HTTPException:
        raise
    except Exception as e:
        print(f"Delete schedule change error: {e}")
        raise HTTPException(status_code=400, detail="Failed to delete schedule change")