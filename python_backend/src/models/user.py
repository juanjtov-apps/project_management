"""User data models for Tower Flow"""

from pydantic import BaseModel, field_validator, EmailStr
from typing import Optional
from ..validators import (
    validate_name,
    validate_email_format,
    validate_password_strength,
    sanitize_string,
)

class User(BaseModel):
    """User model"""
    id: str
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    email: str
    role: str
    is_active: Optional[bool] = True
    
    model_config = {"from_attributes": True}

class UserCreate(BaseModel):
    """User creation model"""
    username: str
    name: Optional[str] = None
    first_name: Optional[str] = None  # Support frontend sending first_name
    email: EmailStr
    role: str
    password: str
    
    @field_validator('username', 'first_name', 'name')
    @classmethod
    def validate_names(cls, v):
        """Validate name fields"""
        if v is None:
            return v
        return validate_name(v, "name")
    
    @field_validator('email')
    @classmethod
    def validate_email(cls, v):
        """Validate email format"""
        return validate_email_format(v)
    
    @field_validator('password')
    @classmethod
    def validate_password(cls, v):
        """Validate password strength"""
        return validate_password_strength(v)
    
    def get_name(self) -> str:
        """Get the name field, preferring name over first_name"""
        return self.name or self.first_name or self.username

class UserUpdate(BaseModel):
    """User update model"""
    username: Optional[str] = None
    name: Optional[str] = None
    email: Optional[EmailStr] = None
    role: Optional[str] = None
    password: Optional[str] = None
    
    @field_validator('username', 'name')
    @classmethod
    def validate_names(cls, v):
        """Validate name fields"""
        if v is None:
            return v
        return validate_name(v, "name")
    
    @field_validator('email')
    @classmethod
    def validate_email(cls, v):
        """Validate email format"""
        if v is None:
            return v
        return validate_email_format(v)
    
    @field_validator('password')
    @classmethod
    def validate_password(cls, v):
        """Validate password strength"""
        if v is None:
            return v
        return validate_password_strength(v)