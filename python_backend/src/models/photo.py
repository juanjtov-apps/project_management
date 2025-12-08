"""
Photo-related models.
"""
from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, Field
from .base import BaseEntity


class PhotoBase(BaseModel):
    """Base photo model."""
    filename: str
    original_name: str = Field(alias="originalName")
    project_id: str = Field(alias="projectId")
    user_id: str = Field(alias="userId")
    description: str = ""
    tags: List[str] = Field(default_factory=list)


class PhotoCreate(BaseModel):
    """Photo creation model."""
    project_id: str = Field(alias="projectId")
    user_id: str = Field(alias="userId")
    description: str = ""
    tags: List[str] = Field(default_factory=list)
    
    model_config = {"populate_by_name": True}


class Photo(BaseEntity, PhotoBase):
    """Complete photo model."""
    pass


class PhotoStats(BaseModel):
    """Photo statistics model."""
    total_photos: int = Field(alias="totalPhotos")
    photos_this_week: int = Field(alias="photosThisWeek")
    total_storage_mb: float = Field(alias="totalStorageMb")
    
    model_config = {"populate_by_name": True}