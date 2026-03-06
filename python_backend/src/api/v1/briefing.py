"""
Morning briefing API endpoint.
Aggregates project stats, tasks due today, at-risk items into a briefing format.
"""

import logging
from datetime import datetime, date
from typing import Dict, Any, List

from fastapi import APIRouter, Depends, HTTPException
from src.api.auth import get_current_user_dependency, get_effective_company_id, is_root_admin
from src.database.connection import db_manager

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/briefing", tags=["briefing"])


def _get_greeting() -> str:
    """Return time-of-day greeting."""
    hour = datetime.now().hour
    if hour < 12:
        return "Good morning"
    elif hour < 17:
        return "Good afternoon"
    else:
        return "Good evening"


@router.get("/morning")
async def get_morning_briefing(
    current_user: Dict[str, Any] = Depends(get_current_user_dependency),
):
    """Get the morning briefing with project stats and insights."""
    if not current_user:
        raise HTTPException(status_code=401, detail="Not authenticated")

    effective_company_id = get_effective_company_id(current_user)
    user_name = current_user.get("firstName") or current_user.get("first_name") or "there"
    today = date.today()

    try:
        # Active projects
        if effective_company_id:
            projects_query = """
                SELECT id, name, status, progress, ai_insight_text
                FROM projects
                WHERE company_id = $1 AND status != 'completed'
            """
            projects = await db_manager.execute_query(projects_query, str(effective_company_id))
        else:
            projects_query = """
                SELECT id, name, status, progress, ai_insight_text
                FROM projects WHERE status != 'completed'
            """
            projects = await db_manager.execute_query(projects_query)

        active_count = len(projects)
        at_risk_count = sum(1 for p in projects if p.get("status") in ("delayed", "on-hold"))
        project_ids = [str(p["id"]) for p in projects]

        # Tasks due today
        tasks_due_today = 0
        overdue_tasks = 0
        if project_ids:
            placeholders = ", ".join(f"${i+1}" for i in range(len(project_ids)))
            today_idx = len(project_ids) + 1

            tasks_query = f"""
                SELECT
                    COUNT(*) FILTER (WHERE due_date::date = ${today_idx}::date AND status != 'completed') as due_today,
                    COUNT(*) FILTER (WHERE due_date::date < ${today_idx}::date AND status NOT IN ('completed', 'blocked')) as overdue
                FROM tasks
                WHERE project_id IN ({placeholders})
            """
            tasks_row = await db_manager.execute_one(tasks_query, *project_ids, today)
            if tasks_row:
                tasks_due_today = tasks_row.get("due_today", 0) or 0
                overdue_tasks = tasks_row.get("overdue", 0) or 0

        # Open issues count
        open_issues = 0
        if project_ids:
            placeholders = ", ".join(f"${i+1}" for i in range(len(project_ids)))
            issues_query = f"""
                SELECT COUNT(*) as count
                FROM client_portal.issues
                WHERE project_id IN ({placeholders}) AND status != 'closed'
            """
            try:
                issues_row = await db_manager.execute_one(issues_query, *project_ids)
                open_issues = issues_row.get("count", 0) if issues_row else 0
            except Exception:
                # client_portal schema may not exist for all companies
                pass

        # Build headline
        headline_parts = []
        if overdue_tasks > 0:
            headline_parts.append(f"<hl>{overdue_tasks} overdue task{'s' if overdue_tasks != 1 else ''}</hl> need attention")
        if at_risk_count > 0:
            headline_parts.append(f"<hl>{at_risk_count} project{'s' if at_risk_count != 1 else ''}</hl> at risk")
        if tasks_due_today > 0:
            headline_parts.append(f"<hl>{tasks_due_today} task{'s' if tasks_due_today != 1 else ''}</hl> due today")

        if not headline_parts:
            headline = f"All <hl>{active_count} projects</hl> running on track. A clean day ahead."
        else:
            headline = ". ".join(headline_parts) + "."

        # Build insight chips
        insights: List[Dict[str, str]] = []
        if overdue_tasks > 0:
            insights.append({
                "text": f"Review {overdue_tasks} overdue",
                "prompt": "Show me all overdue tasks across my projects",
                "variant": "active",
            })
        if at_risk_count > 0:
            insights.append({
                "text": f"{at_risk_count} at risk",
                "prompt": "Which projects are at risk and why?",
                "variant": "active",
            })
        if tasks_due_today > 0:
            insights.append({
                "text": f"Today's {tasks_due_today} tasks",
                "prompt": "What tasks are due today?",
                "variant": "muted",
            })
        if open_issues > 0:
            insights.append({
                "text": f"{open_issues} open issues",
                "prompt": "Show me all open issues across my projects",
                "variant": "muted",
            })

        # Always add a general insight
        if len(insights) < 2:
            insights.append({
                "text": "Project overview",
                "prompt": "Give me a status summary of all my active projects",
                "variant": "muted",
            })

        # Gather per-project AI insights
        project_insights = []
        for p in projects:
            ai_text = p.get("ai_insight_text")
            if ai_text:
                project_insights.append({
                    "projectId": str(p["id"]),
                    "projectName": p["name"],
                    "insight": ai_text,
                })

        return {
            "greeting": _get_greeting(),
            "userName": user_name,
            "timestamp": datetime.now().isoformat(),
            "headline": headline,
            "stats": {
                "activeProjects": active_count,
                "tasksDueToday": tasks_due_today,
                "overdueItems": overdue_tasks,
                "atRiskProjects": at_risk_count,
                "openIssues": open_issues,
            },
            "insights": insights,
            "projectInsights": project_insights,
        }

    except Exception as e:
        logger.exception(f"Error building morning briefing: {e}")
        raise HTTPException(status_code=500, detail="Failed to load briefing")
