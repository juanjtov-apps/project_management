"""User data models for Proesphere"""

from pydantic import BaseModel, field_validator, EmailStr, Field
from typing import Optional
from datetime import datetime
from ..validators import (
    validate_name,
    validate_email_format,
    validate_password_strength,
    sanitize_string,
)


class User(BaseModel):
    """User model - each user belongs to ONE company and has ONE role"""
    id: str
    email: Optional[str] = None
    username: Optional[str] = None
    firstName: Optional[str] = Field(default=None, alias="first_name")
    lastName: Optional[str] = Field(default=None, alias="last_name")
    profileImageUrl: Optional[str] = Field(default=None, alias="profile_image_url")
    
    # RBAC fields - ONE company, ONE role
    companyId: str = Field(alias="company_id")
    roleId: int = Field(alias="role_id")
    
    # Role details (populated from join)
    roleName: Optional[str] = Field(default=None, alias="role_name")
    roleDisplayName: Optional[str] = Field(default=None, alias="role_display_name")
    
    # Flags
    isRoot: bool = Field(default=False, alias="is_root")
    isActive: bool = Field(default=True, alias="is_active")
    
    # Timestamps
    lastLoginAt: Optional[datetime] = Field(default=None, alias="last_login_at")
    createdAt: Optional[datetime] = Field(default=None, alias="created_at")
    updatedAt: Optional[datetime] = Field(default=None, alias="updated_at")
    
    model_config = {"from_attributes": True, "populate_by_name": True}


class UserCreate(BaseModel):
    """User creation model"""
    email: EmailStr
    username: Optional[str] = None
    password: str
    firstName: Optional[str] = None
    lastName: Optional[str] = None
    profileImageUrl: Optional[str] = None

    # Required: company and role
    companyId: str
    roleId: int

    # Optional flags
    isRoot: bool = False
    isActive: bool = True

    @field_validator('username', 'firstName', 'lastName')
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

    def get_display_name(self) -> str:
        """Get display name, preferring full name over username"""
        if self.firstName and self.lastName:
            return f"{self.firstName} {self.lastName}"
        return self.firstName or self.username or self.email


class UserUpdate(BaseModel):
    """User update model - partial updates allowed"""
    email: Optional[EmailStr] = None
    username: Optional[str] = None
    password: Optional[str] = None
    firstName: Optional[str] = None
    lastName: Optional[str] = None
    profileImageUrl: Optional[str] = None

    # Role can be updated (company cannot)
    roleId: Optional[int] = None

    # Flags
    isActive: Optional[bool] = None

    @field_validator('username', 'firstName', 'lastName')
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


class UserWithRole(BaseModel):
    """User with full role information"""
    id: str
    email: Optional[str] = None
    username: Optional[str] = None
    firstName: Optional[str] = Field(default=None, alias="first_name")
    lastName: Optional[str] = Field(default=None, alias="last_name")
    profileImageUrl: Optional[str] = Field(default=None, alias="profile_image_url")
    companyId: str = Field(alias="company_id")
    roleId: int = Field(alias="role_id")
    isRoot: bool = Field(default=False, alias="is_root")
    isActive: bool = Field(default=True, alias="is_active")
    lastLoginAt: Optional[datetime] = Field(default=None, alias="last_login_at")
    
    # Role details
    role: Optional["Role"] = None
    
    # Company details
    company: Optional["Company"] = None
    
    model_config = {"from_attributes": True, "populate_by_name": True}


class Role(BaseModel):
    """Role model"""
    id: int
    companyId: Optional[str] = Field(default=None, alias="company_id")
    name: str
    displayName: str = Field(alias="display_name")
    description: Optional[str] = None
    isSystemRole: bool = Field(default=False, alias="is_system_role")
    isActive: bool = Field(default=True, alias="is_active")
    createdAt: Optional[datetime] = Field(default=None, alias="created_at")
    updatedAt: Optional[datetime] = Field(default=None, alias="updated_at")
    
    model_config = {"from_attributes": True, "populate_by_name": True}


class RoleCreate(BaseModel):
    """Role creation model"""
    companyId: Optional[str] = None
    name: str
    displayName: str
    description: Optional[str] = None
    isSystemRole: bool = False
    isActive: bool = True


class RoleUpdate(BaseModel):
    """Role update model"""
    name: Optional[str] = None
    displayName: Optional[str] = None
    description: Optional[str] = None
    isActive: Optional[bool] = None


class Company(BaseModel):
    """Company model"""
    id: str
    name: str
    industry: Optional[str] = "construction"
    address: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    website: Optional[str] = None
    logo: Optional[str] = None
    domain: Optional[str] = None
    settings: Optional[dict] = None
    planType: str = Field(default="basic", alias="plan_type")
    isActive: bool = Field(default=True, alias="is_active")
    createdAt: Optional[datetime] = Field(default=None, alias="created_at")
    updatedAt: Optional[datetime] = Field(default=None, alias="updated_at")
    
    model_config = {"from_attributes": True, "populate_by_name": True}


class Permission(BaseModel):
    """Permission model"""
    id: int
    name: str
    resource: str
    action: str
    description: Optional[str] = None
    category: str = "general"
    createdAt: Optional[datetime] = Field(default=None, alias="created_at")
    
    model_config = {"from_attributes": True, "populate_by_name": True}


class RolePermission(BaseModel):
    """Role-Permission mapping"""
    id: int
    roleId: int = Field(alias="role_id")
    permissionId: int = Field(alias="permission_id")
    createdAt: Optional[datetime] = Field(default=None, alias="created_at")
    
    model_config = {"from_attributes": True, "populate_by_name": True}


# Update forward references
UserWithRole.model_rebuild()
