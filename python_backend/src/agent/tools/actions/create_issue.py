"""
Create Issue tool — Creates a new issue in the client portal.
Safety: REQUIRES_CONFIRMATION (user must approve before execution).
"""

from typing import Dict, Any, List
from datetime import datetime

from ..base_tool import BaseTool
from ..security import resolve_project_or_error
from ...models.agent_models import SafetyLevel
from src.database.connection import db_manager


class CreateIssueTool(BaseTool):
    """Create a new issue for a project in the client portal."""

    @property
    def name(self) -> str:
        return "create_issue"

    @property
    def description(self) -> str:
        return (
            "Create a new issue or problem report for a project. Use when the user "
            "wants to report a problem, flag a concern, or log an issue on a project."
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
                    "description": "Issue title (clear, descriptive summary)",
                },
                "description": {
                    "type": "string",
                    "description": "Detailed description of the issue (optional)",
                },
                "priority": {
                    "type": "string",
                    "description": "Issue priority level",
                    "enum": ["low", "medium", "high", "critical"],
                },
                "category": {
                    "type": "string",
                    "description": "Issue category (optional)",
                },
                "assigned_to": {
                    "type": "string",
                    "description": "User ID to assign the issue to (optional)",
                },
                "due_date": {
                    "type": "string",
                    "description": "Due date in ISO 8601 format (YYYY-MM-DD)",
                },
            },
            "required": ["project_id", "title"],
        }

    @property
    def permissions(self) -> List[str]:
        return ["admin", "project_manager", "office_manager"]

    @property
    def safety_level(self) -> SafetyLevel:
        return SafetyLevel.REQUIRES_CONFIRMATION

    async def execute(
        self,
        params: Dict[str, Any],
        context: Dict[str, Any],
    ) -> Dict[str, Any]:
        company_id = context.get("company_id")
        user_id = context.get("user_id")
        title = params["title"]

        # Resolve project by UUID or name
        verify, err = await resolve_project_or_error(params["project_id"], company_id)
        if err:
            return err
        project_id = str(verify["id"])

        due_date = None
        if params.get("due_date"):
            try:
                due_date = datetime.fromisoformat(params["due_date"]).date()
            except ValueError:
                return {"error": f"Invalid date format: {params['due_date']}. Use YYYY-MM-DD."}

        query = """
            INSERT INTO client_portal.issues
                (project_id, created_by, title, description, priority, category,
                 assigned_to, due_date, status, visibility)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'open', 'internal')
            RETURNING id, title, priority, status
        """
        row = await db_manager.execute_one(
            query,
            project_id,
            user_id,
            title,
            params.get("description"),
            params.get("priority", "medium"),
            params.get("category"),
            params.get("assigned_to"),
            due_date,
        )

        return {
            "success": True,
            "issue": {
                "id": str(row["id"]),
                "title": row["title"],
                "priority": row["priority"],
                "status": row["status"],
                "projectName": verify["name"],
            },
            "message": f"Issue '{title}' created in {verify['name']}",
            "suggested_actions": [
                {"label": "Go to Issues", "navigateTo": f"/client-portal?projectId={project_id}"},
                {"label": "Create Another", "prompt": "Create another issue for this project"},
            ],
        }
