"""
Get Installments tool - Retrieves payment installments for projects.
"""

from typing import Dict, Any, List
from datetime import date, datetime, timedelta

from ..base_tool import BaseTool
from ...models.agent_models import SafetyLevel
from src.database.connection import db_manager


class GetInstallmentsTool(BaseTool):
    """Retrieve payment installments for a project with amounts and due dates."""

    @property
    def name(self) -> str:
        return "get_installments"

    @property
    def description(self) -> str:
        return (
            "Retrieve payment installments for a specific project by ID showing amounts "
            "and due dates. Use ONLY when you have a specific project_id. For queries by "
            "project NAME, date filtering (this month, overdue), or cross-project payment "
            "queries, use query_database instead."
        )

    @property
    def input_schema(self) -> Dict[str, Any]:
        return {
            "properties": {
                "project_id": {
                    "type": "string",
                    "description": "The project ID to get installments for (required)",
                },
                "status_filter": {
                    "type": "string",
                    "description": "Filter by payment status",
                    "enum": ["planned", "payable", "paid", "overdue", "all"],
                },
                "upcoming_only": {
                    "type": "boolean",
                    "description": "Only show future unpaid installments",
                },
                "limit": {
                    "type": "integer",
                    "description": "Limit number of results - any number (1, 2, 5, 10, etc.)",
                },
            },
            "required": ["project_id"],
        }

    @property
    def permissions(self) -> List[str]:
        return ["admin", "project_manager", "office_manager", "client"]

    @property
    def safety_level(self) -> SafetyLevel:
        return SafetyLevel.READ_ONLY

    async def execute(
        self,
        params: Dict[str, Any],
        context: Dict[str, Any],
    ) -> Dict[str, Any]:
        """Execute the get_installments tool."""
        project_id = params.get("project_id")

        if not project_id:
            return {
                "error": "project_id is required",
                "installments": [],
            }

        # Verify project belongs to user's company
        company_id = context.get("company_id")
        from ..security import verify_project_access
        if not await verify_project_access(project_id, company_id):
            return {
                "error": "Project not found or access denied",
                "projectId": project_id,
                "installments": [],
                "summary": {},
            }

        # Build query to get installments with schedule info
        # Using actual column names from the database schema
        query = """
            SELECT
                pi.id,
                pi.schedule_id,
                pi.display_order,
                pi.name,
                pi.description,
                pi.amount,
                pi.currency,
                pi.due_date,
                pi.status,
                pi.next_milestone,
                pi.project_id,
                ps.title as schedule_title,
                p.name as project_name
            FROM client_portal.payment_installments pi
            JOIN client_portal.payment_schedules ps ON pi.schedule_id = ps.id
            LEFT JOIN projects p ON pi.project_id::text = p.id::text
            WHERE pi.project_id::text = $1
            ORDER BY pi.due_date ASC, pi.display_order ASC
        """
        query_params = [str(project_id)]

        # Execute query
        rows = await db_manager.execute_query(query, *query_params)
        installments = [dict(row) for row in rows]

        # Apply in-memory filters
        today = date.today()

        status_filter = params.get("status_filter")
        if status_filter and status_filter != "all":
            if status_filter == "overdue":
                # Overdue = planned/payable and past due date
                installments = [
                    i for i in installments
                    if i.get("status") in ("planned", "payable")
                    and i.get("due_date")
                    and self._parse_date(i["due_date"]) < today
                ]
            else:
                installments = [i for i in installments if i.get("status") == status_filter]

        # Upcoming only filter (future unpaid)
        if params.get("upcoming_only"):
            installments = [
                i for i in installments
                if i.get("status") in ("planned", "payable")
                and i.get("due_date")
                and self._parse_date(i["due_date"]) >= today
            ]

        # Apply limit
        limit = params.get("limit")
        if limit and limit > 0:
            installments = installments[:limit]

        # Calculate summary (before limit applied, so we get full picture)
        all_installments = [dict(row) for row in rows]
        total_amount = sum(float(i.get("amount") or 0) for i in all_installments)
        paid_amount = sum(float(i.get("amount") or 0) for i in all_installments if i.get("status") == "paid")
        unpaid_amount = sum(float(i.get("amount") or 0) for i in all_installments if i.get("status") in ("planned", "payable"))

        summary = {
            "totalInstallments": len(all_installments),
            "plannedCount": sum(1 for i in all_installments if i.get("status") == "planned"),
            "payableCount": sum(1 for i in all_installments if i.get("status") == "payable"),
            "paidCount": sum(1 for i in all_installments if i.get("status") == "paid"),
            "overdueCount": sum(
                1 for i in all_installments
                if i.get("status") in ("planned", "payable")
                and i.get("due_date")
                and self._parse_date(i["due_date"]) < today
            ),
            "totalAmount": total_amount,
            "paidAmount": paid_amount,
            "unpaidAmount": unpaid_amount,
        }

        # Simplify installment output
        simplified_installments = []
        for i in installments:
            simplified_installments.append({
                "id": str(i.get("id")),
                "displayOrder": i.get("display_order"),
                "name": i.get("name"),
                "description": i.get("description"),
                "amount": float(i.get("amount") or 0),
                "currency": i.get("currency", "USD"),
                "dueDate": str(i.get("due_date")) if i.get("due_date") else None,
                "status": i.get("status"),
                "nextMilestone": i.get("next_milestone"),
                "scheduleTitle": i.get("schedule_title"),
                "projectName": i.get("project_name"),
                "isOverdue": (
                    i.get("status") in ("planned", "payable")
                    and i.get("due_date")
                    and self._parse_date(i["due_date"]) < today
                ),
            })

        return {
            "projectId": project_id,
            "installments": simplified_installments,
            "summary": summary,
            "filters": {
                "status": status_filter,
                "upcomingOnly": params.get("upcoming_only"),
                "limit": limit,
            },
        }

    def _parse_date(self, date_value) -> date:
        """Parse a date value to date object."""
        if isinstance(date_value, date):
            return date_value
        if isinstance(date_value, datetime):
            return date_value.date()
        if isinstance(date_value, str):
            return datetime.fromisoformat(date_value.replace("Z", "+00:00")).date()
        return None
