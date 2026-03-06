"""
Assign Task tool — Assigns or reassigns a task to a user.
Safety: AUDIT_LOGGED (executes immediately, logged for audit trail).
"""

from typing import Dict, Any, List

from ..base_tool import BaseTool
from ...models.agent_models import SafetyLevel
from src.database.connection import db_manager


class AssignTaskTool(BaseTool):
    """Assign or reassign a task to a specific user."""

    @property
    def name(self) -> str:
        return "assign_task"

    @property
    def description(self) -> str:
        return (
            "Assign or reassign a task to a team member. Use when the user wants to "
            "assign a task to someone, change who is responsible for a task, or "
            "unassign a task (set assignee_id to null)."
        )

    @property
    def input_schema(self) -> Dict[str, Any]:
        return {
            "properties": {
                "task_id": {
                    "type": "string",
                    "description": "The task ID to assign",
                },
                "assignee_id": {
                    "type": "string",
                    "description": "User ID to assign the task to. Use null or omit to unassign.",
                },
            },
            "required": ["task_id"],
        }

    @property
    def permissions(self) -> List[str]:
        return ["admin", "project_manager"]

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
        assignee_id = params.get("assignee_id")

        # Verify task belongs to company
        task = await db_manager.execute_one(
            "SELECT id, title, assignee_id FROM tasks WHERE id = $1 AND company_id = $2",
            task_id, company_id,
        )
        if not task:
            return {"error": "Task not found or access denied"}

        # If assigning, verify the assignee belongs to the same company
        assignee_name = None
        if assignee_id:
            assignee = await db_manager.execute_one(
                "SELECT id, name FROM users WHERE id = $1 AND company_id = $2",
                assignee_id, company_id,
            )
            if not assignee:
                return {"error": "Assignee not found or not in your company"}
            assignee_name = assignee["name"]

        old_assignee = task["assignee_id"]

        row = await db_manager.execute_one(
            """UPDATE tasks SET assignee_id = $3, updated_at = NOW()
               WHERE id = $1 AND company_id = $2
               RETURNING id, title, assignee_id""",
            task_id, company_id, assignee_id,
        )

        if assignee_id:
            msg = f"Task '{row['title']}' assigned to {assignee_name}"
        else:
            msg = f"Task '{row['title']}' unassigned"

        return {
            "success": True,
            "task": {
                "id": row["id"],
                "title": row["title"],
                "oldAssigneeId": old_assignee,
                "newAssigneeId": row["assignee_id"],
                "assigneeName": assignee_name,
            },
            "message": msg,
        }
