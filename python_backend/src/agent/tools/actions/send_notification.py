"""
Send Notification tool — Creates in-app notifications for users.
Safety: AUDIT_LOGGED (executes immediately, logged for audit trail).
"""

from typing import Dict, Any, List

from ..base_tool import BaseTool
from ...models.agent_models import SafetyLevel
from src.database.connection import db_manager


class SendNotificationTool(BaseTool):
    """Send in-app notifications to one or more users."""

    @property
    def name(self) -> str:
        return "send_notification"

    @property
    def description(self) -> str:
        return (
            "Send an in-app notification to a user or all users on a project. "
            "Use when the user asks to notify, alert, or message someone about "
            "a project update, deadline, or issue."
        )

    @property
    def input_schema(self) -> Dict[str, Any]:
        return {
            "properties": {
                "title": {
                    "type": "string",
                    "description": "Notification title (short, clear)",
                },
                "message": {
                    "type": "string",
                    "description": "Notification message body",
                },
                "type": {
                    "type": "string",
                    "description": "Notification type",
                    "enum": ["info", "warning", "error", "success"],
                },
                "user_id": {
                    "type": "string",
                    "description": "Specific user ID to notify (mutually exclusive with project_id)",
                },
                "project_id": {
                    "type": "string",
                    "description": "Project ID — notify all assigned users on this project",
                },
            },
            "required": ["title", "message"],
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
        title = params["title"]
        message = params["message"]
        notif_type = params.get("type", "info")
        target_user_id = params.get("user_id")
        project_id = params.get("project_id")

        user_ids: List[str] = []

        if target_user_id:
            # Verify user belongs to same company
            user = await db_manager.execute_one(
                "SELECT id FROM users WHERE id = $1 AND company_id = $2",
                target_user_id, company_id,
            )
            if not user:
                return {"error": "User not found or access denied"}
            user_ids = [target_user_id]

        elif project_id:
            # Verify project and get assigned users
            project = await db_manager.execute_one(
                "SELECT id, name FROM projects WHERE id = $1 AND company_id = $2",
                project_id, company_id,
            )
            if not project:
                return {"error": "Project not found or access denied"}

            # Get users who have tasks on this project
            rows = await db_manager.execute_query(
                """SELECT DISTINCT assignee_id FROM tasks
                   WHERE project_id = $1 AND assignee_id IS NOT NULL""",
                project_id,
            )
            user_ids = [r["assignee_id"] for r in rows]

            if not user_ids:
                return {"error": f"No users assigned to project '{project['name']}'"}

        else:
            return {"error": "Must provide either user_id or project_id"}

        # Insert notifications
        count = 0
        for uid in user_ids:
            await db_manager.execute_one(
                """INSERT INTO notifications (user_id, title, message, type,
                   related_entity_type, related_entity_id)
                   VALUES ($1, $2, $3, $4, $5, $6) RETURNING id""",
                uid, title, message, notif_type,
                "project" if project_id else None,
                project_id,
            )
            count += 1

        return {
            "success": True,
            "notificationsSent": count,
            "recipients": user_ids,
            "message": f"Sent '{title}' notification to {count} user(s)",
        }
