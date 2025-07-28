"""
Schedule change-related models.
"""
from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field
from .base import BaseEntity, ScheduleChangeStatus


class ScheduleChangeBase(BaseModel):
    """Base schedule change model."""
    requested_by: str = Field(alias="requestedBy")
    project_id: Optional[str] = Field(default=None, alias="projectId")
    current_date: datetime = Field(alias="currentDate")
    requested_date: datetime = Field(alias="requestedDate")
    reason: str
    status: ScheduleChangeStatus = ScheduleChangeStatus.pending
    approved_by: Optional[str] = Field(default=None, alias="approvedBy")
    approved_at: Optional[datetime] = Field(default=None, alias="approvedAt")
    notes: str = ""


class ScheduleChangeCreate(BaseModel):
    """Schedule change creation model."""
    requested_by: str = Field(alias="requestedBy")
    project_id: Optional[str] = Field(default=None, alias="projectId")
    current_date: datetime = Field(alias="currentDate")
    requested_date: datetime = Field(alias="requestedDate")
    reason: str
    notes: str = ""


class ScheduleChangeUpdate(BaseModel):
    """Schedule change update model."""
    status: Optional[ScheduleChangeStatus] = None
    approved_by: Optional[str] = Field(default=None, alias="approvedBy")
    notes: Optional[str] = None


class ScheduleChange(BaseEntity, ScheduleChangeBase):
    """Complete schedule change model."""
    pass