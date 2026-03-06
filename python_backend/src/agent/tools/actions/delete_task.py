"""
Delete Task tool — Deletes a task from a project.
Safety: REQUIRES_CONFIRMATION (destructive operation needs user approval).
"""

from typing import Dict, Any, List

from ..base_tool import BaseTool
from ...models.agent_models import SafetyLevel
from src.database.connection import db_manager


class DeleteTaskTool(BaseTool):
    """Delete a task from a project."""

    @property
    def name(self) -> str:
        return "delete_task"

    @property
    def description(self) -> str:
        return (
            "Delete a task permanently. Use when the user wants to remove a task "
            "that was created by mistake or is no longer needed. This action cannot "
            "be undone."
        )

    @property
    def input_schema(self) -> Dict[str, Any]:
        return {
            "properties": {
                "task_id": {
                    "type": "string",
                    "description": "The task ID to delete",
                },
            },
            "required": ["task_id"],
        }

    @property
    def permissions(self) -> List[str]:
        return ["admin"]

    @property
    def safety_level(self) -> SafetyLevel:
        return SafetyLevel.REQUIRES_CONFIRMATION

    async def execute(
        self,
        params: Dict[str, Any],
        context: Dict[str, Any],
    ) -> Dict[str, Any]:
        company_id = context.get("company_id")
        task_id = params["task_id"]

        # Verify task belongs to company and get details before deletion
        task = await db_manager.execute_one(
            """SELECT t.id, t.title, t.status, p.name as project_name
               FROM tasks t
               JOIN projects p ON p.id = t.project_id
               WHERE t.id = $1 AND t.company_id = $2""",
            task_id, company_id,
        )
        if not task:
            return {"error": "Task not found or access denied"}

        await db_manager.execute_one(
            "DELETE FROM tasks WHERE id = $1 AND company_id = $2 RETURNING id",
            task_id, company_id,
        )

        return {
            "success": True,
            "deleted": {
                "id": task["id"],
                "title": task["title"],
                "status": task["status"],
                "projectName": task["project_name"],
            },
            "message": f"Task '{task['title']}' deleted from {task['project_name']}",
        }
