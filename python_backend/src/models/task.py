"""
Task-related models.
"""
from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field
from .base import BaseEntity, TaskStatus, TaskPriority, TaskCategory


class TaskBase(BaseModel):
    """Base task model."""
    title: str
    description: str = ""
    status: TaskStatus = TaskStatus.todo
    priority: TaskPriority = TaskPriority.medium
    category: TaskCategory = TaskCategory.general
    project_id: Optional[str] = Field(default=None, alias="projectId")
    assigned_to: Optional[str] = Field(default=None, alias="assignedTo")
    due_date: Optional[datetime] = Field(default=None, alias="dueDate")


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
    assigned_to: Optional[str] = Field(default=None, alias="assignedTo")
    due_date: Optional[datetime] = Field(default=None, alias="dueDate")


class Task(BaseEntity, TaskBase):
    """Complete task model."""
    pass


class TaskStats(BaseModel):
    """Task statistics model."""
    total_tasks: int = Field(alias="totalTasks")
    completed_tasks: int = Field(alias="completedTasks")
    pending_tasks: int = Field(alias="pendingTasks")
    overdue_tasks: int = Field(alias="overdueTasks")
    
    class Config:
        allow_population_by_field_name = True