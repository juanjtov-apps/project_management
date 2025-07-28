"""
Task API endpoints.
"""
from typing import List, Optional
from fastapi import APIRouter, HTTPException, status, Query
from src.models import Task, TaskCreate, TaskUpdate
from src.database.repositories import TaskRepository

router = APIRouter(prefix="/tasks", tags=["tasks"])
task_repo = TaskRepository()


@router.get("", response_model=List[Task])
async def get_tasks(
    project_id: Optional[str] = Query(None, alias="projectId"),
    status_filter: Optional[str] = Query(None, alias="status"),
    category: Optional[str] = Query(None),
    assigned_to: Optional[str] = Query(None, alias="assignedTo")
):
    """Get tasks with optional filters."""
    try:
        return await task_repo.get_all(
            project_id=project_id,
            status=status_filter,
            category=category,
            assigned_to=assigned_to
        )
    except Exception as e:
        print(f"Error fetching tasks: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to fetch tasks"
        )


@router.get("/{task_id}", response_model=Task)
async def get_task(task_id: str):
    """Get task by ID."""
    try:
        task = await task_repo.get_by_id(task_id)
        if not task:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Task not found"
            )
        return task
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error fetching task {task_id}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to fetch task"
        )


@router.post("", response_model=Task, status_code=status.HTTP_201_CREATED)
async def create_task(task: TaskCreate):
    """Create a new task."""
    try:
        # Validate that project tasks must have a project assigned
        if task.category == "project" and not task.project_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Project selection is required when category is 'Project Related'"
            )
        
        print(f"Received task data: {task}")
        print(f"Task dict: {task.dict()}")
        print(f"Task dict with alias: {task.dict(by_alias=True)}")
        return await task_repo.create(task)
    except Exception as e:
        print(f"Error creating task: {e}")
        print(f"Exception type: {type(e)}")
        import traceback
        traceback.print_exc()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create task: {str(e)}"
        )


@router.patch("/{task_id}", response_model=Task)
async def update_task(task_id: str, task_update: TaskUpdate):
    """Update an existing task."""
    try:
        task = await task_repo.update(task_id, task_update)
        if not task:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Task not found"
            )
        return task
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error updating task {task_id}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update task"
        )


@router.delete("/{task_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_task(task_id: str):
    """Delete a task."""
    try:
        success = await task_repo.delete(task_id)
        if not success:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Task not found"
            )
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error deleting task {task_id}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to delete task"
        )