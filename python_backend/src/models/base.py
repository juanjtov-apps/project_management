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
    on_hold = "on-hold"
    delayed = "delayed"


class TaskStatus(str, Enum):
    """Task status enumeration."""
    pending = "pending"
    in_progress = "in-progress"
    completed = "completed"
    blocked = "blocked"


class TaskPriority(str, Enum):
    """Task priority enumeration."""
    low = "low"
    medium = "medium"
    high = "high"
    critical = "critical"


class TaskCategory(str, Enum):
    """Task category enumeration."""
    project = "project"
    administrative = "administrative"
    general = "general"
    subcontractor = "subcontractor"


class UserRole(str, Enum):
    """User role enumeration - matches role names in roles table."""
    admin = "admin"
    project_manager = "project_manager"
    office_manager = "office_manager"
    crew = "crew"
    subcontractor = "subcontractor"
    client = "client"


class NotificationType(str, Enum):
    """Notification type enumeration."""
    info = "info"
    warning = "warning"
    error = "error"
    success = "success"
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


class PlanType(str, Enum):
    """Company plan type enumeration."""
    basic = "basic"
    premium = "premium"
    enterprise = "enterprise"


class BaseResponse(BaseModel):
    """Base response model."""
    message: str = "Success"


class BaseEntity(BaseModel):
    """Base entity with common fields."""
    id: str
    created_at: Optional[datetime] = Field(default=None, alias="createdAt")
    
    model_config = {"populate_by_name": True, "from_attributes": True}


class TimestampedEntity(BaseEntity):
    """Entity with created_at and updated_at timestamps."""
    updated_at: Optional[datetime] = Field(default=None, alias="updatedAt")
