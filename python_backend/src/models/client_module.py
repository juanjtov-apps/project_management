from datetime import datetime
from enum import Enum
from typing import List, Optional
from pydantic import BaseModel, Field, validator
from .base import BaseEntity


class IssueStatus(str, Enum):
    """Status for issues reported by a client."""
    open = "open"
    closed = "closed"


class IssueBase(BaseModel):
    """Shared attributes for a client reported issue."""
    project_id: str = Field(alias="projectId")
    title: str
    description: str = ""
    photos: List[str] = []

    @validator("photos")
    def limit_photos(cls, v: List[str]) -> List[str]:
        if len(v) > 3:
            raise ValueError("A maximum of three photos is allowed")
        return v


class IssueCreate(IssueBase):
    """Model used when a client creates a new issue."""
    created_by: str = Field(alias="createdBy")


class Issue(IssueBase, BaseEntity):
    """Full representation of an issue."""
    created_by: str = Field(alias="createdBy")
    status: IssueStatus = IssueStatus.open


class ForumMessage(BaseEntity):
    """Messages exchanged between clients and project managers."""
    project_id: str = Field(alias="projectId")
    author_id: str = Field(alias="authorId")
    content: str


class MaterialCategory(str, Enum):
    """Categories for organizing materials by space/type."""
    bathrooms = "bathrooms"
    kitchen = "kitchen"
    bedrooms = "bedrooms"
    living_rooms = "living_rooms"
    exterior = "exterior"
    flooring = "flooring"
    electrical = "electrical"
    plumbing = "plumbing"
    hvac = "hvac"
    general = "general"


class MaterialItem(BaseEntity):
    """Item within the collaborative material list."""
    project_id: str = Field(alias="projectId")
    name: str
    category: MaterialCategory = Field(default=MaterialCategory.general)
    link: Optional[str] = None
    specification: Optional[str] = None
    notes: Optional[str] = None
    quantity: Optional[str] = None
    unit_cost: Optional[float] = Field(default=None, alias="unitCost")
    total_cost: Optional[float] = Field(default=None, alias="totalCost")
    supplier: Optional[str] = None
    status: Optional[str] = Field(default="pending")
    added_by: str = Field(alias="addedBy")


class Installment(BaseEntity):
    """Represents a payment installment for a project."""
    project_id: str = Field(alias="projectId")
    amount: float
    due_date: datetime = Field(alias="dueDate")
    is_paid: bool = Field(default=False, alias="isPaid")
    payment_method: Optional[str] = Field(default=None, alias="paymentMethod")


class FrequencyUnit(str, Enum):
    day = "day"
    week = "week"
    month = "month"


class NotificationSetting(BaseEntity):
    """Notification preferences for material items."""
    project_id: str = Field(alias="projectId")
    material_id: Optional[str] = Field(default=None, alias="materialId")
    group_name: Optional[str] = Field(default=None, alias="groupName")
    frequency_value: int = Field(alias="frequencyValue")
    frequency_unit: FrequencyUnit = Field(alias="frequencyUnit")
    notify_via_email: bool = Field(default=True, alias="notifyViaEmail")


__all__ = [
    "IssueStatus",
    "IssueBase",
    "IssueCreate",
    "Issue",
    "ForumMessage",
    "MaterialCategory",
    "MaterialItem",
    "Installment",
    "FrequencyUnit",
    "NotificationSetting",
]
