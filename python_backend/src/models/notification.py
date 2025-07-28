"""
Notification-related models.
"""
from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field
from .base import BaseEntity, NotificationType


class NotificationBase(BaseModel):
    """Base notification model."""
    user_id: str = Field(alias="userId")
    title: str
    message: str
    type: NotificationType
    is_read: bool = Field(default=False, alias="isRead")
    related_id: Optional[str] = Field(default=None, alias="relatedId")


class NotificationCreate(NotificationBase):
    """Notification creation model."""
    pass


class NotificationUpdate(BaseModel):
    """Notification update model."""
    is_read: Optional[bool] = Field(default=None, alias="isRead")


class Notification(BaseEntity, NotificationBase):
    """Complete notification model."""
    pass