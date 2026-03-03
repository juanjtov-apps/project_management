"""
RBAC Pydantic Models - Simplified
Each user belongs to ONE company and has ONE role.

NOTE: Core entity models (Role, RoleCreate, RoleUpdate, Company, Permission,
RolePermission, User, UserCreate, UserUpdate, UserWithRole) are defined
canonically in user.py. Do NOT re-define them here.

PlanType enum is defined canonically in base.py.
"""

from typing import List, Optional, Dict, Any
from datetime import datetime
from pydantic import BaseModel, Field, ConfigDict
from enum import Enum


# ============================================================================
# ENUMS
# ============================================================================

class AuditAction(str, Enum):
    """Audit log action types"""
    # User Management
    USER_CREATED = "user_created"
    USER_UPDATED = "user_updated"
    USER_DEACTIVATED = "user_deactivated"
    USER_LOGIN = "user_login"
    USER_LOGOUT = "user_logout"
    USER_PASSWORD_CHANGED = "user_password_changed"

    # Role Management
    ROLE_ASSIGNED = "role_assigned"
    ROLE_CREATED = "role_created"
    ROLE_UPDATED = "role_updated"
    ROLE_DELETED = "role_deleted"

    # Permission Management
    PERMISSION_GRANTED = "permission_granted"
    PERMISSION_REVOKED = "permission_revoked"

    # Data Access
    DATA_VIEWED = "data_viewed"
    DATA_EXPORTED = "data_exported"
    DATA_CREATED = "data_created"
    DATA_UPDATED = "data_updated"
    DATA_DELETED = "data_deleted"

    # Security Events
    PERMISSION_DENIED = "permission_denied"
    INVALID_LOGIN_ATTEMPT = "invalid_login_attempt"


# ============================================================================
# PERMISSION CONSTANTS
# ============================================================================

class Permissions:
    """String-based permission constants"""
    # User Management
    USERS_VIEW = "users.view"
    USERS_CREATE = "users.create"
    USERS_EDIT = "users.edit"
    USERS_DELETE = "users.delete"

    # Project Management
    PROJECTS_VIEW = "projects.view"
    PROJECTS_CREATE = "projects.create"
    PROJECTS_EDIT = "projects.edit"
    PROJECTS_DELETE = "projects.delete"

    # Task Management
    TASKS_VIEW = "tasks.view"
    TASKS_CREATE = "tasks.create"
    TASKS_EDIT = "tasks.edit"
    TASKS_DELETE = "tasks.delete"
    TASKS_ASSIGN = "tasks.assign"

    # Financial
    FINANCIALS_VIEW = "financials.view"
    FINANCIALS_EDIT = "financials.edit"
    INVOICES_CREATE = "invoices.create"
    INVOICES_APPROVE = "invoices.approve"

    # Photos & Documents
    PHOTOS_VIEW = "photos.view"
    PHOTOS_UPLOAD = "photos.upload"
    PHOTOS_DELETE = "photos.delete"

    # Reports
    REPORTS_VIEW = "reports.view"
    REPORTS_EXPORT = "reports.export"

    # Company Settings
    COMPANY_SETTINGS = "company.settings"
    ROLES_MANAGE = "roles.manage"

    # Client Portal
    CLIENT_PORTAL_VIEW = "client_portal.view"
    CLIENT_ISSUES_CREATE = "client_portal.issues.create"

    # System Admin (Root only)
    SYSTEM_ADMIN = "system.admin"
    COMPANIES_MANAGE = "companies.manage"


# ============================================================================
# BASE MODELS
# ============================================================================

class BaseRBACModel(BaseModel):
    """Base model with timestamps"""
    model_config = ConfigDict(from_attributes=True, populate_by_name=True)

    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None


# ============================================================================
# PERMISSION CONTEXT
# ============================================================================

class PermissionContext(BaseModel):
    """Context for permission checks"""
    user_id: str
    company_id: str
    is_root: bool
    permissions: List[str]
    role_id: int
    role_name: str


