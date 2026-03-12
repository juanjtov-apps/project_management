"""
Update Stage tool — Updates a project stage's status or dates.
Safety: AUDIT_LOGGED (executes immediately, logged for audit trail).
"""

from typing import Dict, Any, List
from datetime import datetime

from ..base_tool import BaseTool
from ...models.agent_models import SafetyLevel
from src.database.connection import db_manager


class UpdateStageTool(BaseTool):
    """Update an existing project stage."""

    @property
    def name(self) -> str:
        return "update_stage"

    @property
    def description(self) -> str:
        return (
            "Update a project stage's status, dates, or materials info. Use when the "
            "user wants to mark a stage as active/complete, change stage dates, or "
            "update materials notes for a stage."
        )

    @property
    def input_schema(self) -> Dict[str, Any]:
        return {
            "properties": {
                "stage_id": {
                    "type": "string",
                    "description": "The stage ID to update",
                },
                "status": {
                    "type": "string",
                    "description": "New stage status",
                    "enum": ["NOT_STARTED", "ACTIVE", "COMPLETE"],
                },
                "planned_start_date": {
                    "type": "string",
                    "description": "New planned start date (YYYY-MM-DD)",
                },
                "planned_end_date": {
                    "type": "string",
                    "description": "New planned end date (YYYY-MM-DD)",
                },
                "duration_value": {
                    "type": "integer",
                    "description": "Duration as a numeric value (used with duration_unit)",
                },
                "duration_unit": {
                    "type": "string",
                    "description": "Unit for duration: 'days' or 'hours'",
                    "enum": ["days", "hours"],
                },
                "finish_materials_due_date": {
                    "type": "string",
                    "description": "New finish materials due date (YYYY-MM-DD)",
                },
            },
            "required": ["stage_id"],
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
        stage_id = params["stage_id"]

        # Verify stage belongs to a project in this company
        stage = await db_manager.execute_one(
            """SELECT s.id, s.name, s.status, s.planned_start_date, s.planned_end_date,
                      s.project_id, p.name as project_name
               FROM client_portal.project_stages s
               JOIN projects p ON p.id = s.project_id
               WHERE s.id = $1::uuid AND p.company_id = $2""",
            stage_id, company_id,
        )
        if not stage:
            return {"error": "Stage not found or access denied"}

        updatable_fields = ["status", "planned_start_date", "planned_end_date",
                           "finish_materials_due_date", "duration_value", "duration_unit"]
        if not any(params.get(k) for k in updatable_fields):
            return {"error": "Must provide at least one field to update (status, dates, duration)"}

        old_status = stage["status"]
        set_clauses = ["updated_at = NOW()"]
        args: list = [stage_id]
        idx = 2

        if params.get("status"):
            set_clauses.append(f"status = ${idx}")
            args.append(params["status"])
            idx += 1

        def parse_and_add(field_name, db_column):
            nonlocal idx
            if params.get(field_name):
                try:
                    date_val = datetime.fromisoformat(params[field_name]).date()
                    set_clauses.append(f"{db_column} = ${idx}")
                    args.append(date_val)
                    idx += 1
                except ValueError:
                    pass

        parse_and_add("planned_start_date", "planned_start_date")
        parse_and_add("planned_end_date", "planned_end_date")
        parse_and_add("finish_materials_due_date", "finish_materials_due_date")

        if params.get("duration_value") is not None:
            set_clauses.append(f"duration_value = ${idx}")
            args.append(params["duration_value"])
            idx += 1

        if params.get("duration_unit"):
            set_clauses.append(f"duration_unit = ${idx}")
            args.append(params["duration_unit"])
            idx += 1

        query = f"""
            UPDATE client_portal.project_stages SET {', '.join(set_clauses)}
            WHERE id = $1::uuid
            RETURNING id, name, status, planned_start_date, planned_end_date,
                      duration_value, duration_unit
        """
        row = await db_manager.execute_one(query, *args)

        changes = []
        if params.get("status") and params["status"] != old_status:
            changes.append(f"status: {old_status} → {row['status']}")
        if params.get("planned_start_date"):
            changes.append(f"start: {row['planned_start_date']}")
        if params.get("planned_end_date"):
            changes.append(f"end: {row['planned_end_date']}")
        if params.get("duration_value") is not None:
            unit = params.get("duration_unit") or row["duration_unit"] or "days"
            changes.append(f"duration: {row['duration_value']} {unit}")

        return {
            "success": True,
            "stage": {
                "id": str(row["id"]),
                "name": row["name"],
                "status": row["status"],
                "plannedStartDate": str(row["planned_start_date"]) if row["planned_start_date"] else None,
                "plannedEndDate": str(row["planned_end_date"]) if row["planned_end_date"] else None,
                "durationValue": row["duration_value"],
                "durationUnit": row["duration_unit"],
                "projectName": stage["project_name"],
            },
            "changes": changes,
            "message": f"Stage '{row['name']}' updated: {', '.join(changes) if changes else 'updated'}",
            "suggested_actions": [
                {"label": "View Stages", "navigateTo": f"/client-portal?projectId={stage['project_id']}"},
            ],
        }
