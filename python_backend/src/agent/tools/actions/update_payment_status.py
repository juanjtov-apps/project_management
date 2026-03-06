"""
Update Payment Status tool — Marks a payment installment as paid or changes its status.
Safety: REQUIRES_CONFIRMATION (financial operation needs user approval).
"""

from typing import Dict, Any, List
from datetime import datetime

from ..base_tool import BaseTool
from ...models.agent_models import SafetyLevel
from src.database.connection import db_manager


class UpdatePaymentStatusTool(BaseTool):
    """Update the status of a payment installment."""

    @property
    def name(self) -> str:
        return "update_payment_status"

    @property
    def description(self) -> str:
        return (
            "Update a payment installment's status (mark as paid, payable, or planned). "
            "Use when the user wants to mark a payment as paid, update payment status, "
            "or change a payment milestone."
        )

    @property
    def input_schema(self) -> Dict[str, Any]:
        return {
            "properties": {
                "installment_id": {
                    "type": "string",
                    "description": "The payment installment ID to update",
                },
                "status": {
                    "type": "string",
                    "description": "New status for the installment",
                    "enum": ["planned", "payable", "paid"],
                },
            },
            "required": ["installment_id", "status"],
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
        new_status = params["status"]

        # Verify installment belongs to a project in this company
        installment = await db_manager.execute_one(
            """SELECT pi.id, pi.name, pi.status, pi.amount, pi.due_date,
                      p.name as project_name
               FROM client_portal.payment_installments pi
               JOIN projects p ON p.id = pi.project_id
               WHERE pi.id = $1::uuid AND p.company_id = $2""",
            installment_id, company_id,
        )
        if not installment:
            return {"error": "Payment installment not found or access denied"}

        old_status = installment["status"]

        row = await db_manager.execute_one(
            """UPDATE client_portal.payment_installments
               SET status = $2, updated_by = $3, updated_at = NOW()
               WHERE id = $1::uuid
               RETURNING id, name, status, amount, due_date""",
            installment_id, new_status, user_id,
        )

        return {
            "success": True,
            "installment": {
                "id": str(row["id"]),
                "name": row["name"],
                "oldStatus": old_status,
                "newStatus": row["status"],
                "amount": float(row["amount"]),
                "dueDate": str(row["due_date"]) if row["due_date"] else None,
                "projectName": installment["project_name"],
            },
            "message": f"Payment '{row['name']}' ({float(row['amount']):,.2f}) updated: {old_status} → {new_status}",
        }
