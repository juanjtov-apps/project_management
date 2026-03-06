"""
Create Stage tool — Creates a new project stage.
Safety: REQUIRES_CONFIRMATION (project structure change needs user approval).
"""

from typing import Dict, Any, List
from datetime import datetime

from ..base_tool import BaseTool
from ...models.agent_models import SafetyLevel
from src.database.connection import db_manager


class CreateStageTool(BaseTool):
    """Create a new stage for a project."""

    @property
    def name(self) -> str:
        return "create_stage"

    @property
    def description(self) -> str:
        return (
            "Create a new construction stage for a project. Use when the user wants "
            "to add a phase, stage, or milestone to the project timeline."
        )

    @property
    def input_schema(self) -> Dict[str, Any]:
        return {
            "properties": {
                "project_id": {
                    "type": "string",
                    "description": "The project ID to add the stage to",
                },
                "name": {
                    "type": "string",
                    "description": "Stage name (e.g., 'Framing', 'Rough Plumbing')",
                },
                "planned_start_date": {
                    "type": "string",
                    "description": "Planned start date (YYYY-MM-DD)",
                },
                "planned_end_date": {
                    "type": "string",
                    "description": "Planned end date (YYYY-MM-DD)",
                },
                "finish_materials_due_date": {
                    "type": "string",
                    "description": "Date finish materials are due (YYYY-MM-DD)",
                },
                "finish_materials_note": {
                    "type": "string",
                    "description": "Note about required finish materials",
                },
            },
            "required": ["project_id", "name"],
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
        user_id = context.get("user_id")
        project_id = params["project_id"]
        name = params["name"]

        # Verify project belongs to company
        verify = await db_manager.execute_one(
            "SELECT id, name FROM projects WHERE id = $1 AND company_id = $2",
            project_id, company_id,
        )
        if not verify:
            return {"error": "Project not found or access denied"}

        # Get next order_index
        max_order = await db_manager.execute_one(
            "SELECT COALESCE(MAX(order_index), -1) as max_idx FROM client_portal.project_stages WHERE project_id = $1",
            project_id,
        )
        next_order = max_order["max_idx"] + 1

        # Parse dates
        def parse_date(date_str):
            if not date_str:
                return None
            try:
                return datetime.fromisoformat(date_str).date()
            except ValueError:
                return None

        planned_start = parse_date(params.get("planned_start_date"))
        planned_end = parse_date(params.get("planned_end_date"))
        materials_due = parse_date(params.get("finish_materials_due_date"))

        query = """
            INSERT INTO client_portal.project_stages
                (project_id, order_index, name, status, planned_start_date,
                 planned_end_date, finish_materials_due_date, finish_materials_note, created_by)
            VALUES ($1, $2, $3, 'NOT_STARTED', $4, $5, $6, $7, $8)
            RETURNING id, name, order_index, status
        """
        row = await db_manager.execute_one(
            query,
            project_id,
            next_order,
            name,
            planned_start,
            planned_end,
            materials_due,
            params.get("finish_materials_note"),
            user_id,
        )

        return {
            "success": True,
            "stage": {
                "id": str(row["id"]),
                "name": row["name"],
                "orderIndex": row["order_index"],
                "status": row["status"],
                "projectName": verify["name"],
            },
            "message": f"Stage '{name}' added to {verify['name']} at position {next_order}",
        }
