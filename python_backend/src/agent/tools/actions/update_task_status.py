"""
Update Task Status tool — Changes the status of an existing task.
Safety: AUDIT_LOGGED (executes immediately, logged for audit trail).
"""

import asyncio
from typing import Dict, Any, List
from datetime import datetime

from ..base_tool import BaseTool
from ...models.agent_models import SafetyLevel
from src.database.connection import db_manager
from src.services.insight_service import regenerate_project_insight


class UpdateTaskStatusTool(BaseTool):
    """Update the status of an existing task."""

    @property
    def name(self) -> str:
        return "update_task_status"

    @property
    def description(self) -> str:
        return (
            "Update a task's status. Use when the user says a task is done, blocked, "
            "started, etc. Can also update priority. Requires the task_id."
        )

    @property
    def input_schema(self) -> Dict[str, Any]:
        return {
            "properties": {
                "task_id": {
                    "type": "string",
                    "description": "The task ID to update",
                },
                "status": {
                    "type": "string",
                    "description": "New status for the task",
                    "enum": ["pending", "in-progress", "completed", "blocked"],
                },
                "priority": {
                    "type": "string",
                    "description": "New priority (optional, only if changing)",
                    "enum": ["low", "medium", "high", "critical"],
                },
            },
            "required": ["task_id", "status"],
        }

    @property
    def permissions(self) -> List[str]:
        return ["admin", "project_manager", "office_manager", "crew"]

    @property
    def safety_level(self) -> SafetyLevel:
        return SafetyLevel.AUDIT_LOGGED

    async def execute(
        self,
        params: Dict[str, Any],
        context: Dict[str, Any],
    ) -> Dict[str, Any]:
        company_id = context.get("company_id")
        task_id = params["task_id"]
        new_status = params["status"]

        # Verify task belongs to company
        task = await db_manager.execute_one(
            "SELECT id, title, status, project_id FROM tasks WHERE id = $1 AND company_id = $2",
            task_id, company_id,
        )
        if not task:
            return {"error": "Task not found or access denied"}

        old_status = task["status"]

        # Build update
        set_clauses = ["status = $3", "updated_at = NOW()"]
        args: list = [task_id, company_id, new_status]
        idx = 4

        # Set completed_at when marking as completed
        if new_status == "completed":
            set_clauses.append(f"completed_at = ${idx}")
            args.append(datetime.utcnow())
            idx += 1
        elif old_status == "completed" and new_status != "completed":
            set_clauses.append("completed_at = NULL")

        if params.get("priority"):
            set_clauses.append(f"priority = ${idx}")
            args.append(params["priority"])
            idx += 1

        query = f"""
            UPDATE tasks SET {', '.join(set_clauses)}
            WHERE id = $1 AND company_id = $2
            RETURNING id, title, status, priority
        """
        row = await db_manager.execute_one(query, *args)

        # Refresh project insight in background
        if task.get("project_id"):
            asyncio.create_task(regenerate_project_insight(str(task["project_id"])))

        return {
            "success": True,
            "task": {
                "id": row["id"],
                "title": row["title"],
                "oldStatus": old_status,
                "newStatus": row["status"],
                "priority": row["priority"],
            },
            "message": f"Task '{row['title']}' updated: {old_status} → {new_status}",
            "suggested_actions": [
                {"label": "Go to Tasks", "navigateTo": "/work"},
            ],
        }
