"""
Step 10 — Dashboard API Schema.

FastAPI endpoint definitions and Pydantic response models for the
Agent Health Dashboard. These are spec-only — not wired into the app.
"""

from datetime import datetime
from typing import Dict, List, Literal, Optional

from pydantic import BaseModel, Field


# =============================================================================
# Response Models
# =============================================================================


class KPIMetrics(BaseModel):
    """Aggregated KPI metrics for a time window."""
    success_rate: float = Field(description="% of interactions with successful tool execution")
    confirm_accept_rate: float = Field(description="% of confirmations approved")
    avg_latency_ms: float = Field(description="P50 total response time in ms")
    followup_rate: float = Field(description="% of interactions with clarifying questions")
    error_rate: float = Field(description="% of interactions with errors")
    cost_per_interaction: float = Field(description="Average estimated cost per interaction")
    total_interactions: int = Field(description="Total interaction count in window")
    window: str = Field(description="Time window: 24h, 7d, or 30d")


class TierDistribution(BaseModel):
    """Query distribution across model tiers."""
    tier: str = Field(description="Model tier name")
    count: int
    percentage: float
    avg_latency_ms: float
    error_rate: float
    estimated_cost: float


class MisrouteEntry(BaseModel):
    """A detected misroute event."""
    timestamp: datetime
    prompt_preview: str = Field(max_length=100)
    model_used: str
    expected_tier: Optional[str]
    failure_signal: str = Field(description="What indicated misroute: retry, error, low judge score")


class RouterMetrics(BaseModel):
    """Router performance metrics."""
    distribution: List[TierDistribution]
    daily_cost: List[Dict[str, float]]  # [{date, specialist_cost, planner_cost}]
    recent_misroutes: List[MisrouteEntry]
    window: str


class ToolMetricCell(BaseModel):
    """Single cell in the tool heatmap."""
    success_rate: float
    rejection_rate: float
    edit_rate: float
    error_rate: float
    total_calls: int


class EditedParam(BaseModel):
    """A frequently edited parameter."""
    tool_name: str
    param_name: str
    edit_count: int
    edit_percentage: float


class ToolHeatmapData(BaseModel):
    """Tool performance heatmap data."""
    tools: Dict[str, ToolMetricCell]
    top_edited_params: List[EditedParam]
    window: str


class InteractionEntry(BaseModel):
    """Single agent interaction for the timeline."""
    id: str
    timestamp: datetime
    prompt_preview: str = Field(max_length=100)
    tools_called: List[str]
    model_used: str
    success: bool
    latency_ms: int
    is_retry: bool = False
    user_id: str
    conversation_id: str


class InteractionList(BaseModel):
    """Paginated interaction list."""
    interactions: List[InteractionEntry]
    total: int
    limit: int
    offset: int


# =============================================================================
# Endpoint Definitions (spec only — not wired into app)
# =============================================================================

"""
Endpoint: GET /api/v1/admin/agent-metrics
Auth: Root user only
Query params: window (24h|7d|30d)
Response: KPIMetrics

Endpoint: GET /api/v1/admin/router-metrics
Auth: Root user only
Query params: window (7d|30d)
Response: RouterMetrics

Endpoint: GET /api/v1/admin/tool-heatmap
Auth: Root user only
Query params: window (7d|30d)
Response: ToolHeatmapData

Endpoint: GET /api/v1/admin/agent-interactions
Auth: Root user only
Query params: limit (default 50), offset (default 0)
Response: InteractionList
"""


# Example FastAPI route signatures (not implemented):
#
# @router.get("/admin/agent-metrics", response_model=KPIMetrics)
# async def get_agent_metrics(
#     window: Literal["24h", "7d", "30d"] = "24h",
#     current_user: dict = Depends(require_root_user),
# ):
#     ...
#
# @router.get("/admin/router-metrics", response_model=RouterMetrics)
# async def get_router_metrics(
#     window: Literal["7d", "30d"] = "7d",
#     current_user: dict = Depends(require_root_user),
# ):
#     ...
#
# @router.get("/admin/tool-heatmap", response_model=ToolHeatmapData)
# async def get_tool_heatmap(
#     window: Literal["7d", "30d"] = "7d",
#     current_user: dict = Depends(require_root_user),
# ):
#     ...
#
# @router.get("/admin/agent-interactions", response_model=InteractionList)
# async def get_agent_interactions(
#     limit: int = 50,
#     offset: int = 0,
#     current_user: dict = Depends(require_root_user),
# ):
#     ...
