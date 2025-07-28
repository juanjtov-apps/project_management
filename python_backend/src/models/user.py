"""User data models for ContractorPro"""

from pydantic import BaseModel
from typing import Optional

class User(BaseModel):
    """User model"""
    id: str
    username: str
    name: str
    email: str
    role: str
    password: Optional[str] = None  # Exclude from responses
    
    class Config:
        from_attributes = True

class UserCreate(BaseModel):
    """User creation model"""
    username: str
    name: str
    email: str
    role: str
    password: str

class UserUpdate(BaseModel):
    """User update model"""
    username: Optional[str] = None
    name: Optional[str] = None
    email: Optional[str] = None
    role: Optional[str] = None
    password: Optional[str] = None