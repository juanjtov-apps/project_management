"""
RBAC Pydantic Models
Defines all data models for the Role-Based Access Control system.
"""

from typing import List, Optional, Dict, Any, Union
from datetime import datetime
from pydantic import BaseModel, Field
from enum import Enum

# ENUMS
class UserRole(str, Enum):
    PLATFORM_ADMIN = "platform_admin"
    COMPANY_ADMIN = "company_admin"
    PROJECT_MANAGER = "project_manager"
    SUBCONTRACTOR = "subcontractor"
    CLIENT = "client"
    VIEWER = "viewer"

class CompanyStatus(str, Enum):
    ACTIVE = "active"
    SUSPENDED = "suspended"
    PENDING = "pending"

class PermissionCategory(str, Enum):
    PLATFORM = "platform"
    COMPANY = "company"
    PROJECT = "project"

class AuditAction(str, Enum):
    USER_CREATED = "user_created"
    USER_UPDATED = "user_updated"
    USER_DEACTIVATED = "user_deactivated"
    USER_LOGIN = "user_login"
    USER_LOGOUT = "user_logout"
    ROLE_ASSIGNED = "role_assigned"
    ROLE_REVOKED = "role_revoked"
    ROLE_CREATED = "role_created"
    ROLE_UPDATED = "role_updated"
    PERMISSION_GRANTED = "permission_granted"
    PERMISSION_REVOKED = "permission_revoked"
    DATA_VIEWED = "data_viewed"
    DATA_EXPORTED = "data_exported"
    DATA_MODIFIED = "data_modified"
    MFA_ENABLED = "mfa_enabled"
    MFA_DISABLED = "mfa_disabled"
    SUSPICIOUS_LOGIN = "suspicious_login"
    PERMISSION_DENIED = "permission_denied"

# PERMISSION CONSTANTS
class Permissions:
    # Platform Admin (1-9)
    SYSTEM_ADMIN = 1
    IMPERSONATE_USER = 2
    MANAGE_COMPANIES = 3
    PLATFORM_ANALYTICS = 4
    
    # Company Admin (10-19)
    MANAGE_USERS = 10
    VIEW_FINANCIALS = 11
    EDIT_FINANCIALS = 12
    CLONE_ROLES = 13
    COMPANY_SETTINGS = 14
    EXPORT_DATA = 15
    
    # Project Manager (20-29)
    VIEW_ALL_PROJECTS = 20
    MANAGE_TASKS = 21
    ASSIGN_SUBCONTRACTORS = 22
    APPROVE_BUDGETS = 23
    PROJECT_REPORTS = 24
    SCHEDULE_MANAGEMENT = 25
    
    # Subcontractor (30-39)
    VIEW_ASSIGNED_PROJECTS = 30
    UPDATE_TASK_STATUS = 31
    UPLOAD_PHOTOS = 32
    VIEW_PROJECT_DOCS = 33
    SUBMIT_REPORTS = 34
    
    # Client (40-49)
    VIEW_PROJECT_PROGRESS = 40
    VIEW_PHOTOS = 41
    COMMENT_ON_UPDATES = 42
    REQUEST_CHANGES = 43
    DOWNLOAD_REPORTS = 44

# BASE MODELS
class BaseRBACModel(BaseModel):
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

# COMPANY MODELS
class Company(BaseRBACModel):
    id: int
    name: str
    domain: Optional[str] = None
    status: CompanyStatus = CompanyStatus.ACTIVE
    settings: Dict[str, Any] = Field(default_factory=dict)

class CompanyCreate(BaseModel):
    name: str
    domain: Optional[str] = None
    status: CompanyStatus = CompanyStatus.ACTIVE
    settings: Dict[str, Any] = Field(default_factory=dict)

class CompanyUpdate(BaseModel):
    name: Optional[str] = None
    domain: Optional[str] = None
    status: Optional[CompanyStatus] = None
    settings: Optional[Dict[str, Any]] = None

# USER MODELS
class UserRBAC(BaseRBACModel):
    id: str
    email: Optional[str] = None
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    profile_image_url: Optional[str] = None
    is_active: bool = True
    last_login_at: Optional[datetime] = None
    mfa_enabled: bool = False

class UserCreate(BaseModel):
    id: Optional[str] = None
    email: Optional[str] = None
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    profile_image_url: Optional[str] = None
    is_active: bool = True
    mfa_enabled: bool = False

class UserUpdate(BaseModel):
    email: Optional[str] = None
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    profile_image_url: Optional[str] = None
    is_active: Optional[bool] = None
    mfa_enabled: Optional[bool] = None

# PERMISSION MODELS
class Permission(BaseRBACModel):
    id: int
    name: str
    resource: str
    action: str
    description: Optional[str] = None
    category: PermissionCategory
    requires_elevation: bool = False

class PermissionCreate(BaseModel):
    id: int
    name: str
    resource: str
    action: str
    description: Optional[str] = None
    category: PermissionCategory
    requires_elevation: bool = False

# ROLE TEMPLATE MODELS
class RoleTemplate(BaseRBACModel):
    id: int
    name: str
    description: Optional[str] = None
    category: PermissionCategory
    permission_set: List[int]
    is_system_template: bool = False

class RoleTemplateCreate(BaseModel):
    name: str
    description: Optional[str] = None
    category: PermissionCategory
    permission_set: List[int]
    is_system_template: bool = False

# ROLE MODELS
class Role(BaseRBACModel):
    id: int
    company_id: int
    name: str
    description: Optional[str] = None
    template_id: Optional[int] = None
    custom_permissions: List[int] = Field(default_factory=list)
    is_template: bool = False
    is_active: bool = True