class UserContext(BaseModel):
    """Full user context for session"""
    id: str
    email: Optional[str] = None
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    company_id: str
    role_id: int
    role_name: str
    role_display_name: str
    permissions: List[str]
    is_root: bool
    is_active: bool
    last_login_at: Optional[datetime] = None


# ============================================================================
# AUDIT LOG MODELS
# ============================================================================

class AuditLog(BaseRBACModel):
    """Audit log model"""
    id: str
    company_id: str
    user_id: str
    action: str
    resource: str
    resource_id: Optional[str] = None
    old_values: Optional[Dict[str, Any]] = None
    new_values: Optional[Dict[str, Any]] = None
    ip_address: Optional[str] = None
    user_agent: Optional[str] = None


class AuditLogCreate(BaseModel):
    """Audit log creation"""
    company_id: str
    user_id: str
    action: str
    resource: str
    resource_id: Optional[str] = None
    old_values: Optional[Dict[str, Any]] = None
    new_values: Optional[Dict[str, Any]] = None
    ip_address: Optional[str] = None
    user_agent: Optional[str] = None


# ============================================================================
# COMPOUND MODELS (for complex queries)
# ============================================================================

class CompanyUserWithDetails(BaseModel):
    """Company user with full user and role details"""
    id: Optional[int] = None
    company_id: Optional[int] = None
    user_id: Optional[str] = None
    role_id: Optional[int] = None
    granted_by_user_id: Optional[str] = None
    granted_at: Optional[datetime] = None
    expires_at: Optional[datetime] = None
    is_active: bool = True
    # User details
    email: Optional[str] = None
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    profile_image_url: Optional[str] = None
    user_active: bool = True
    last_login_at: Optional[datetime] = None
    mfa_enabled: bool = False
    # Role details
    role_name: Optional[str] = None
    role_description: Optional[str] = None

    model_config = {"from_attributes": True, "populate_by_name": True}


class CompanyUserCreate(BaseModel):
    """Create a company user assignment"""
    user_id: str
    role_id: int
    expires_at: Optional[datetime] = None

    model_config = {"from_attributes": True, "populate_by_name": True}


class EffectivePermissions(BaseModel):
    """User's effective permissions in a company context"""
    user_id: str
    company_id: Optional[int] = None
    role_id: Optional[int] = None
    role_name: Optional[str] = None
    permissions: List[str] = []
    is_root: bool = False
    is_admin: bool = False

    model_config = {"from_attributes": True, "populate_by_name": True}


class RoleTemplate(BaseModel):
    """Role template for pre-defined permission sets"""
    id: Optional[int] = None
    name: str
    display_name: str
    description: Optional[str] = None
    permission_set: List[str] = []
    is_active: bool = True
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    model_config = {"from_attributes": True, "populate_by_name": True}


class PermissionCategory(BaseModel):
    """Permission category for grouping permissions"""
    name: str
    display_name: str
    description: Optional[str] = None
    permissions: List[str] = []

    model_config = {"from_attributes": True, "populate_by_name": True}


# ============================================================================
# RESPONSE MODELS
# ============================================================================

class PermissionCheckResponse(BaseModel):
    """Response for permission check"""
    has_permission: bool
    user_permissions: List[str]
    required_permissions: List[str]
    is_root: bool = False


class RoleAssignmentResponse(BaseModel):
    """Response for role assignment"""
    success: bool
    message: str
    user_id: Optional[str] = None
    role_id: Optional[int] = None


# ============================================================================
# DEFAULT ROLE DEFINITIONS
# ============================================================================

