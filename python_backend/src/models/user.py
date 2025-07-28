"""
User-related models.
"""
from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field
from .base import BaseEntity, UserRole


class UserBase(BaseModel):
    """Base user model."""
    username: str
    email: Optional[str] = None
    full_name: str = Field(alias="fullName")
    role: UserRole = UserRole.crew
    phone: Optional[str] = None
    is_active: bool = Field(default=True, alias="isActive")


class UserCreate(UserBase):
    """User creation model."""
    password: str


class UserUpdate(BaseModel):
    """User update model."""
    username: Optional[str] = None
    email: Optional[str] = None
    full_name: Optional[str] = Field(default=None, alias="fullName")
    role: Optional[UserRole] = None
    phone: Optional[str] = None
    is_active: Optional[bool] = Field(default=None, alias="isActive")


class User(BaseEntity, UserBase):
    """Complete user model."""
    last_login: Optional[datetime] = Field(default=None, alias="lastLogin")


class UserLogin(BaseModel):
    """User login model."""
    username: str
    password: str


class UserStats(BaseModel):
    """User statistics model."""
    total_users: int = Field(alias="totalUsers")
    active_users: int = Field(alias="activeUsers")
    crew_members: int = Field(alias="crewMembers")
    managers: int
    
    class Config:
        allow_population_by_field_name = True