class RoleCreate(BaseModel):
    company_id: int
    name: str
    description: Optional[str] = None
    template_id: Optional[int] = None
    custom_permissions: List[int] = Field(default_factory=list)
    is_template: bool = False

class RoleUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    template_id: Optional[int] = None
    custom_permissions: Optional[List[int]] = None
    is_active: Optional[bool] = None

# COMPANY USER MODELS
class CompanyUser(BaseRBACModel):
    id: int
    company_id: int
    user_id: str
    role_id: int
    granted_by_user_id: Optional[str] = None
    granted_at: Optional[datetime] = None
    expires_at: Optional[datetime] = None
    is_active: bool = True

class CompanyUserCreate(BaseModel):
    company_id: int
    user_id: str
    role_id: int
    granted_by_user_id: Optional[str] = None
    expires_at: Optional[datetime] = None

class CompanyUserWithDetails(CompanyUser):
    user: UserRBAC
    role: Role

# ROLE PERMISSION MODELS
class ABACRule(BaseModel):
    condition: str
    attributes: Dict[str, Any]
    description: Optional[str] = None

class RolePermission(BaseRBACModel):
    id: int
    company_id: int
    role_id: int
    permission_id: int
    abac_rule: Optional[ABACRule] = None
    granted_by_user_id: Optional[str] = None
    granted_at: Optional[datetime] = None
    expires_at: Optional[datetime] = None
    is_active: bool = True

class RolePermissionCreate(BaseModel):
    company_id: int
    role_id: int
    permission_id: int
    abac_rule: Optional[ABACRule] = None
    granted_by_user_id: Optional[str] = None
    expires_at: Optional[datetime] = None

# PROJECT ASSIGNMENT MODELS
class ProjectAssignment(BaseRBACModel):
    id: int
    company_id: int
    project_id: int
    user_id: str
    role_id: int
    permissions: List[int] = Field(default_factory=list)
    granted_by_user_id: Optional[str] = None
    granted_at: Optional[datetime] = None
    expires_at: Optional[datetime] = None
    is_active: bool = True

class ProjectAssignmentCreate(BaseModel):
    company_id: int
    project_id: int
    user_id: str
    role_id: int
    permissions: List[int] = Field(default_factory=list)
    granted_by_user_id: Optional[str] = None
    expires_at: Optional[datetime] = None

# EFFECTIVE PERMISSIONS MODELS
class EffectiveRole(BaseModel):
    id: int
    name: str
    company_id: int
    scope: str  # 'company' or 'project'
    project_id: Optional[int] = None

class EffectivePermissions(BaseModel):
    user_id: str
    company_id: int
    permissions: List[int]
    roles: List[EffectiveRole]
    computed_at: datetime
    expires_at: datetime

class UserEffectivePermission(BaseRBACModel):
    id: int
    company_id: int
    user_id: str
    permissions: List[int]
    role_ids: List[int]
    computed_at: Optional[datetime] = None
    expires_at: datetime

# USER CONTEXT MODELS
class UserContext(BaseModel):
    id: str
    email: str
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    current_company_id: int
    effective_permissions: List[int]
    roles: List[EffectiveRole]
    last_login_at: Optional[datetime] = None
    mfa_enabled: bool = False

# AUDIT LOG MODELS
class AuditLog(BaseRBACModel):
    id: int
    company_id: int
    user_id: str
    action: AuditAction
    resource: str
    resource_id: Optional[str] = None
    old_values: Optional[Dict[str, Any]] = None
    new_values: Optional[Dict[str, Any]] = None
    ip_address: Optional[str] = None
    user_agent: Optional[str] = None
    session_id: Optional[str] = None

class AuditLogCreate(BaseModel):
    company_id: int
    user_id: str
    action: AuditAction
    resource: str
    resource_id: Optional[str] = None
    old_values: Optional[Dict[str, Any]] = None
    new_values: Optional[Dict[str, Any]] = None
    ip_address: Optional[str] = None
    user_agent: Optional[str] = None
    session_id: Optional[str] = None

# PERMISSION CONTEXT MODELS
class PermissionContext(BaseModel):
    company_id: int
    user_id: str
    project_id: Optional[int] = None
    resource_id: Optional[str] = None
    ip_address: Optional[str] = None
    user_agent: Optional[str] = None

# ROLE ASSIGNMENT REQUEST MODELS
class RoleAssignmentRequest(BaseModel):
    user_id: str
    role_id: int
    company_id: int
    project_id: Optional[int] = None
    expires_at: Optional[datetime] = None
    permissions: Optional[List[int]] = None

# RBAC OPTIONS
class RBACOptions(BaseModel):
    required_permissions: List[int]
    require_all: bool = True  # AND vs OR logic
    company_id: Optional[int] = None
    project_id: Optional[int] = None
    allow_super_admin: bool = True
    abac_rules: Optional[List[ABACRule]] = None

# COMPANY SETTINGS
class CompanySettings(BaseModel):
    mfa_required: bool = False
    session_timeout: int = 60  # minutes
    password_policy: Dict[str, Union[int, bool]] = Field(default_factory=lambda: {
        "min_length": 8,
        "require_uppercase": True,
        "require_numbers": True,
        "require_symbols": True
    })
    audit_retention: int = 365  # days
    allow_cross_company_access: bool = False
    financial_data_elevation: bool = True

# RESPONSE MODELS
class PermissionCheckResponse(BaseModel):
    has_permission: bool
    user_permissions: List[int]
    required_permissions: List[int]
    context: Optional[Dict[str, Any]] = None

class RoleAssignmentResponse(BaseModel):
    success: bool
    message: str
    assignment_id: Optional[int] = None

class UserPermissionSummary(BaseModel):
    user_id: str
    company_id: int
    total_permissions: int
    roles: List[str]
    last_computed: datetime
    expires_at: datetime