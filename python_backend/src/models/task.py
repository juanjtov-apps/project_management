"""
Task-related models.
"""
from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field, field_validator
from .base import BaseEntity, TaskStatus, TaskPriority, TaskCategory
from ..validators import (
    sanitize_string,
    validate_text_length,
)


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
    
    model_config = {"populate_by_name": True}
    
    @field_validator('title')
    @classmethod
    def validate_title(cls, v):
        """Validate task title"""
        if not v:
            raise ValueError("Task title cannot be empty")
        v = sanitize_string(v)
        if len(v) < 1 or len(v) > 200:
            raise ValueError("Task title must be between 1 and 200 characters")
        return v.strip()
    
    @field_validator('description')
    @classmethod
    def validate_description(cls, v):
        """Validate task description"""
        if v is None:
            return v
        return validate_text_length(v, max_length=5000, field_name="description")
    
    @field_validator('status', mode='before')
    @classmethod
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
    
    model_config = {"populate_by_name": True}
    
    @field_validator('title')
    @classmethod
    def validate_title(cls, v):
        """Validate task title"""
        if v is None:
            return v
        v = sanitize_string(v)
        if len(v) < 1 or len(v) > 200:
            raise ValueError("Task title must be between 1 and 200 characters")
        return v.strip()
    
    @field_validator('description')
    @classmethod
    def validate_description(cls, v):
        """Validate task description"""
        if v is None:
            return v
        return validate_text_length(v, max_length=5000, field_name="description")
    
    @field_validator('status', mode='before')
    @classmethod
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
    
    model_config = {"populate_by_name": True, "extra": "ignore"}


class TaskStats(BaseModel):
    """Task statistics model."""
    total_tasks: int = Field(alias="totalTasks")
    completed_tasks: int = Field(alias="completedTasks")
    pending_tasks: int = Field(alias="pendingTasks")
    overdue_tasks: int = Field(alias="overdueTasks")
    
    model_config = {"populate_by_name": True}