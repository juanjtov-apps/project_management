"""
Schedule change-related models.
"""
from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field
from .base import BaseEntity, ScheduleChangeStatus


class ScheduleChangeBase(BaseModel):
    """Base schedule change model."""
    task_id: str = Field(alias="taskId")
    user_id: str = Field(alias="userId")
    reason: str
    original_date: datetime = Field(alias="originalDate")
    new_date: datetime = Field(alias="newDate")
    status: ScheduleChangeStatus = ScheduleChangeStatus.pending


class ScheduleChangeCreate(BaseModel):
    """Schedule change creation model."""
    task_id: str = Field(alias="taskId")
    user_id: str = Field(alias="userId")
    reason: str
    original_date: datetime = Field(alias="originalDate")
    new_date: datetime = Field(alias="newDate")
    status: Optional[ScheduleChangeStatus] = ScheduleChangeStatus.pending


class ScheduleChangeUpdate(BaseModel):
    """Schedule change update model."""
    status: Optional[ScheduleChangeStatus] = None
    approved_by: Optional[str] = Field(default=None, alias="approvedBy")
    notes: Optional[str] = None


class ScheduleChange(BaseEntity, ScheduleChangeBase):
    """Complete schedule change model."""
    pass