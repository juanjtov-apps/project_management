"""
Get Tasks tool - Retrieves tasks/punch list items.
"""

from typing import Dict, Any, List
from datetime import date, datetime

from ..base_tool import BaseTool
from ...models.agent_models import SafetyLevel
from src.database.connection import db_manager


class GetTasksTool(BaseTool):
    """Retrieve all tasks for a project with completion status and assignees."""

    @property
    def name(self) -> str:
        return "get_tasks"

    @property
    def description(self) -> str:
        return (
            "Retrieve tasks (punch list items) with completion status and assignees. "
            "Use ONLY when you have a specific project_id. For queries by project NAME, "
            "date-range filtering (this week, overdue, next 7 days), or cross-project "
            "queries, use query_database instead."
        )

    @property
    def input_schema(self) -> Dict[str, Any]:
        return {
            "properties": {
                "project_id": {
                    "type": "string",
                    "description": "The project ID to get tasks for",
                },
                "status_filter": {
                    "type": "string",
                    "description": "Filter by task status",
                    "enum": ["pending", "in-progress", "completed", "blocked", "all"],
                },
                "assignee_id": {
                    "type": "string",
                    "description": "Filter by assigned user ID",
                },
                "priority_filter": {
                    "type": "string",
                    "description": "Filter by priority level",
                    "enum": ["low", "medium", "high", "critical", "all"],
                },
                "due_today": {
                    "type": "boolean",
                    "description": "Only show tasks due today",
                },
                "overdue_only": {
                    "type": "boolean",
                    "description": "Only show overdue tasks",
                },
                "due_in_days": {
                    "type": "integer",
                    "description": "Filter tasks due within the next N days (e.g., 7 for this week, 15 for next two weeks)",
                },
                "due_this_week": {
                    "type": "boolean",
                    "description": "Only show tasks due this week (Monday to Sunday)",
                },
                "due_this_month": {
                    "type": "boolean",
                    "description": "Only show tasks due this month",
                },
            },
            "required": [],
        }

    @property
    def permissions(self) -> List[str]:
        return ["admin", "project_manager", "office_manager", "crew", "subcontractor"]

    @property
    def safety_level(self) -> SafetyLevel:
        return SafetyLevel.READ_ONLY

    async def _get_tasks(
        self,
        company_id: str,
        project_id: str = None,
    ) -> List[Dict[str, Any]]:
        """Get tasks from database as dicts."""
        if project_id:
            query = """
                SELECT * FROM tasks
                WHERE project_id = $1
                ORDER BY created_at DESC
            """
            rows = await db_manager.execute_query(query, project_id)
        else:
            query = """
                SELECT * FROM tasks
                WHERE company_id = $1
                ORDER BY created_at DESC
            """
            rows = await db_manager.execute_query(query, company_id)

        return [dict(row) for row in rows]

    async def execute(
        self,
        params: Dict[str, Any],
        context: Dict[str, Any],
    ) -> Dict[str, Any]:
        """Execute the get_tasks tool."""
        company_id = context.get("company_id")
        project_id = params.get("project_id")

        # Verify project belongs to user's company
        if project_id:
            from ..security import verify_project_access
            if not await verify_project_access(project_id, company_id):
                return {
                    "error": "Project not found or access denied",
                    "projectId": project_id,
                    "tasks": [],
                    "summary": {},
                }

        # Get tasks as dicts
        tasks = await self._get_tasks(company_id, project_id)

        # Apply filters (note: database returns snake_case keys)
        status_filter = params.get("status_filter")
        if status_filter and status_filter != "all":
            tasks = [t for t in tasks if t.get("status") == status_filter]

        assignee_id = params.get("assignee_id")
        if assignee_id:
            tasks = [t for t in tasks if t.get("assignee_id") == assignee_id]

        priority_filter = params.get("priority_filter")
        if priority_filter and priority_filter != "all":
            tasks = [t for t in tasks if t.get("priority") == priority_filter]

        # Date filters
        from datetime import timedelta

        if params.get("due_today"):
            today = date.today()
            tasks = [
                t for t in tasks
                if t.get("due_date") and self._parse_date(t["due_date"]) == today
            ]

        if params.get("overdue_only"):
            today = date.today()
            tasks = [
                t for t in tasks
                if (
                    t.get("due_date")
                    and self._parse_date(t["due_date"]) < today
                    and t.get("status") != "completed"
                )
            ]

        if params.get("due_in_days"):
            today = date.today()
            end_date = today + timedelta(days=params["due_in_days"])
            tasks = [
                t for t in tasks
                if (
                    t.get("due_date")
                    and today <= self._parse_date(t["due_date"]) <= end_date
                )
            ]

        if params.get("due_this_week"):
            today = date.today()
            # Monday of current week (weekday 0 = Monday)
            monday = today - timedelta(days=today.weekday())
            sunday = monday + timedelta(days=6)
            tasks = [
                t for t in tasks
                if (
                    t.get("due_date")
                    and monday <= self._parse_date(t["due_date"]) <= sunday
                )
            ]

        if params.get("due_this_month"):
            today = date.today()
            first_day = today.replace(day=1)
            # Calculate last day of month
            if today.month == 12:
                last_day = today.replace(year=today.year + 1, month=1, day=1) - timedelta(days=1)
            else:
                last_day = today.replace(month=today.month + 1, day=1) - timedelta(days=1)
            tasks = [
                t for t in tasks
                if (
                    t.get("due_date")
                    and first_day <= self._parse_date(t["due_date"]) <= last_day
                )
            ]

        # Calculate summary from all tasks (before filtering)
        all_tasks = await self._get_tasks(company_id, project_id)
        summary = {
            "totalTasks": len(all_tasks),
            "pending": sum(1 for t in all_tasks if t.get("status") == "pending"),
            "inProgress": sum(1 for t in all_tasks if t.get("status") == "in-progress"),
            "completed": sum(1 for t in all_tasks if t.get("status") == "completed"),
            "blocked": sum(1 for t in all_tasks if t.get("status") == "blocked"),
        }

        # Simplify task output (convert snake_case to camelCase for frontend)
        simplified_tasks = []
        for t in tasks[:50]:  # Limit to 50
            simplified_tasks.append({
                "id": t.get("id"),
                "title": t.get("title"),
                "description": t.get("description"),
                "status": t.get("status"),
                "priority": t.get("priority"),
                "assigneeId": t.get("assignee_id"),
                "dueDate": str(t.get("due_date")) if t.get("due_date") else None,
                "isMilestone": t.get("is_milestone", False),
                "category": t.get("category"),
            })

        return {
            "projectId": project_id,
            "tasks": simplified_tasks,
            "summary": summary,
            "filters": {
                "status": status_filter,
                "assignee": assignee_id,
                "priority": priority_filter,
            },
        }

    def _parse_date(self, date_value) -> date:
        """Parse a date value to date object."""
        from datetime import date, datetime

        if isinstance(date_value, date):
            return date_value
        if isinstance(date_value, datetime):
            return date_value.date()
        if isinstance(date_value, str):
            return datetime.fromisoformat(date_value.replace("Z", "+00:00")).date()
        return None
