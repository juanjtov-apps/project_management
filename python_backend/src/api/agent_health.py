"""
Agent Health Dashboard API Endpoints.

Provides observability metrics for the AI agent — root user only.
"""

from fastapi import APIRouter, Depends, HTTPException, Query
from typing import Literal

from .auth import get_current_user_dependency, is_root_admin
from ..agent.repositories.agent_repository import agent_repo

router = APIRouter(prefix="/admin", tags=["agent-health"])


async def require_root_user(current_user: dict = Depends(get_current_user_dependency)):
    """Dependency: require root admin access."""
    if not is_root_admin(current_user):
        raise HTTPException(403, "Root admin access required")
    return current_user


@router.get("/agent-metrics")
async def get_agent_metrics(
    window: Literal["24h", "7d", "30d"] = "24h",
    current_user: dict = Depends(require_root_user),
):
    """KPI metrics for the agent health dashboard."""
    return await agent_repo.get_kpi_metrics(window)


@router.get("/router-metrics")
async def get_router_metrics(
    window: Literal["7d", "30d"] = "7d",
    current_user: dict = Depends(require_root_user),
):
    """Router performance metrics grouped by tier."""
    return await agent_repo.get_router_metrics(window)


@router.get("/tool-heatmap")
async def get_tool_heatmap(
    window: Literal["7d", "30d"] = "7d",
    current_user: dict = Depends(require_root_user),
):
    """Tool performance heatmap data."""
    return await agent_repo.get_tool_heatmap(window)


@router.get("/agent-interactions")
async def get_agent_interactions(
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    current_user: dict = Depends(require_root_user),
):
    """Recent agent interactions timeline."""
    return await agent_repo.get_recent_interactions(limit, offset)
