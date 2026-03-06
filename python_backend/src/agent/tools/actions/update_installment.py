"""
Update Installment tool — Updates installment fields including name, amount, due date,
status, next_milestone, and description.
Safety: REQUIRES_CONFIRMATION (financial operation needs user approval).
"""

from typing import Dict, Any, List
from datetime import datetime

from ..base_tool import BaseTool
from ...models.agent_models import SafetyLevel
from src.database.connection import db_manager


class UpdateInstallmentTool(BaseTool):
    """Update a payment installment's details."""

    @property
    def name(self) -> str:
        return "update_installment"

    @property
    def description(self) -> str:
        return (
            "Update a payment installment's details — name, amount, due date, status, "
            "description, or mark it as the next milestone. Use when the user wants to "
            "modify an existing installment or set it as the next milestone."
        )

    @property
    def input_schema(self) -> Dict[str, Any]:
        return {
            "properties": {
                "installment_id": {
                    "type": "string",
                    "description": "The payment installment ID to update",
                },
                "name": {
                    "type": "string",
                    "description": "New name for the installment",
                },
                "amount": {
                    "type": "number",
                    "description": "New amount for the installment",
                },
                "due_date": {
                    "type": "string",
                    "description": "New due date in YYYY-MM-DD format",
                },
                "status": {
                    "type": "string",
                    "description": "New status for the installment",
                    "enum": ["planned", "payable", "paid"],
                },
                "next_milestone": {
                    "type": "boolean",
                    "description": "Whether this installment is the next milestone",
                },
                "description": {
                    "type": "string",
                    "description": "New description for the installment",
                },
            },
            "required": ["installment_id"],
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
        installment_id = params["installment_id"]

        # Verify installment belongs to a project in this company
        installment = await db_manager.execute_one(
            """SELECT pi.id, pi.name, pi.status, pi.amount, pi.due_date,
                      pi.project_id, pi.next_milestone, pi.description,
                      p.name as project_name
               FROM client_portal.payment_installments pi
               JOIN projects p ON p.id = pi.project_id
               WHERE pi.id = $1::uuid AND p.company_id = $2""",
            installment_id, company_id,
        )
        if not installment:
            return {"error": "Payment installment not found or access denied"}

        # Build dynamic SET clause from provided fields
        set_clauses = []
        query_params = [installment_id]  # $1
        param_idx = 2

        field_mapping = {
            "name": "name",
            "amount": "amount",
            "due_date": "due_date",
            "status": "status",
            "next_milestone": "next_milestone",
            "description": "description",
        }

        changes_made = []
        for param_key, col_name in field_mapping.items():
            if param_key in params and params[param_key] is not None:
                set_clauses.append(f"{col_name} = ${param_idx}")
                query_params.append(params[param_key])
                param_idx += 1
                changes_made.append(param_key)

        if not set_clauses:
            return {"error": "No fields provided to update"}

        # If setting next_milestone=true, clear existing flags for this project
        if params.get("next_milestone") is True:
            await db_manager.execute(
                """UPDATE client_portal.payment_installments
                   SET next_milestone = false, updated_at = NOW()
                   WHERE project_id = $1 AND next_milestone = true""",
                installment["project_id"],
            )

        # Add updated_by and updated_at
        set_clauses.append(f"updated_by = ${param_idx}")
        query_params.append(user_id)
        param_idx += 1
        set_clauses.append("updated_at = NOW()")

        query = f"""
            UPDATE client_portal.payment_installments
            SET {', '.join(set_clauses)}
            WHERE id = $1::uuid
            RETURNING id, name, status, amount, due_date, next_milestone, description
        """
        row = await db_manager.execute_one(query, *query_params)

        # Build human-readable summary of changes
        summary_parts = []
        if "name" in changes_made:
            summary_parts.append(f"renamed to '{row['name']}'")
        if "amount" in changes_made:
            summary_parts.append(f"amount set to ${float(row['amount']):,.2f}")
        if "due_date" in changes_made:
            summary_parts.append(f"due date set to {row['due_date']}")
        if "status" in changes_made:
            summary_parts.append(f"status changed to {row['status']}")
        if "next_milestone" in changes_made:
            if row["next_milestone"]:
                summary_parts.append("marked as next milestone")
            else:
                summary_parts.append("removed as next milestone")
        if "description" in changes_made:
            summary_parts.append("description updated")

        return {
            "success": True,
            "installment": {
                "id": str(row["id"]),
                "name": row["name"],
                "status": row["status"],
                "amount": float(row["amount"]),
                "dueDate": str(row["due_date"]) if row["due_date"] else None,
                "nextMilestone": row["next_milestone"],
                "projectName": installment["project_name"],
            },
            "message": f"Installment '{row['name']}' on {installment['project_name']} updated: {', '.join(summary_parts)}",
        }
