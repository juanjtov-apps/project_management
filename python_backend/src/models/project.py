"""
Project-related models.
"""
from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field, field_validator
from .base import BaseEntity, ProjectStatus
from ..validators import (
    validate_company_name,
    validate_text_length,
    sanitize_string,
)


class ProjectBase(BaseModel):
    """Base project model."""
    name: str
    description: Optional[str] = ""
    location: Optional[str] = ""
    status: ProjectStatus = ProjectStatus.active
    progress: int = Field(default=0, ge=0, le=100)
    due_date: Optional[datetime] = Field(default=None, alias="dueDate")
    company_id: Optional[str] = Field(default=None, alias="companyId")
    cover_photo_id: Optional[str] = Field(default=None, alias="coverPhotoId")
    
    @field_validator('name')
    @classmethod
    def validate_name(cls, v):
        """Validate project name"""
        if not v:
            raise ValueError("Project name cannot be empty")
        v = sanitize_string(v)
        if len(v) < 1 or len(v) > 200:
            raise ValueError("Project name must be between 1 and 200 characters")
        return v.strip()
    
    @field_validator('description')
    @classmethod
    def validate_description(cls, v):
        """Validate project description"""
        if v is None:
            return ""
        return validate_text_length(v, max_length=5000, field_name="description")
    
    @field_validator('location')
    @classmethod
    def validate_location(cls, v):
        """Validate project location"""
        if v is None:
            return ""
        v = sanitize_string(v)
        if len(v) > 500:
            raise ValueError("Location must be 500 characters or less")
        return v.strip()


class ProjectCreate(ProjectBase):
    """Project creation model."""
    pass


class ProjectUpdate(BaseModel):
    """Project update model."""
    name: Optional[str] = None
    description: Optional[str] = None
    location: Optional[str] = None
    status: Optional[ProjectStatus] = None
    progress: Optional[int] = Field(default=None, ge=0, le=100)
    due_date: Optional[datetime] = Field(default=None, alias="dueDate")
    company_id: Optional[str] = Field(default=None, alias="companyId")
    cover_photo_id: Optional[str] = Field(default=None, alias="coverPhotoId")
    
    @field_validator('name')
    @classmethod
    def validate_name(cls, v):
        """Validate project name"""
        if v is None:
            return v
        v = sanitize_string(v)
        if len(v) < 1 or len(v) > 200:
            raise ValueError("Project name must be between 1 and 200 characters")
        return v.strip()
    
    @field_validator('description')
    @classmethod
    def validate_description(cls, v):
        """Validate project description"""
        if v is None:
            return v
        return validate_text_length(v, max_length=5000, field_name="description")
    
    @field_validator('location')
    @classmethod
    def validate_location(cls, v):
        """Validate project location"""
        if v is None:
            return v
        v = sanitize_string(v)
        if len(v) > 500:
            raise ValueError("Location must be 500 characters or less")
        return v.strip()


class Project(BaseEntity, ProjectBase):
    """Complete project model."""
    pass


class ProjectStats(BaseModel):
    """Project statistics model."""
    total_projects: int = Field(alias="totalProjects")
    active_projects: int = Field(alias="activeProjects")
    completed_projects: int = Field(alias="completedProjects")
    average_progress: float = Field(alias="averageProgress")
    
    model_config = {"populate_by_name": True}