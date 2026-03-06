"""
Update Project Status tool — Changes status or progress of a project.
Safety: REQUIRES_CONFIRMATION (project-level changes need user approval).
"""

import asyncio
from typing import Dict, Any, List

from ..base_tool import BaseTool
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
            "Update a project's status (active, completed, on-hold, delayed) or "
            "progress percentage. Use when the user wants to change project state."
        )

    @property
    def input_schema(self) -> Dict[str, Any]:
        return {
            "properties": {
                "project_id": {
                    "type": "string",
                    "description": "The project ID to update",
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
        project_id = params["project_id"]

        # Verify project
        project = await db_manager.execute_one(
            "SELECT id, name, status, progress FROM projects WHERE id = $1 AND company_id = $2",
            project_id, company_id,
        )
        if not project:
            return {"error": "Project not found or access denied"}

        if not params.get("status") and params.get("progress") is None:
            return {"error": "Must provide at least status or progress to update"}

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

        query = f"""
            UPDATE projects SET {', '.join(set_clauses)}
            WHERE id = $1 AND company_id = $2
            RETURNING id, name, status, progress
        """
        row = await db_manager.execute_one(query, *args)

        changes = []
        if params.get("status") and params["status"] != old_status:
            changes.append(f"status: {old_status} → {row['status']}")
        if params.get("progress") is not None and params["progress"] != old_progress:
            changes.append(f"progress: {old_progress}% → {row['progress']}%")

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
        }
