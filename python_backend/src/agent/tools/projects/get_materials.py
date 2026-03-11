"""
Get Materials tool - Retrieves materials list for a project.
"""

from typing import Dict, Any, List

from ..base_tool import BaseTool
from ...models.agent_models import SafetyLevel
from src.database.connection import db_manager


class GetMaterialsTool(BaseTool):
    """Retrieve materials list for a project or stage."""

    @property
    def name(self) -> str:
        return "get_materials"

    @property
    def description(self) -> str:
        return (
            "Retrieve materials list for a project or stage, grouped by category. "
            "Includes status (pending selection, selected, ordered, delivered, installed), "
            "specifications, quantities, and costs. Use this to track material procurement "
            "and identify what needs to be ordered."
        )

    @property
    def input_schema(self) -> Dict[str, Any]:
        return {
            "properties": {
                "project_id": {
                    "type": "string",
                    "description": "The project ID to get materials for",
                },
                "stage_id": {
                    "type": "string",
                    "description": "Filter by specific stage ID",
                },
                "area_name": {
                    "type": "string",
                    "description": "Filter by material area/category name",
                },
                "status_filter": {
                    "type": "string",
                    "description": "Filter by material status",
                    "enum": ["pending", "ordered", "delivered", "installed", "rejected", "all"],
                },
                "approval_status_filter": {
                    "type": "string",
                    "description": "Filter by approval status",
                    "enum": ["pending", "approved", "rejected", "all"],
                },
                "needs_ordering": {
                    "type": "boolean",
                    "description": "Only show materials that need to be ordered",
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
        """Execute the get_materials tool."""
        project_id = params.get("project_id")
        company_id = context.get("company_id")

        # Verify project belongs to user's company
        from ..security import verify_project_access
        if not await verify_project_access(project_id, company_id):
            return {
                "error": "Project not found or access denied",
                "projectId": project_id,
                "materials": [],
                "materialsByArea": {},
                "summary": {},
            }

        # Build query
        query = """
            SELECT
                mi.*,
                ma.name as area_name,
                ma.description as area_description,
                ma.sort_order as area_sort_order,
                ps.name as stage_name,
                ps.finish_materials_due_date,
                ps.order_index as stage_order
            FROM client_portal.material_items mi
            LEFT JOIN client_portal.material_areas ma ON mi.area_id = ma.id
            LEFT JOIN client_portal.project_stages ps ON mi.stage_id = ps.id
            WHERE mi.project_id = $1
        """
        query_params = [project_id]
        param_idx = 2

        # Apply filters
        if params.get("stage_id"):
            query += f" AND mi.stage_id = ${param_idx}"
            query_params.append(params["stage_id"])
            param_idx += 1

        if params.get("area_name"):
            query += f" AND LOWER(ma.name) LIKE ${param_idx}"
            query_params.append(f"%{params['area_name'].lower()}%")
            param_idx += 1

        status_filter = params.get("status_filter")
        if status_filter and status_filter != "all":
            query += f" AND mi.status = ${param_idx}"
            query_params.append(status_filter)
            param_idx += 1

        approval_filter = params.get("approval_status_filter")
        if approval_filter and approval_filter != "all":
            query += f" AND mi.approval_status = ${param_idx}"
            query_params.append(approval_filter)
            param_idx += 1

        if params.get("needs_ordering"):
            # Items that are approved but not yet ordered
            query += " AND mi.approval_status = 'approved' AND mi.status = 'pending'"

        query += " ORDER BY ma.sort_order, mi.created_at"

        rows = await db_manager.execute_query(query, *query_params)

        # Group materials by area
        materials_by_area = {}
        all_materials = []

        for row in rows:
            row_dict = dict(row)
            area_name = row_dict.get("area_name") or "Uncategorized"

            due_date = row_dict.get("finish_materials_due_date")
            material = {
                "id": str(row_dict.get("id")) if row_dict.get("id") else None,
                "name": row_dict.get("name"),
                "spec": row_dict.get("spec"),
                "productLink": row_dict.get("product_link"),
                "vendor": row_dict.get("vendor"),
                "quantity": row_dict.get("quantity"),
                "unitCost": float(row_dict.get("unit_cost")) if row_dict.get("unit_cost") else None,
                "status": row_dict.get("status"),
                "approvalStatus": row_dict.get("approval_status"),
                "stageName": row_dict.get("stage_name"),
                "finishMaterialsDueDate": str(due_date) if due_date else None,
                "stageOrder": row_dict.get("stage_order"),
                "areaName": area_name,
            }

            all_materials.append(material)

            if area_name not in materials_by_area:
                materials_by_area[area_name] = []
            materials_by_area[area_name].append(material)

        # Calculate summary
        summary = {
            "totalItems": len(all_materials),
            "statusCounts": {},
            "approvalCounts": {},
            "totalEstimatedCost": 0,
        }

        for m in all_materials:
            status = m.get("status") or "unknown"
            summary["statusCounts"][status] = summary["statusCounts"].get(status, 0) + 1

            approval = m.get("approvalStatus") or "unknown"
            summary["approvalCounts"][approval] = summary["approvalCounts"].get(approval, 0) + 1

            if m.get("unitCost") and m.get("quantity"):
                try:
                    qty = float(m["quantity"]) if isinstance(m["quantity"], str) else (m["quantity"] or 0)
                    summary["totalEstimatedCost"] += m["unitCost"] * qty
                except (ValueError, TypeError):
                    pass

        summary["totalEstimatedCost"] = round(summary["totalEstimatedCost"], 2)

        return {
            "projectId": project_id,
            "materials": all_materials[:100],  # Limit to 100 items
            "materialsByArea": materials_by_area,
            "summary": summary,
            "filters": {
                "stageId": params.get("stage_id"),
                "areaName": params.get("area_name"),
                "status": status_filter,
                "approvalStatus": approval_filter,
            },
        }
