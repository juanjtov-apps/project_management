"""
Project Stage models for tracking construction phases and finish materials.
"""
from datetime import date, datetime
from enum import Enum
from typing import List, Optional
from pydantic import BaseModel, Field

from .base import BaseEntity, TimestampedEntity


class StageStatus(str, Enum):
    """Project stage status enumeration."""
    not_started = "NOT_STARTED"
    active = "ACTIVE"
    complete = "COMPLETE"


class TemplateCategory(str, Enum):
    """Stage template category enumeration."""
    residential = "residential"
    commercial = "commercial"
    general = "general"


# Stage Template Models
class StageTemplateItemBase(BaseModel):
    """Base model for stage template items."""
    order_index: int = Field(default=0, alias="orderIndex")
    name: str
    default_duration_days: Optional[int] = Field(default=None, alias="defaultDurationDays")
    default_materials_note: Optional[str] = Field(default=None, alias="defaultMaterialsNote")

    model_config = {"populate_by_name": True, "from_attributes": True}


class StageTemplateItem(StageTemplateItemBase):
    """Stage template item with ID."""
    id: str
    template_id: str = Field(alias="templateId")
    created_at: Optional[datetime] = Field(default=None, alias="createdAt")


class StageTemplateBase(BaseModel):
    """Base model for stage templates."""
    name: str
    description: Optional[str] = None
    category: TemplateCategory = TemplateCategory.general

    model_config = {"populate_by_name": True, "from_attributes": True}


class StageTemplate(StageTemplateBase):
    """Stage template with items."""
    id: str
    items: List[StageTemplateItem] = []
    created_at: Optional[datetime] = Field(default=None, alias="createdAt")


# Project Stage Models
class ProjectStageBase(BaseModel):
    """Base model for project stages."""
    name: str
    order_index: int = Field(default=0, alias="orderIndex")
    status: StageStatus = StageStatus.not_started
    planned_start_date: Optional[date] = Field(default=None, alias="plannedStartDate")
    planned_end_date: Optional[date] = Field(default=None, alias="plannedEndDate")
    finish_materials_due_date: Optional[date] = Field(default=None, alias="finishMaterialsDueDate")
    finish_materials_note: Optional[str] = Field(default=None, alias="finishMaterialsNote")
    material_area_id: Optional[str] = Field(default=None, alias="materialAreaId")
    client_visible: bool = Field(default=True, alias="clientVisible")

    model_config = {"populate_by_name": True, "from_attributes": True}


class ProjectStageCreate(ProjectStageBase):
    """Model for creating a project stage."""
    project_id: str = Field(alias="projectId")


class ProjectStageUpdate(BaseModel):
    """Model for updating a project stage."""
    name: Optional[str] = None
    order_index: Optional[int] = Field(default=None, alias="orderIndex")
    status: Optional[StageStatus] = None
    planned_start_date: Optional[date] = Field(default=None, alias="plannedStartDate")
    planned_end_date: Optional[date] = Field(default=None, alias="plannedEndDate")
    finish_materials_due_date: Optional[date] = Field(default=None, alias="finishMaterialsDueDate")
    finish_materials_note: Optional[str] = Field(default=None, alias="finishMaterialsNote")
    material_area_id: Optional[str] = Field(default=None, alias="materialAreaId")
    client_visible: Optional[bool] = Field(default=None, alias="clientVisible")

    model_config = {"populate_by_name": True, "from_attributes": True}


class ProjectStage(ProjectStageBase, TimestampedEntity):
    """Full project stage model with computed fields."""
    project_id: str = Field(alias="projectId")
    created_by: str = Field(alias="createdBy")
    # Computed fields from joins
    material_area_name: Optional[str] = Field(default=None, alias="materialAreaName")
    material_count: int = Field(default=0, alias="materialCount")


# Request Models
class ApplyTemplateRequest(BaseModel):
    """Request model for applying a template to a project."""
    template_id: str = Field(alias="templateId")
    project_id: str = Field(alias="projectId")
    start_date: Optional[date] = Field(default=None, alias="startDate")

    model_config = {"populate_by_name": True, "from_attributes": True}


class ReorderStagesRequest(BaseModel):
    """Request model for reordering stages."""
    stage_ids: List[str] = Field(alias="stageIds")

    model_config = {"populate_by_name": True, "from_attributes": True}
