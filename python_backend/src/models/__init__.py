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

__all__ = [
    # Base models
    "BaseEntity",
    "BaseResponse",
    "ProjectStatus",
    "TaskStatus", 
    "TaskPriority",
    "TaskCategory",
    "UserRole",
    "NotificationType",
    "ScheduleChangeStatus",
    
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
]