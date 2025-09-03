"""
Project-related models.
"""
from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field
from .base import BaseEntity, ProjectStatus


class ProjectBase(BaseModel):
    """Base project model."""
    name: str
    description: str = ""
    location: str = ""
    status: ProjectStatus = ProjectStatus.active
    progress: int = Field(default=0, ge=0, le=100)
    due_date: Optional[datetime] = Field(default=None, alias="dueDate")
    company_id: Optional[str] = Field(default=None, alias="companyId")


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


class Project(BaseEntity, ProjectBase):
    """Complete project model."""
    pass


class ProjectStats(BaseModel):
    """Project statistics model."""
    total_projects: int = Field(alias="totalProjects")
    active_projects: int = Field(alias="activeProjects")
    completed_projects: int = Field(alias="completedProjects")
    average_progress: float = Field(alias="averageProgress")
    
    class Config:
        allow_population_by_field_name = True