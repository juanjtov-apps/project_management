"""
Get Stage Templates tool — Lists available predefined stage templates.
Safety: READ_ONLY (no modifications).
"""

from typing import Dict, Any, List

from ..base_tool import BaseTool
from ...models.agent_models import SafetyLevel
from src.database.stage_repository import StageTemplateRepository


class GetStageTemplatesTool(BaseTool):
    """List available stage templates with their stages and durations."""

    @property
    def name(self) -> str:
        return "get_stage_templates"

    @property
    def description(self) -> str:
        return (
            "List all available predefined stage templates (Kitchen Remodel, "
            "Bathroom Renovation, Full Home Remodel, Room Addition, ADU Construction). "
            "Returns each template's stages with default durations. Use this to show "
            "the user what templates are available before applying one."
        )

    @property
    def input_schema(self) -> Dict[str, Any]:
        return {
            "properties": {},
            "required": [],
        }

    @property
    def permissions(self) -> List[str]:
        return ["admin", "project_manager"]

    @property
    def safety_level(self) -> SafetyLevel:
        return SafetyLevel.READ_ONLY

    async def execute(
        self,
        params: Dict[str, Any],
        context: Dict[str, Any],
    ) -> Dict[str, Any]:
        template_repo = StageTemplateRepository()
        templates = await template_repo.get_all_templates()

        # Filter out "Custom" template (blank slate, not useful for agent)
        templates = [t for t in templates if t.get("name", "").lower() != "custom"]

        result = []
        for t in templates:
            items = t.get("items", [])
            stages = []
            for item in items:
                stage_info = {"name": item.get("name", "")}
                duration = item.get("defaultDurationDays")
                if duration:
                    stage_info["defaultDurationDays"] = duration
                note = item.get("defaultMaterialsNote")
                if note:
                    stage_info["materialsNote"] = note
                stages.append(stage_info)

            result.append({
                "name": t.get("name"),
                "category": t.get("category"),
                "description": t.get("description"),
                "stageCount": len(stages),
                "stages": stages,
            })

        return {
            "templates": result,
            "totalCount": len(result),
            "message": f"Found {len(result)} stage templates available.",
        }
