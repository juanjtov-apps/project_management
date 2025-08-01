"""
Photo-related models.
"""
from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field
from .base import BaseEntity


class PhotoBase(BaseModel):
    """Base photo model."""
    filename: str
    original_name: str = Field(alias="originalName")
    project_id: str = Field(alias="projectId")
    user_id: str = Field(alias="userId")
    description: str = ""


class PhotoCreate(BaseModel):
    """Photo creation model."""
    project_id: str = Field(alias="projectId")
    user_id: str = Field(alias="userId")
    description: str = ""


class Photo(BaseEntity, PhotoBase):
    """Complete photo model."""
    pass


class PhotoStats(BaseModel):
    """Photo statistics model."""
    total_photos: int = Field(alias="totalPhotos")
    photos_this_week: int = Field(alias="photosThisWeek")
    total_storage_mb: float = Field(alias="totalStorageMb")
    
    class Config:
        allow_population_by_field_name = True