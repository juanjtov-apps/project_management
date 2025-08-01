from pydantic import BaseModel, Field
from datetime import datetime
from typing import Optional


class SubcontractorAssignment(BaseModel):
    """Subcontractor Assignment model."""
    id: str
    subcontractor_id: str = Field(alias="subcontractorId")
    project_id: str = Field(alias="projectId")
    assigned_by: str = Field(alias="assignedBy")
    start_date: Optional[datetime] = Field(alias="startDate", default=None)
    end_date: Optional[datetime] = Field(alias="endDate", default=None)
    specialization: Optional[str] = None
    status: str = "active"
    created_at: datetime = Field(alias="createdAt")

    class Config:
        populate_by_name = True
        from_attributes = True


class SubcontractorAssignmentCreate(BaseModel):
    """Model for creating subcontractor assignments."""
    subcontractor_id: str = Field(alias="subcontractorId")
    project_id: str = Field(alias="projectId")
    assigned_by: str = Field(alias="assignedBy")
    start_date: Optional[datetime] = Field(alias="startDate", default=None)
    end_date: Optional[datetime] = Field(alias="endDate", default=None)
    specialization: Optional[str] = None
    status: str = "active"

    class Config:
        populate_by_name = True


class SubcontractorAssignmentUpdate(BaseModel):
    """Model for updating subcontractor assignments."""
    subcontractor_id: Optional[str] = Field(alias="subcontractorId", default=None)
    project_id: Optional[str] = Field(alias="projectId", default=None)
    assigned_by: Optional[str] = Field(alias="assignedBy", default=None)
    start_date: Optional[datetime] = Field(alias="startDate", default=None)
    end_date: Optional[datetime] = Field(alias="endDate", default=None)
    specialization: Optional[str] = None
    status: Optional[str] = None

    class Config:
        populate_by_name = True