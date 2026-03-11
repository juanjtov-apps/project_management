"""
Update Project Status tool — Changes status, progress, or due date of a project.
Safety: REQUIRES_CONFIRMATION (project-level changes need user approval).
"""

import asyncio
from datetime import datetime
from typing import Dict, Any, List

from ..base_tool import BaseTool
from ..security import resolve_project_or_error
from ...models.agent_models import SafetyLevel
from src.database.connection import db_manager
from src.services.insight_service import regenerate_project_insight


class UpdateProjectStatusTool(BaseTool):
    """Update a project's status or progress percentage."""

    @property
    def name(self) -> str:
        return "update_project_status"

    @property
    def description(self) -> str:
        return (
            "Update a project's status, progress percentage, or due date. "
            "Use when the user wants to change project state or timeline."
        )

    @property
    def input_schema(self) -> Dict[str, Any]:
        return {
            "properties": {
                "project_id": {
                    "type": "string",
                    "description": "The project ID (UUID) or project name",
                },
                "status": {
                    "type": "string",
                    "description": "New project status",
                    "enum": ["active", "completed", "on-hold", "delayed"],
                },
                "progress": {
                    "type": "integer",
                    "description": "New progress percentage (0-100)",
                },
                "due_date": {
                    "type": "string",
                    "description": "New project due date (YYYY-MM-DD)",
                },
            },
            "required": ["project_id"],
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

        # Resolve project by UUID or name
        project, err = await resolve_project_or_error(
            params["project_id"], company_id, extra_columns="status, progress"
        )
        if err:
            return err
        project_id = str(project["id"])

        if not params.get("status") and params.get("progress") is None and not params.get("due_date"):
            return {"error": "Must provide at least status, progress, or due_date to update"}

        old_status = project["status"]
        old_progress = project["progress"]

        set_clauses = ["updated_at = NOW()"]
        args: list = [project_id, company_id]
        idx = 3

        if params.get("status"):
            set_clauses.append(f"status = ${idx}")
            args.append(params["status"])
            idx += 1

        if params.get("progress") is not None:
            progress = max(0, min(100, params["progress"]))
            set_clauses.append(f"progress = ${idx}")
            args.append(progress)
            idx += 1

        parsed_due_date = None
        if params.get("due_date"):
            try:
                parsed_due_date = datetime.fromisoformat(params["due_date"]).date()
            except ValueError:
                return {"error": "Invalid due_date format. Use YYYY-MM-DD."}
            set_clauses.append(f"due_date = ${idx}")
            args.append(parsed_due_date)
            idx += 1

        query = f"""
            UPDATE projects SET {', '.join(set_clauses)}
            WHERE id = $1 AND company_id = $2
            RETURNING id, name, status, progress, due_date
        """
        row = await db_manager.execute_one(query, *args)

        changes = []
        if params.get("status") and params["status"] != old_status:
            changes.append(f"status: {old_status} → {row['status']}")
        if params.get("progress") is not None and params["progress"] != old_progress:
            changes.append(f"progress: {old_progress}% → {row['progress']}%")
        if parsed_due_date:
            changes.append(f"due date → {parsed_due_date}")

        # Refresh insight in background
        asyncio.create_task(regenerate_project_insight(project_id))

        return {
            "success": True,
            "project": {
                "id": row["id"],
                "name": row["name"],
                "status": row["status"],
                "progress": row["progress"],
            },
            "changes": changes,
            "message": f"Project '{row['name']}' updated: {', '.join(changes)}",
            "suggested_actions": [
                {"label": "View Project", "navigateTo": "/work"},
            ],
        }
