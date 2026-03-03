"""
Project log-related models.
"""
from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field
from .base import BaseEntity


class ProjectLogBase(BaseModel):
    """Base project log model."""
    project_id: str = Field(alias="projectId")
    title: str
    content: str
    created_by: str = Field(alias="createdBy")
    log_type: str = Field(default="general", alias="logType")


class ProjectLogCreate(ProjectLogBase):
    """Project log creation model."""
    pass


class ProjectLogUpdate(BaseModel):
    """Project log update model."""
    title: Optional[str] = None
    content: Optional[str] = None
    log_type: Optional[str] = Field(default=None, alias="logType")


class ProjectLog(BaseEntity, ProjectLogBase):
    """Complete project log model."""
    pass