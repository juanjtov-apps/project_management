"""
Create Daily Log tool — Creates a project log entry.
Safety: AUDIT_LOGGED (executes immediately, logged for audit trail).
"""

from typing import Dict, Any, List

from ..base_tool import BaseTool
from ...models.agent_models import SafetyLevel
from src.database.connection import db_manager


class CreateDailyLogTool(BaseTool):
    """Create a daily log entry for a project."""

    @property
    def name(self) -> str:
        return "create_daily_log"

    @property
    def description(self) -> str:
        return (
            "Create a project log entry (daily log, issue report, milestone note, "
            "or safety report). Use when the user wants to log something for a project."
        )

    @property
    def input_schema(self) -> Dict[str, Any]:
        return {
            "properties": {
                "project_id": {
                    "type": "string",
                    "description": "The project ID to create the log for",
                },
                "title": {
                    "type": "string",
                    "description": "Log entry title",
                },
                "content": {
                    "type": "string",
                    "description": "Log entry content/body",
                },
                "type": {
                    "type": "string",
                    "description": "Log type",
                    "enum": ["general", "issue", "milestone", "safety"],
                },
            },
            "required": ["project_id", "title", "content"],
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
        user_id = context.get("user_id")
        project_id = params["project_id"]

        # Verify project belongs to company
        project = await db_manager.execute_one(
            "SELECT id, name FROM projects WHERE id = $1 AND company_id = $2",
            project_id, company_id,
        )
        if not project:
            return {"error": "Project not found or access denied"}

        query = """
            INSERT INTO project_logs (project_id, user_id, title, content, type)
            VALUES ($1, $2, $3, $4, $5)
            RETURNING id, title, type, created_at
        """
        row = await db_manager.execute_one(
            query,
            project_id,
            user_id,
            params["title"],
            params["content"],
            params.get("type", "general"),
        )

        return {
            "success": True,
            "log": {
                "id": row["id"],
                "title": row["title"],
                "type": row["type"],
                "createdAt": str(row["created_at"]),
                "projectName": project["name"],
            },
            "message": f"Log '{row['title']}' created for {project['name']}",
        }
