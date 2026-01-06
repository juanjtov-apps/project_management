"""
Models package.
"""
from .base import *
from .project import *
from .task import *
from .user import *
from .photo import *
from .log import *
from .notification import *
from .schedule_change import *
from .client_module import *
from .stage import (
    StageStatus,
    TemplateCategory,
    StageTemplateItem,
    StageTemplate,
    ProjectStageBase,
    ProjectStageCreate,
    ProjectStageUpdate,
    ProjectStage,
    ApplyTemplateRequest,
    ReorderStagesRequest,
)
from .rbac_models import (
    Permissions,
    DEFAULT_ROLES,
    DEFAULT_ROLE_PERMISSIONS,
    AuditAction,
    AuditLog,
    AuditLogCreate,
    PermissionContext,
    UserContext,
    PermissionCheckResponse,
)

__all__ = [
    # Base models
    "BaseEntity",
    "TimestampedEntity",
    "BaseResponse",
    "ProjectStatus",
    "TaskStatus", 
    "TaskPriority",
    "TaskCategory",
    "UserRole",
    "NotificationType",
    "ScheduleChangeStatus",
    "PlanType",
    
    # Project models
    "Project",
    "ProjectCreate",
    "ProjectUpdate",
    "ProjectStats",
    
    # Task models
    "Task",
    "TaskCreate", 
    "TaskUpdate",
    "TaskStats",
    
    # User models
    "User",
    "UserCreate",
    "UserUpdate",
    "UserWithRole",
    "Role",
    "RoleCreate",
    "RoleUpdate",
    "Company",
    "Permission",
    "RolePermission",
    
    # Photo models
    "Photo",
    "PhotoCreate",
    "PhotoStats",
    
    # Log models
    "ProjectLog",
    "ProjectLogCreate",
    "ProjectLogUpdate",
    
    # Notification models
    "Notification",
    "NotificationCreate",
    "NotificationUpdate",
    
    # Schedule change models
    "ScheduleChange", 
    "ScheduleChangeCreate",
    "ScheduleChangeUpdate",

    # Client module models
    "IssueStatus",
    "IssueBase",
    "IssueCreate",
    "Issue",
    "ForumMessage",
    "MaterialItem",
    "Installment",
    "FrequencyUnit",
    "NotificationSetting",

    # Stage models
    "StageStatus",
    "TemplateCategory",
    "StageTemplateItem",
    "StageTemplate",
    "ProjectStageBase",
    "ProjectStageCreate",
    "ProjectStageUpdate",
    "ProjectStage",
    "ApplyTemplateRequest",
    "ReorderStagesRequest",

    # RBAC models
    "Permissions",
    "DEFAULT_ROLES",
    "DEFAULT_ROLE_PERMISSIONS",
    "AuditAction",
    "AuditLog",
    "AuditLogCreate",
    "PermissionContext",
    "UserContext",
    "PermissionCheckResponse",
]
