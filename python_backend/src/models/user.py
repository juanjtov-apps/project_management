"""User data models for Tower Flow"""

from pydantic import BaseModel
from typing import Optional

class User(BaseModel):
    """User model"""
    id: str
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    email: str
    role: str
    is_active: Optional[bool] = True
    
    class Config:
        from_attributes = True

class UserCreate(BaseModel):
    """User creation model"""
    username: str
    name: Optional[str] = None
    first_name: Optional[str] = None  # Support frontend sending first_name
    email: str
    role: str
    password: str
    
    def get_name(self) -> str:
        """Get the name field, preferring name over first_name"""
        return self.name or self.first_name or self.username

class UserUpdate(BaseModel):
    """User update model"""
    username: Optional[str] = None
    name: Optional[str] = None
    email: Optional[str] = None
    role: Optional[str] = None
    password: Optional[str] = None