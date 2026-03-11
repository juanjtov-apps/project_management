"""
Create Task tool — Creates a new task in a project.
Safety: REQUIRES_CONFIRMATION (user must approve before execution).
"""

from typing import Dict, Any, List
from datetime import datetime

from ..base_tool import BaseTool
from ..security import resolve_project_or_error
from ...models.agent_models import SafetyLevel
from src.database.connection import db_manager


class CreateTaskTool(BaseTool):
    """Create a new task (punch list item) in a project."""

    @property
    def name(self) -> str:
        return "create_task"

    @property
    def description(self) -> str:
        return (
            "Create a new task in a project. Requires project_id and title at minimum. "
            "Use this when the user asks to add a task, create a punch list item, or "
            "assign work to someone."
        )

    @property
    def input_schema(self) -> Dict[str, Any]:
        return {
            "properties": {
                "project_id": {
                    "type": "string",
                    "description": "The project ID (UUID) or project name",
                },
                "title": {
                    "type": "string",
                    "description": "Task title (clear, actionable description)",
                },
                "description": {
                    "type": "string",
                    "description": "Detailed task description (optional)",
                },
                "priority": {
                    "type": "string",
                    "description": "Task priority level",
                    "enum": ["low", "medium", "high", "critical"],
                },
                "status": {
                    "type": "string",
                    "description": "Initial task status",
                    "enum": ["pending", "in-progress"],
                },
                "due_date": {
                    "type": "string",
                    "description": "Due date in ISO 8601 format (YYYY-MM-DD)",
                },
                "assignee_id": {
                    "type": "string",
                    "description": "User ID to assign the task to",
                },
                "category": {
                    "type": "string",
                    "description": "Task category",
                    "enum": ["project", "administrative", "general", "subcontractor"],
                },
                "is_milestone": {
                    "type": "boolean",
                    "description": "Whether this is a milestone task",
                },
            },
            "required": ["project_id", "title"],
        }

    @property
    def permissions(self) -> List[str]:
        return ["admin", "project_manager"]

    @property
    def safety_level(self) -> SafetyLevel:
        return SafetyLevel.REQUIRES_CONFIRMATION

    async def execute(
        self,
        params: Dict[str, Any],
        context: Dict[str, Any],
    ) -> Dict[str, Any]:
        company_id = context.get("company_id")
        title = params["title"]

        # Resolve project by UUID or name
        verify, err = await resolve_project_or_error(params["project_id"], company_id)
        if err:
            return err
        project_id = str(verify["id"])

        # Build INSERT
        query = """
            INSERT INTO tasks (company_id, project_id, title, description, category,
                               status, priority, due_date, assignee_id, is_milestone)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
            RETURNING id, title, status, priority, due_date
        """
        due_date = None
        if params.get("due_date"):
            try:
                due_date = datetime.fromisoformat(params["due_date"])
            except ValueError:
                return {"error": f"Invalid date format: {params['due_date']}. Use YYYY-MM-DD."}

        row = await db_manager.execute_one(
            query,
            company_id,
            project_id,
            title,
            params.get("description"),
            params.get("category", "project"),
            params.get("status", "pending"),
            params.get("priority", "medium"),
            due_date,
            params.get("assignee_id"),
            params.get("is_milestone", False),
        )

        return {
            "success": True,
            "task": {
                "id": str(row["id"]),
                "title": row["title"],
                "status": row["status"],
                "priority": row["priority"],
                "dueDate": str(row["due_date"]) if row["due_date"] else None,
                "projectName": verify["name"],
            },
            "message": f"Task '{title}' created in {verify['name']}",
            "suggested_actions": [
                {"label": "Go to Tasks", "navigateTo": "/work"},
                {"label": "Create Another", "prompt": "Create another task for this project"},
            ],
        }
