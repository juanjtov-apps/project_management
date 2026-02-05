"""
Agent Pydantic models for request/response validation.
"""

from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from enum import Enum
from datetime import datetime


class SafetyLevel(str, Enum):
    """Safety levels for tool operations."""
    READ_ONLY = "read_only"
    AUDIT_LOGGED = "audit_logged"
    REQUIRES_REVIEW = "requires_review"
    REQUIRES_CONFIRMATION = "requires_confirmation"
    PROHIBITED = "prohibited"


class MessageRole(str, Enum):
    """Roles for conversation messages."""
    USER = "user"
    ASSISTANT = "assistant"
    SYSTEM = "system"


class ExecutionStatus(str, Enum):
    """Status of tool execution."""
    PENDING = "pending"
    EXECUTING = "executing"
    SUCCESS = "success"
    FAILED = "failed"
    CANCELLED = "cancelled"
    CONFIRMED = "confirmed"
    REJECTED = "rejected"


class ConfirmationStatus(str, Enum):
    """Status of confirmation requests."""
    PENDING = "pending"
    CONFIRMED = "confirmed"
    REJECTED = "rejected"
    EXPIRED = "expired"


# Request Models

class ChatRequest(BaseModel):
    """Request model for chat endpoint."""
    conversation_id: Optional[str] = Field(
        None,
        description="Existing conversation ID. If null, creates a new conversation."
    )
    project_id: Optional[str] = Field(
        None,
        description="Optional project context for the conversation."
    )
    message: str = Field(
        ...,
        min_length=1,
        description="The user's message to the agent."
    )
    attachments: Optional[List[str]] = Field(
        None,
        description="Optional file paths for photos or documents."
    )


class ConfirmationRequest(BaseModel):
    """Request model for confirming/rejecting operations."""
    confirmation_id: str = Field(
        ...,
        description="The ID of the pending confirmation."
    )
    action: str = Field(
        ...,
        pattern="^(confirm|reject)$",
        description="Action to take: 'confirm' or 'reject'."
    )
    notes: Optional[str] = Field(
        None,
        description="Optional notes for the action."
    )


# Response Models

class ToolCallResponse(BaseModel):
    """Response model for tool call details."""
    id: str
    tool_name: str
    tool_input: Dict[str, Any]
    tool_output: Optional[Dict[str, Any]] = None
    safety_level: SafetyLevel
    execution_status: ExecutionStatus
    execution_time_ms: Optional[int] = None
    error_message: Optional[str] = None


class MessageResponse(BaseModel):
    """Response model for a single message."""
    id: str
    role: MessageRole
    content: str
    tool_calls: Optional[List[ToolCallResponse]] = None
    model_used: Optional[str] = None
    token_count: Optional[int] = None
    latency_ms: Optional[int] = None
    created_at: datetime

    model_config = {"from_attributes": True, "protected_namespaces": ()}


class ConversationResponse(BaseModel):
    """Response model for conversation details."""
    id: str
    user_id: str
    company_id: str
    project_id: Optional[str] = None
    title: Optional[str] = None
    status: str
    created_at: datetime
    updated_at: datetime
    messages: Optional[List[MessageResponse]] = None

    class Config:
        from_attributes = True


class PendingConfirmationResponse(BaseModel):
    """Response model for pending confirmation."""
    id: str
    tool_name: str
    operation_summary: str
    impact_assessment: Optional[str] = None
    expires_at: datetime
    status: ConfirmationStatus


class ChatResponse(BaseModel):
    """Response model for chat endpoint (non-streaming)."""
    conversation_id: str
    message_id: str
    content: str
    tool_calls: Optional[List[ToolCallResponse]] = None
    pending_confirmations: Optional[List[PendingConfirmationResponse]] = None


# Tool Definition Models

class ToolDefinition(BaseModel):
    """Definition of an agent tool for the LLM."""
    name: str = Field(..., description="Unique tool identifier.")
    description: str = Field(..., description="What the tool does.")
    input_schema: Dict[str, Any] = Field(
        ...,
        description="JSON Schema for tool input parameters."
    )
    permissions: List[str] = Field(
        ...,
        description="List of roles that can use this tool."
    )
    safety_level: SafetyLevel = Field(
        ...,
        description="Safety level for this tool."
    )


# SSE Event Models

class SSEEvent(BaseModel):
    """Base model for Server-Sent Events."""
    type: str
    data: Dict[str, Any]


class ContentEvent(SSEEvent):
    """SSE event for text content."""
    type: str = "content"
    data: Dict[str, str]  # {"content": "..."}


class ToolStartEvent(SSEEvent):
    """SSE event for tool execution start."""
    type: str = "tool_start"
    data: Dict[str, str]  # {"tool": "tool_name"}


class ToolResultEvent(SSEEvent):
    """SSE event for tool execution result."""
    type: str = "tool_result"
    data: Dict[str, Any]  # {"tool": "...", "result": {...}}


class ConfirmationRequiredEvent(SSEEvent):
    """SSE event for confirmation required."""
    type: str = "confirmation_required"
    data: Dict[str, Any]  # PendingConfirmationResponse as dict


class ErrorEvent(SSEEvent):
    """SSE event for errors."""
    type: str = "error"
    data: Dict[str, str]  # {"message": "..."}


class DoneEvent(SSEEvent):
    """SSE event for completion."""
    type: str = "done"
    data: Dict[str, str]  # {"conversation_id": "..."}


# Context Models

class UserContext(BaseModel):
    """Context about the current user for agent operations."""
    id: str
    email: str
    company_id: str
    role: str
    role_name: str
    permissions: List[str]
    is_root: bool = False
    assigned_project_id: Optional[str] = None

    class Config:
        from_attributes = True


class ProjectContext(BaseModel):
    """Context about a project for agent operations."""
    id: str
    name: str
    status: str
    current_stage: Optional[str] = None
    company_id: str

    class Config:
        from_attributes = True
