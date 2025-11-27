"""
Task-related models.
"""
from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field, validator
from .base import BaseEntity, TaskStatus, TaskPriority, TaskCategory


class TaskBase(BaseModel):
    """Base task model."""
    title: str
    description: Optional[str] = None
    status: TaskStatus = TaskStatus.pending
    priority: TaskPriority = TaskPriority.medium
    category: TaskCategory = TaskCategory.general
    project_id: Optional[str] = Field(default=None, alias="projectId")
    assignee_id: Optional[str] = Field(default=None, alias="assigneeId")
    due_date: Optional[datetime] = Field(default=None, alias="dueDate")
    company_id: Optional[str] = Field(default=None, alias="companyId")
    
    class Config:
        populate_by_name = True
    
    @validator('status', pre=True)
    def normalize_status(cls, v):
        """Normalize status values: 'done' -> 'completed', 'in_progress' -> 'in-progress'."""
        if v is None:
            return v
        if isinstance(v, str):
            v_lower = v.lower()
            if v_lower == 'done':
                return TaskStatus.completed
            if v_lower == 'in_progress':
                return TaskStatus.in_progress
        return v


class TaskCreate(TaskBase):
    """Task creation model."""
    pass


class TaskUpdate(BaseModel):
    """Task update model."""
    title: Optional[str] = None
    description: Optional[str] = None
    status: Optional[TaskStatus] = None
    priority: Optional[TaskPriority] = None
    category: Optional[TaskCategory] = None
    project_id: Optional[str] = Field(default=None, alias="projectId")
    assignee_id: Optional[str] = Field(default=None, alias="assigneeId")
    due_date: Optional[datetime] = Field(default=None, alias="dueDate")
    
    class Config:
        populate_by_name = True
    
    @validator('status', pre=True)
    def normalize_status(cls, v):
        """Normalize status values: 'done' -> 'completed', 'in_progress' -> 'in-progress'."""
        if v is None:
            return v
        if isinstance(v, str):
            v_lower = v.lower()
            if v_lower == 'done':
                return TaskStatus.completed
            if v_lower == 'in_progress':
                return TaskStatus.in_progress
        return v


class Task(BaseEntity, TaskBase):
    """Complete task model."""
    
    class Config:
        populate_by_name = True
        # Allow extra fields from database that aren't in the model
        extra = "ignore"


class TaskStats(BaseModel):
    """Task statistics model."""
    total_tasks: int = Field(alias="totalTasks")
    completed_tasks: int = Field(alias="completedTasks")
    pending_tasks: int = Field(alias="pendingTasks")
    overdue_tasks: int = Field(alias="overdueTasks")
    
    class Config:
        populate_by_name = True