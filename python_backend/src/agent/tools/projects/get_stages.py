"""
Get Stages tool - Retrieves project stages with completion status.
"""

from typing import Dict, Any, List

from ..base_tool import BaseTool
from ...models.agent_models import SafetyLevel
from src.database.connection import db_manager


class GetStagesTool(BaseTool):
    """Retrieve all stages for a project with completion percentages and status."""

    @property
    def name(self) -> str:
        return "get_stages"

    @property
    def description(self) -> str:
        return (
            "Retrieve all stages for a project with task counts, completion percentages, "
            "and status (not started, in progress, complete). Use this to understand "
            "project timeline and progress through construction phases."
        )

    @property
    def input_schema(self) -> Dict[str, Any]:
        return {
            "properties": {
                "project_id": {
                    "type": "string",
                    "description": "The project ID to get stages for",
                },
                "status_filter": {
                    "type": "string",
                    "description": "Filter by stage status",
                    "enum": ["NOT_STARTED", "ACTIVE", "COMPLETE", "all"],
                },
            },
            "required": ["project_id"],
        }

    @property
    def permissions(self) -> List[str]:
        return ["admin", "project_manager", "office_manager", "crew", "subcontractor"]

    @property
    def safety_level(self) -> SafetyLevel:
        return SafetyLevel.READ_ONLY

    async def execute(
        self,
        params: Dict[str, Any],
        context: Dict[str, Any],
    ) -> Dict[str, Any]:
        """Execute the get_stages tool."""
        project_id = params.get("project_id")
        company_id = context.get("company_id")
        status_filter = params.get("status_filter")

        # Verify project belongs to user's company
        from ..security import verify_project_access
        if not await verify_project_access(project_id, company_id):
            return {
                "error": "Project not found or access denied",
                "projectId": project_id,
                "stages": [],
                "summary": {},
            }

        # Build query
        query = """
            SELECT
                ps.*,
                ma.name as material_area_name,
                (SELECT COUNT(*) FROM public.tasks t
                 WHERE t.project_id = ps.project_id) as total_tasks,
                (SELECT COUNT(*) FROM public.tasks t
                 WHERE t.project_id = ps.project_id AND t.status = 'completed') as completed_tasks
            FROM client_portal.project_stages ps
            LEFT JOIN client_portal.material_areas ma ON ps.material_area_id = ma.id
            WHERE ps.project_id = $1
        """
        params_list = [project_id]

        if status_filter and status_filter != "all":
            query += " AND ps.status = $2"
            params_list.append(status_filter)

        query += " ORDER BY ps.order_index ASC"

        rows = await db_manager.execute_query(query, *params_list)

        stages = []
        for row in rows:
            row_dict = dict(row)

            # Calculate completion percentage
            total_tasks = row_dict.get("total_tasks", 0)
            completed_tasks = row_dict.get("completed_tasks", 0)
            completion_pct = (
                round((completed_tasks / total_tasks) * 100)
                if total_tasks > 0
                else 0
            )

            stages.append({
                "id": str(row_dict.get("id")) if row_dict.get("id") else None,
                "name": row_dict.get("name"),
                "orderIndex": row_dict.get("order_index"),
                "status": row_dict.get("status"),
                "plannedStartDate": str(row_dict.get("planned_start_date"))
                    if row_dict.get("planned_start_date") else None,
                "plannedEndDate": str(row_dict.get("planned_end_date"))
                    if row_dict.get("planned_end_date") else None,
                "finishMaterialsDueDate": str(row_dict.get("finish_materials_due_date"))
                    if row_dict.get("finish_materials_due_date") else None,
                "finishMaterialsNote": row_dict.get("finish_materials_note"),
                "materialAreaName": row_dict.get("material_area_name"),
                "clientVisible": row_dict.get("client_visible", True),
                "completionPercentage": completion_pct,
            })

        # Calculate summary
        summary = {
            "totalStages": len(stages),
            "notStarted": sum(1 for s in stages if s["status"] == "NOT_STARTED"),
            "active": sum(1 for s in stages if s["status"] == "ACTIVE"),
            "complete": sum(1 for s in stages if s["status"] == "COMPLETE"),
        }

        # Find current active stage
        active_stage = next((s for s in stages if s["status"] == "ACTIVE"), None)

        return {
            "projectId": project_id,
            "stages": stages,
            "summary": summary,
            "activeStage": active_stage,
        }
