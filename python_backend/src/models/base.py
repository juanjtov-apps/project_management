"""
Base models and common types.
"""
from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field
from enum import Enum


class ProjectStatus(str, Enum):
    """Project status enumeration."""
    active = "active"
    completed = "completed"
    on_hold = "on_hold"
    cancelled = "cancelled"


class TaskStatus(str, Enum):
    """Task status enumeration."""
    todo = "todo"
    in_progress = "in_progress"
    done = "done"


class TaskPriority(str, Enum):
    """Task priority enumeration."""
    low = "low"
    medium = "medium"
    high = "high"
    urgent = "urgent"


class TaskCategory(str, Enum):
    """Task category enumeration."""
    project = "project"
    administrative = "administrative"
    general = "general"


class UserRole(str, Enum):
    """User role enumeration."""
    crew = "crew"
    manager = "manager"
    admin = "admin"


class NotificationType(str, Enum):
    """Notification type enumeration."""
    task_assigned = "task_assigned"
    project_updated = "project_updated"
    schedule_change = "schedule_change"
    photo_uploaded = "photo_uploaded"
    log_added = "log_added"


class ScheduleChangeStatus(str, Enum):
    """Schedule change status enumeration."""
    pending = "pending"
    approved = "approved"
    rejected = "rejected"


class BaseResponse(BaseModel):
    """Base response model."""
    message: str = "Success"


class BaseEntity(BaseModel):
    """Base entity with common fields."""
    id: str
    created_at: datetime = Field(alias="createdAt")
    
    class Config:
        populate_by_name = True
        json_encoders = {
            datetime: lambda dt: dt.isoformat()
        }