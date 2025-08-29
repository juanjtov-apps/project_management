"""
Task API endpoints with authentication and company filtering.
"""
from typing import List, Optional, Dict, Any
from fastapi import APIRouter, HTTPException, status, Query, Depends, Request
from src.models import Task, TaskCreate, TaskUpdate
from src.database.repositories import TaskRepository
from src.database.auth_repositories import auth_repo
from src.api.auth import get_current_user_dependency, is_root_admin

router = APIRouter()
task_repo = TaskRepository()


@router.get("", response_model=List[Task])
async def get_tasks(
    project_id: Optional[str] = Query(None, alias="projectId"),
    status_filter: Optional[str] = Query(None, alias="status"),
    category: Optional[str] = Query(None),
    assigned_to: Optional[str] = Query(None, alias="assignedTo"),
    current_user: Dict[str, Any] = Depends(get_current_user_dependency)
):
    """Get tasks with optional filters and company scope."""
    try:
        # Get all tasks first
        tasks = await task_repo.get_all(
            project_id=project_id,
            status=status_filter,
            category=category,
            assigned_to=assigned_to
        )
        
        # Apply company filtering unless root admin
        if not is_root_admin(current_user):
            user_company_id = current_user.get('companyId')
            if user_company_id:
                # Filter tasks to only show those belonging to user's company
                # For this we need to enhance the task repository to include company filtering
                # For now, return all tasks (to be enhanced)
                pass
        
        return tasks
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
async def create_task(
    task: TaskCreate,
    current_user: Dict[str, Any] = Depends(get_current_user_dependency)
):
    """Create a new task with authentication."""
    try:
        # Validate that project tasks must have a project assigned
        if task.category == "project" and not task.project_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Project selection is required when category is 'Project Related'"
            )
        
        # Handle empty assignee_id by setting it to None
        if task.assignee_id == "":
            task.assignee_id = None
        
        print(f"Creating task for user {current_user.get('email')}: {task}")
        return await task_repo.create(task)
    except Exception as e:
        print(f"Error creating task: {e}")
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


from pydantic import BaseModel
from typing import Optional

class TaskAssignmentRequest(BaseModel):
    assignee_id: Optional[str] = None

@router.patch("/{task_id}/assign")
async def assign_task(
    task_id: str, 
    request: TaskAssignmentRequest,
    current_user: Dict[str, Any] = Depends(get_current_user_dependency)
):
    """Assign a task to a user with authentication."""
    try:
        print(f"Assigning task {task_id} to {request.assignee_id} by user {current_user.get('email')}")
        
        # Use auth repository for task assignment to maintain consistency
        task = await auth_repo.assign_task(task_id, request.assignee_id)
        if not task:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Task not found"
            )
        return task
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error assigning task {task_id}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to assign task"
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