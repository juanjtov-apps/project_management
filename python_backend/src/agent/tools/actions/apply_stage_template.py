"""
Apply Stage Template tool — Creates stages from a predefined template.
Safety: REQUIRES_CONFIRMATION (structural project change needs user approval).
"""

from typing import Dict, Any, List
from datetime import datetime

from ..base_tool import BaseTool
from ..security import resolve_project_or_error
from ...models.agent_models import SafetyLevel
from src.database.connection import db_manager
from src.database.stage_repository import ProjectStageRepository, StageTemplateRepository


class ApplyStageTemplateTool(BaseTool):
    """Apply a predefined stage template to a project, creating all stages at once."""

    @property
    def name(self) -> str:
        return "apply_stage_template"

    @property
    def description(self) -> str:
        return (
            "Apply a predefined construction stage template to a project, creating all "
            "stages at once with appropriate durations and sequencing. Available templates: "
            "Kitchen Remodel, Bathroom Renovation, Full Home Remodel, Room Addition, "
            "ADU Construction. ALWAYS check existing stages first with get_stages — if "
            "stages already exist, ask the user before applying."
        )

    @property
    def input_schema(self) -> Dict[str, Any]:
        return {
            "properties": {
                "project_id": {
                    "type": "string",
                    "description": "The project ID (UUID) or project name",
                },
                "template_name": {
                    "type": "string",
                    "description": "Name of the template to apply",
                    "enum": [
                        "Kitchen Remodel",
                        "Bathroom Renovation",
                        "Full Home Remodel",
                        "Room Addition",
                        "ADU Construction",
                    ],
                },
                "start_date": {
                    "type": "string",
                    "description": "Start date for the first stage (YYYY-MM-DD). Defaults to today if not provided.",
                },
            },
            "required": ["project_id", "template_name"],
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
        template_name = params["template_name"]

        # Resolve project by UUID or name
        verify, err = await resolve_project_or_error(params["project_id"], company_id)
        if err:
            return err
        project_id = str(verify["id"])

        # Check for existing stages
        existing = await db_manager.execute_query(
            "SELECT id, name, order_index, status FROM client_portal.project_stages "
            "WHERE project_id = $1 ORDER BY order_index",
            project_id,
        )
        if existing:
            stage_names = [row["name"] for row in existing]
            return {
                "warning": "existing_stages",
                "existingStages": stage_names,
                "existingCount": len(existing),
                "projectName": verify["name"],
                "message": (
                    f"{verify['name']} already has {len(existing)} stages: "
                    f"{', '.join(stage_names)}. "
                    "Ask the user if they want to remove existing stages first "
                    "or cancel the template application."
                ),
            }

        # Find template by name
        template = await db_manager.execute_one(
            "SELECT id, name FROM client_portal.stage_templates WHERE name = $1",
            template_name,
        )
        if not template:
            return {"error": f"Template '{template_name}' not found in the database"}

        # Parse start date
        start_date = None
        if params.get("start_date"):
            try:
                start_date = datetime.fromisoformat(params["start_date"]).date()
            except ValueError:
                return {"error": "Invalid start_date format. Use YYYY-MM-DD."}

        # Apply template using repository
        stage_repo = ProjectStageRepository()
        created_stages = await stage_repo.apply_template(
            project_id=project_id,
            template_id=str(template["id"]),
            user_id=user_id,
            start_date=start_date,
        )

        stage_summaries = []
        for s in created_stages:
            summary = {
                "name": s.get("name"),
                "orderIndex": s.get("order_index"),
                "status": s.get("status"),
            }
            if s.get("planned_start_date"):
                summary["plannedStart"] = str(s["planned_start_date"])
            if s.get("planned_end_date"):
                summary["plannedEnd"] = str(s["planned_end_date"])
            stage_summaries.append(summary)

        return {
            "success": True,
            "projectName": verify["name"],
            "templateName": template_name,
            "stagesCreated": len(created_stages),
            "stages": stage_summaries,
            "message": (
                f"Applied '{template_name}' template to {verify['name']} — "
                f"{len(created_stages)} stages created."
            ),
            "suggested_actions": [
                {"label": "View Stages", "navigateTo": f"/client-portal?projectId={project_id}"},
            ],
        }
