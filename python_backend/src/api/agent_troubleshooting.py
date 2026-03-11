"""
Agent Troubleshooting API Endpoints.

Provides error tracking, feedback monitoring, and failure analysis — root user only.
"""

from fastapi import APIRouter, Depends, HTTPException, Query
from typing import Optional, Literal

from .auth import get_current_user_dependency, is_root_admin
from ..agent.repositories.agent_repository import agent_repo

router = APIRouter(prefix="/admin", tags=["agent-troubleshooting"])


async def require_root_user(current_user: dict = Depends(get_current_user_dependency)):
    """Dependency: require root admin access."""
    if not is_root_admin(current_user):
        raise HTTPException(403, "Root admin access required")
    return current_user


@router.get("/agent-troubleshooting/summary")
async def get_troubleshooting_summary(
    window: Literal["24h", "7d", "30d"] = "24h",
    current_user: dict = Depends(require_root_user),
):
    """Aggregated troubleshooting summary: error counts, feedback stats, trends."""
    return await agent_repo.get_troubleshooting_summary(window)


@router.get("/agent-troubleshooting/failed-tools")
async def get_failed_tools(
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    tool_name: Optional[str] = Query(None),
    start_date: Optional[str] = Query(None),
    end_date: Optional[str] = Query(None),
    current_user: dict = Depends(require_root_user),
):
    """Paginated list of failed tool calls with user/error details."""
    return await agent_repo.get_failed_tool_calls(
        limit=limit,
        offset=offset,
        tool_name_filter=tool_name,
        start_date=start_date,
        end_date=end_date,
    )


@router.get("/agent-troubleshooting/failed-interactions")
async def get_failed_interactions(
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    start_date: Optional[str] = Query(None),
    end_date: Optional[str] = Query(None),
    current_user: dict = Depends(require_root_user),
):
    """Paginated list of agent interactions that had errors."""
    return await agent_repo.get_failed_interactions(
        limit=limit,
        offset=offset,
        start_date=start_date,
        end_date=end_date,
    )


@router.get("/agent-troubleshooting/feedback")
async def get_all_feedback(
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    is_positive: Optional[bool] = Query(None),
    start_date: Optional[str] = Query(None),
    end_date: Optional[str] = Query(None),
    current_user: dict = Depends(require_root_user),
):
    """Paginated feedback entries with user query, response, and rating."""
    return await agent_repo.get_all_feedback(
        limit=limit,
        offset=offset,
        is_positive_filter=is_positive,
        start_date=start_date,
        end_date=end_date,
    )


@router.get("/agent-troubleshooting/unread-error-count")
async def get_unread_error_count(
    since: Optional[str] = Query(None, description="ISO timestamp of last viewed"),
    current_user: dict = Depends(require_root_user),
):
    """Count of agent errors since a given timestamp (for sidebar badge)."""
    count = await agent_repo.get_unread_error_count(since)
    return {"count": count}