DEFAULT_ROLES = {
    "ADMIN": {
        "name": "admin",
        "display_name": "Administrator",
        "description": "Full access to all company features",
        "is_system_role": True,
    },
    "PROJECT_MANAGER": {
        "name": "project_manager",
        "display_name": "Project Manager",
        "description": "Can manage projects, tasks, and team members",
        "is_system_role": True,
    },
    "OFFICE_MANAGER": {
        "name": "office_manager",
        "display_name": "Office Manager",
        "description": "Can manage administrative tasks and reports",
        "is_system_role": True,
    },
    "CREW": {
        "name": "crew",
        "display_name": "Crew Member",
        "description": "Can view and update assigned tasks",
        "is_system_role": True,
    },
    "SUBCONTRACTOR": {
        "name": "subcontractor",
        "display_name": "Subcontractor",
        "description": "External contractor with limited access",
        "is_system_role": True,
    },
    "CLIENT": {
        "name": "client",
        "display_name": "Client",
        "description": "Project stakeholder with read-only access",
        "is_system_role": True,
    },
}

DEFAULT_ROLE_PERMISSIONS = {
    "ADMIN": [
        Permissions.USERS_VIEW, Permissions.USERS_CREATE, Permissions.USERS_EDIT, Permissions.USERS_DELETE,
        Permissions.PROJECTS_VIEW, Permissions.PROJECTS_CREATE, Permissions.PROJECTS_EDIT, Permissions.PROJECTS_DELETE,
        Permissions.TASKS_VIEW, Permissions.TASKS_CREATE, Permissions.TASKS_EDIT, Permissions.TASKS_DELETE, Permissions.TASKS_ASSIGN,
        Permissions.FINANCIALS_VIEW, Permissions.FINANCIALS_EDIT, Permissions.INVOICES_CREATE, Permissions.INVOICES_APPROVE,
        Permissions.PHOTOS_VIEW, Permissions.PHOTOS_UPLOAD, Permissions.PHOTOS_DELETE,
        Permissions.REPORTS_VIEW, Permissions.REPORTS_EXPORT,
        Permissions.COMPANY_SETTINGS, Permissions.ROLES_MANAGE,
        Permissions.CLIENT_PORTAL_VIEW, Permissions.CLIENT_ISSUES_CREATE,
    ],
    "PROJECT_MANAGER": [
        Permissions.USERS_VIEW,
        Permissions.PROJECTS_VIEW, Permissions.PROJECTS_CREATE, Permissions.PROJECTS_EDIT,
        Permissions.TASKS_VIEW, Permissions.TASKS_CREATE, Permissions.TASKS_EDIT, Permissions.TASKS_DELETE, Permissions.TASKS_ASSIGN,
        Permissions.FINANCIALS_VIEW,
        Permissions.PHOTOS_VIEW, Permissions.PHOTOS_UPLOAD,
        Permissions.REPORTS_VIEW, Permissions.REPORTS_EXPORT,
        Permissions.CLIENT_PORTAL_VIEW, Permissions.CLIENT_ISSUES_CREATE,
    ],
    "OFFICE_MANAGER": [
        Permissions.USERS_VIEW,
        Permissions.PROJECTS_VIEW,
        Permissions.TASKS_VIEW, Permissions.TASKS_CREATE, Permissions.TASKS_EDIT,
        Permissions.FINANCIALS_VIEW, Permissions.FINANCIALS_EDIT, Permissions.INVOICES_CREATE,
        Permissions.PHOTOS_VIEW,
        Permissions.REPORTS_VIEW, Permissions.REPORTS_EXPORT,
    ],
    "CREW": [
        Permissions.PROJECTS_VIEW,
        Permissions.TASKS_VIEW, Permissions.TASKS_EDIT,
        Permissions.PHOTOS_VIEW, Permissions.PHOTOS_UPLOAD,
    ],
    "SUBCONTRACTOR": [
        Permissions.PROJECTS_VIEW,
        Permissions.TASKS_VIEW, Permissions.TASKS_EDIT,
        Permissions.PHOTOS_VIEW, Permissions.PHOTOS_UPLOAD,
    ],
    "CLIENT": [
        Permissions.PROJECTS_VIEW,
        Permissions.PHOTOS_VIEW,
        Permissions.CLIENT_PORTAL_VIEW, Permissions.CLIENT_ISSUES_CREATE,
    ],
}
