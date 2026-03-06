"""
Create Installment tool — Creates a new payment installment for a project.
Safety: REQUIRES_CONFIRMATION (financial operation needs user approval).
"""

from typing import Dict, Any, List
from datetime import datetime

from ..base_tool import BaseTool
from ...models.agent_models import SafetyLevel
from src.database.connection import db_manager


class CreateInstallmentTool(BaseTool):
    """Create a new payment installment for a project."""

    @property
    def name(self) -> str:
        return "create_installment"

    @property
    def description(self) -> str:
        return (
            "Create a new payment installment for a project. Use when the user wants "
            "to add a payment milestone, create a new installment, or set up a payment "
            "for a project. Requires project_id, name (installment label), and amount."
        )

    @property
    def input_schema(self) -> Dict[str, Any]:
        return {
            "properties": {
                "project_id": {
                    "type": "string",
                    "description": "The project ID to create the installment for",
                },
                "name": {
                    "type": "string",
                    "description": "Installment name/label (e.g., 'Flooring deposit', 'Upon roof installation')",
                },
                "amount": {
                    "type": "number",
                    "description": "Payment amount in dollars",
                },
                "due_date": {
                    "type": "string",
                    "description": "Due date in ISO 8601 format (YYYY-MM-DD)",
                },
                "description": {
                    "type": "string",
                    "description": "Additional description or notes (optional)",
                },
                "status": {
                    "type": "string",
                    "description": "Initial status",
                    "enum": ["planned", "payable"],
                },
                "next_milestone": {
                    "type": "boolean",
                    "description": "Whether this is the next payment milestone for the project",
                },
            },
            "required": ["project_id", "name", "amount"],
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
        amount = params["amount"]

        # Verify project belongs to company
        verify = await db_manager.execute_one(
            "SELECT id, name FROM projects WHERE id = $1 AND company_id = $2",
            project_id, company_id,
        )
        if not verify:
            return {"error": "Project not found or access denied"}

        # Auto-resolve schedule_id
        schedules = await db_manager.execute_query(
            "SELECT id, title FROM client_portal.payment_schedules WHERE project_id = $1",
            project_id,
        )

        if len(schedules) == 1:
            schedule_id = schedules[0]["id"]
        elif len(schedules) == 0:
            # Auto-create a default schedule
            sched = await db_manager.execute_one(
                """INSERT INTO client_portal.payment_schedules
                   (project_id, title, created_by, updated_by)
                   VALUES ($1, 'Payment Schedule', $2, $2)
                   RETURNING id""",
                project_id, user_id,
            )
            schedule_id = sched["id"]
        else:
            schedule_names = [s["title"] for s in schedules]
            return {
                "error": f"Multiple payment schedules found for this project: {', '.join(schedule_names)}. Please specify which schedule to add to."
            }

        # Get next display_order
        order_row = await db_manager.execute_one(
            "SELECT COALESCE(MAX(display_order), 0) + 1 AS next_order FROM client_portal.payment_installments WHERE schedule_id = $1::uuid",
            str(schedule_id),
        )
        next_order = order_row["next_order"]

        # Handle next_milestone flag
        is_next = params.get("next_milestone", False)
        if is_next:
            await db_manager.execute_query(
                """UPDATE client_portal.payment_installments
                   SET next_milestone = FALSE
                   WHERE project_id = $1 AND status != 'paid'""",
                project_id,
            )

        # Parse due_date
        due_date = None
        if params.get("due_date"):
            try:
                due_date = datetime.fromisoformat(params["due_date"]).date()
            except ValueError:
                return {"error": f"Invalid date format: {params['due_date']}. Use YYYY-MM-DD."}

        # Insert installment
        query = """
            INSERT INTO client_portal.payment_installments
                (project_id, schedule_id, name, description, amount, currency,
                 due_date, status, next_milestone, display_order, created_by, updated_by)
            VALUES ($1, $2::uuid, $3, $4, $5, 'USD', $6, $7, $8, $9, $10, $10)
            RETURNING id, name, amount, status, due_date, next_milestone, display_order
        """
        row = await db_manager.execute_one(
            query,
            project_id,
            str(schedule_id),
            name,
            params.get("description"),
            amount,
            due_date,
            params.get("status", "planned"),
            is_next,
            next_order,
            user_id,
        )

        return {
            "success": True,
            "installment": {
                "id": str(row["id"]),
                "name": row["name"],
                "amount": float(row["amount"]),
                "status": row["status"],
                "dueDate": str(row["due_date"]) if row["due_date"] else None,
                "nextMilestone": row["next_milestone"],
                "displayOrder": row["display_order"],
                "projectName": verify["name"],
            },
            "message": f"Installment '{name}' (${amount:,.2f}) created for {verify['name']}",
        }
