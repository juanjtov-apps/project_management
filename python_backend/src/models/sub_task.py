"""Pydantic models for sub tasks, checklists, reviews, milestones, and templates."""

from pydantic import BaseModel, Field, ConfigDict
from typing import Optional, List, Any
from datetime import datetime


# ============================================================================
# SUB TASKS
# ============================================================================

class SubTaskCreate(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    project_id: str = Field(alias="projectId")
    assignment_id: Optional[str] = Field(None, alias="assignmentId")
    assigned_to: Optional[str] = Field(None, alias="assignedTo")
    assigned_user_id: Optional[str] = Field(None, alias="assignedUserId")
    name: str
    description: Optional[str] = None
    instructions: Optional[str] = None
    priority: str = "medium"
    location_tag: Optional[str] = Field(None, alias="locationTag")
    start_date: Optional[datetime] = Field(None, alias="startDate")
    end_date: Optional[datetime] = Field(None, alias="endDate")
    estimated_hours: Optional[float] = Field(None, alias="estimatedHours")


class SubTaskUpdate(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    name: Optional[str] = None
    description: Optional[str] = None
    instructions: Optional[str] = None
    priority: Optional[str] = None
    location_tag: Optional[str] = Field(None, alias="locationTag")
    start_date: Optional[datetime] = Field(None, alias="startDate")
    end_date: Optional[datetime] = Field(None, alias="endDate")
    estimated_hours: Optional[float] = Field(None, alias="estimatedHours")
    actual_hours: Optional[float] = Field(None, alias="actualHours")
    assigned_to: Optional[str] = Field(None, alias="assignedTo")
    assigned_user_id: Optional[str] = Field(None, alias="assignedUserId")


class SubTaskStatusUpdate(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    status: str
    notes: Optional[str] = None


class SubTaskResponse(BaseModel):
    model_config = ConfigDict(populate_by_name=True, from_attributes=True)

    id: str
    project_id: str = Field(alias="projectId")
    assignment_id: Optional[str] = Field(None, alias="assignmentId")
    assigned_to: Optional[str] = Field(None, alias="assignedTo")
    assigned_user_id: Optional[str] = Field(None, alias="assignedUserId")
    name: str
    description: Optional[str] = None
    instructions: Optional[str] = None
    priority: str
    location_tag: Optional[str] = Field(None, alias="locationTag")
    start_date: Optional[datetime] = Field(None, alias="startDate")
    end_date: Optional[datetime] = Field(None, alias="endDate")
    estimated_hours: Optional[float] = Field(None, alias="estimatedHours")
    actual_hours: Optional[float] = Field(None, alias="actualHours")
    status: str
    completed_at: Optional[datetime] = Field(None, alias="completedAt")
    created_by: str = Field(alias="createdBy")
    created_at: datetime = Field(alias="createdAt")
    updated_at: datetime = Field(alias="updatedAt")
    # Joined fields
    subcontractor_name: Optional[str] = Field(None, alias="subcontractorName")
    project_name: Optional[str] = Field(None, alias="projectName")
    checklists: Optional[List[Any]] = None


# ============================================================================
# CHECKLISTS
# ============================================================================

class SubChecklistCreate(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    name: str
    template_id: Optional[str] = Field(None, alias="templateId")
    sort_order: int = 0
    items: Optional[List["SubChecklistItemCreate"]] = None


class SubChecklistResponse(BaseModel):
    model_config = ConfigDict(populate_by_name=True, from_attributes=True)

    id: str
    task_id: str = Field(alias="taskId")
    name: str
    template_id: Optional[str] = Field(None, alias="templateId")
    sort_order: int = Field(alias="sortOrder")
    created_at: datetime = Field(alias="createdAt")
    items: Optional[List["SubChecklistItemResponse"]] = None


# ============================================================================
# CHECKLIST ITEMS
# ============================================================================

class SubChecklistItemCreate(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    description: str
    item_type: str = Field("standard", alias="itemType")
    sort_order: int = Field(0, alias="sortOrder")


class SubChecklistItemUpdate(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    notes: Optional[str] = None


class SubChecklistItemResponse(BaseModel):
    model_config = ConfigDict(populate_by_name=True, from_attributes=True)

    id: str
    checklist_id: str = Field(alias="checklistId")
    description: str
    item_type: str = Field(alias="itemType")
    sort_order: int = Field(alias="sortOrder")
    is_completed: bool = Field(alias="isCompleted")
    completed_by: Optional[str] = Field(None, alias="completedBy")
    completed_at: Optional[datetime] = Field(None, alias="completedAt")
    notes: Optional[str] = None
    documents: Optional[List["SubTaskDocumentResponse"]] = None


# ============================================================================
# DOCUMENTS
# ============================================================================

class SubTaskDocumentCreate(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    file_path: str = Field(alias="filePath")
    file_name: str = Field(alias="fileName")
    mime_type: Optional[str] = Field(None, alias="mimeType")
    file_size: Optional[int] = Field(None, alias="fileSize")


class SubTaskDocumentResponse(BaseModel):
    model_config = ConfigDict(populate_by_name=True, from_attributes=True)

    id: str
    checklist_item_id: str = Field(alias="checklistItemId")
    task_id: str = Field(alias="taskId")
    file_path: str = Field(alias="filePath")
    file_name: str = Field(alias="fileName")
    mime_type: Optional[str] = Field(None, alias="mimeType")
    file_size: Optional[int] = Field(None, alias="fileSize")
    uploaded_by: str = Field(alias="uploadedBy")
    created_at: datetime = Field(alias="createdAt")


# ============================================================================
# REVIEWS
# ============================================================================

class SubTaskReviewCreate(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    decision: str  # approved, rejected, revision_requested
    feedback: Optional[str] = None
    rejection_reason: Optional[str] = Field(None, alias="rejectionReason")


class SubTaskReviewResponse(BaseModel):
    model_config = ConfigDict(populate_by_name=True, from_attributes=True)

    id: str
    task_id: str = Field(alias="taskId")
    reviewer_id: str = Field(alias="reviewerId")
    decision: str
    feedback: Optional[str] = None
    rejection_reason: Optional[str] = Field(None, alias="rejectionReason")
    created_at: datetime = Field(alias="createdAt")
    reviewer_name: Optional[str] = Field(None, alias="reviewerName")


# ============================================================================
# PAYMENT MILESTONES
# ============================================================================

class SubPaymentMilestoneCreate(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    name: str
    description: Optional[str] = None
    amount: float
    retention_pct: float = Field(0, alias="retentionPct")
    milestone_type: str = Field("fixed", alias="milestoneType")
    linked_task_ids: Optional[List[str]] = Field(None, alias="linkedTaskIds")


class SubPaymentMilestoneUpdate(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    name: Optional[str] = None
    description: Optional[str] = None
    amount: Optional[float] = None
    retention_pct: Optional[float] = Field(None, alias="retentionPct")
    milestone_type: Optional[str] = Field(None, alias="milestoneType")
    status: Optional[str] = None
    linked_task_ids: Optional[List[str]] = Field(None, alias="linkedTaskIds")
    paid_amount: Optional[float] = Field(None, alias="paidAmount")


class SubPaymentMilestoneResponse(BaseModel):
    model_config = ConfigDict(populate_by_name=True, from_attributes=True)

    id: str
    assignment_id: str = Field(alias="assignmentId")
    name: str
    description: Optional[str] = None
    amount: float
    retention_pct: float = Field(alias="retentionPct")
    milestone_type: str = Field(alias="milestoneType")
    status: str
    linked_task_ids: Optional[List[str]] = Field(None, alias="linkedTaskIds")
    paid_at: Optional[datetime] = Field(None, alias="paidAt")
    paid_amount: Optional[float] = Field(None, alias="paidAmount")
    created_at: datetime = Field(alias="createdAt")
    updated_at: datetime = Field(alias="updatedAt")


# ============================================================================
# CHECKLIST TEMPLATES
# ============================================================================

class SubChecklistTemplateCreate(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    name: str
    trade_category: Optional[str] = Field(None, alias="tradeCategory")
    items: List[SubChecklistItemCreate] = []


class SubChecklistTemplateUpdate(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    name: Optional[str] = None
    trade_category: Optional[str] = Field(None, alias="tradeCategory")
    items: Optional[List[SubChecklistItemCreate]] = None


class SubChecklistTemplateResponse(BaseModel):
    model_config = ConfigDict(populate_by_name=True, from_attributes=True)

    id: str
    company_id: str = Field(alias="companyId")
    name: str
    trade_category: Optional[str] = Field(None, alias="tradeCategory")
    items: List[Any]
    created_by: str = Field(alias="createdBy")
    created_at: datetime = Field(alias="createdAt")
    updated_at: datetime = Field(alias="updatedAt")


# ============================================================================
# PERFORMANCE SCORES
# ============================================================================

class SubPerformanceScoreResponse(BaseModel):
    model_config = ConfigDict(populate_by_name=True, from_attributes=True)

    id: str
    subcontractor_id: str = Field(alias="subcontractorId")
    project_id: str = Field(alias="projectId")
    timeliness_score: float = Field(alias="timelinessScore")
    quality_score: float = Field(alias="qualityScore")
    documentation_score: float = Field(alias="documentationScore")
    responsiveness_score: float = Field(alias="responsivenessScore")
    safety_score: float = Field(alias="safetyScore")
    composite_score: float = Field(alias="compositeScore")
    tasks_total: int = Field(alias="tasksTotal")
    tasks_on_time: int = Field(alias="tasksOnTime")
    tasks_approved_first_pass: int = Field(alias="tasksApprovedFirstPass")
    calculated_at: datetime = Field(alias="calculatedAt")
    project_name: Optional[str] = Field(None, alias="projectName")
