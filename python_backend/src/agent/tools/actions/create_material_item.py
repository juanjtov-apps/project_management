"""
Create Material Item tool — Adds a new material item to a project.
Safety: AUDIT_LOGGED (executes immediately, logged for audit trail).
"""

from typing import Dict, Any, List

from ..base_tool import BaseTool
from ..security import resolve_project_or_error
from ...models.agent_models import SafetyLevel
from src.database.connection import db_manager


class CreateMaterialItemTool(BaseTool):
    """Add a new finish material item to a project."""

    @property
    def name(self) -> str:
        return "create_material_item"

    @property
    def description(self) -> str:
        return (
            "Add a new finish material item to a project. Use when the user wants to "
            "add a material selection, track a product needed for a stage, or log "
            "a material requirement. Requires a material area (room/zone) to group items."
        )

    @property
    def input_schema(self) -> Dict[str, Any]:
        return {
            "properties": {
                "project_id": {
                    "type": "string",
                    "description": "The project ID (UUID) or project name",
                },
                "area_id": {
                    "type": "string",
                    "description": "Material area ID (room/zone) to add the item to",
                },
                "name": {
                    "type": "string",
                    "description": "Material item name (e.g., 'Kitchen Cabinets', 'Floor Tile')",
                },
                "spec": {
                    "type": "string",
                    "description": "Material specification or details (optional)",
                },
                "vendor": {
                    "type": "string",
                    "description": "Vendor or supplier name (optional)",
                },
                "quantity": {
                    "type": "string",
                    "description": "Quantity needed (e.g., '50 sqft', '12 boxes')",
                },
                "unit_cost": {
                    "type": "string",
                    "description": "Unit cost in dollars (optional)",
                },
                "product_link": {
                    "type": "string",
                    "description": "Link to product page (optional)",
                },
                "stage_id": {
                    "type": "string",
                    "description": "Stage ID to associate this material with (optional)",
                },
            },
            "required": ["project_id", "area_id", "name"],
        }

    @property
    def permissions(self) -> List[str]:
        return ["admin", "project_manager", "office_manager"]

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
        area_id = params["area_id"]
        name = params["name"]

        # Resolve project by UUID or name
        verify, err = await resolve_project_or_error(params["project_id"], company_id)
        if err:
            return err
        project_id = str(verify["id"])

        # Verify area belongs to this project
        area = await db_manager.execute_one(
            "SELECT id, name FROM client_portal.material_areas WHERE id = $1::uuid AND project_id = $2",
            area_id, project_id,
        )
        if not area:
            return {"error": "Material area not found or doesn't belong to this project"}

        # Parse unit_cost
        unit_cost = None
        if params.get("unit_cost"):
            try:
                unit_cost = float(str(params["unit_cost"]).replace("$", "").replace(",", ""))
            except ValueError:
                pass

        query = """
            INSERT INTO client_portal.material_items
                (area_id, project_id, name, spec, vendor, quantity,
                 unit_cost, product_link, stage_id, added_by, status)
            VALUES ($1::uuid, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'pending')
            RETURNING id, name, status
        """
        stage_id = params.get("stage_id")
        row = await db_manager.execute_one(
            query,
            area_id,
            project_id,
            name,
            params.get("spec"),
            params.get("vendor"),
            params.get("quantity"),
            unit_cost,
            params.get("product_link"),
            stage_id if stage_id else None,
            user_id,
        )

        return {
            "success": True,
            "material": {
                "id": str(row["id"]),
                "name": row["name"],
                "status": row["status"],
                "areaName": area["name"],
                "projectName": verify["name"],
            },
            "message": f"Material '{name}' added to {area['name']} in {verify['name']}",
            "suggested_actions": [
                {"label": "View Materials", "navigateTo": f"/client-portal?projectId={project_id}"},
                {"label": "Add Another", "prompt": "Add another material item to this project"},
            ],
        }
