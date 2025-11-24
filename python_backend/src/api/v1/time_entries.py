"""
Time Entries API endpoints for v1 API.
"""
from typing import List, Dict, Any, Optional
from fastapi import APIRouter, HTTPException, status, Depends, Query
from ...api.auth import get_current_user_dependency

router = APIRouter(prefix="/time-entries", tags=["time-entries"])


@router.get("", summary="Get all time entries")
async def get_time_entries(
    project_id: Optional[str] = Query(None, alias="projectId"),
    task_id: Optional[str] = Query(None, alias="taskId"),
    current_user: Dict[str, Any] = Depends(get_current_user_dependency)
):
    """Get all time entries with company filtering."""
    try:
        # TODO: Implement time entries repository and business logic
        # For now, return empty array to prevent 502 errors
        return []
    except Exception as e:
        print(f"Error fetching time entries: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to fetch time entries"
        )


@router.post("", status_code=status.HTTP_201_CREATED, summary="Create time entry")
async def create_time_entry(
    time_entry_data: Dict[str, Any],
    current_user: Dict[str, Any] = Depends(get_current_user_dependency)
) -> Dict[str, Any]:
    """Create a new time entry."""
    try:
        # TODO: Implement time entries repository and business logic
        raise HTTPException(
            status_code=status.HTTP_501_NOT_IMPLEMENTED,
            detail="Time entries endpoint not yet implemented"
        )
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error creating time entry: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create time entry"
        )

