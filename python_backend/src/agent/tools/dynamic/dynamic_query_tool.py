"""
Dynamic database query tool - can query any table based on user permissions.

This tool provides flexible database access while respecting RBAC permissions,
automatically applying security filters (company_id), and supporting various
filter types including date ranges and status filters.
"""

from typing import Dict, Any, List, Optional
from datetime import date, datetime
from decimal import Decimal

from ..base_tool import BaseTool
from ...models.agent_models import SafetyLevel
from src.database.connection import db_manager
from .schema_registry import (
    TABLE_CONFIGS,
    get_accessible_tables,
    resolve_table_name,
    get_table_config,
)
from .query_builder import QueryBuilder


class DynamicQueryTool(BaseTool):
    """
    Query any database table based on user role permissions.

    This tool enables flexible querying of any accessible table while:
    - Respecting role-based access control per table
    - Automatically filtering by company_id for security
    - Supporting project name resolution (no need for IDs)
    - Supporting date range filters (this week, this month, overdue, etc.)
    - Supporting status and custom filters
    """

    @property
    def name(self) -> str:
        return "query_database"

    @property
    def description(self) -> str:
        return (
            "PRIMARY TOOL FOR ALL DATA QUERIES. Use this tool FIRST for ANY question about "
            "projects, tasks, payments, installments, issues, materials, stages, schedules, or invoices. "
            "This tool is MORE POWERFUL than specialized tools because it supports: "
            "(1) Project name lookup - users can say 'Via Tesoro' instead of IDs, "
            "(2) Date filtering - today, this_week, this_month, overdue, next_7, next_30, "
            "(3) Cross-project queries - get data across all projects, "
            "(4) Status and priority filters, "
            "(5) Any combination of filters. "
            "ALWAYS use this tool when the user asks about payments, installments, tasks, issues, etc. "
            "with ANY date range, time period, or project name reference."
        )

    @property
    def input_schema(self) -> Dict[str, Any]:
        return {
            "properties": {
                "data_type": {
                    "type": "string",
                    "description": (
                        "What type of data to query. Options: projects, tasks, payments/installments, "
                        "issues, materials, stages, schedules, forum, invoices. "
                        "Use natural language terms - they will be resolved automatically."
                    ),
                },
                "project_id": {
                    "type": "string",
                    "description": "Filter by specific project ID (optional)",
                },
                "project_name": {
                    "type": "string",
                    "description": (
                        "Filter by project name (case-insensitive partial match). "
                        "Use this instead of project_id when user provides a name."
                    ),
                },
                "status": {
                    "type": "string",
                    "description": "Filter by status (varies by data type: active, completed, pending, paid, etc.)",
                },
                "date_filter": {
                    "type": "string",
                    "description": "Date range filter for due dates or creation dates",
                    "enum": ["today", "this_week", "this_month", "overdue", "next_7", "next_30"],
                },
                "priority": {
                    "type": "string",
                    "description": "Filter by priority (for tasks, issues): low, medium, high, critical",
                },
                "custom_filters": {
                    "type": "object",
                    "description": "Additional filters as key-value pairs for any column",
                },
                "limit": {
                    "type": "integer",
                    "description": "Maximum results to return (default 50, max 100)",
                },
            },
            "required": ["data_type"],
        }

    @property
    def permissions(self) -> List[str]:
        # All roles can use this tool - access is controlled per-table
        return ["admin", "project_manager", "office_manager", "crew", "subcontractor", "client"]

    @property
    def safety_level(self) -> SafetyLevel:
        return SafetyLevel.READ_ONLY

    async def execute(
        self,
        params: Dict[str, Any],
        context: Dict[str, Any],
    ) -> Dict[str, Any]:
        """Execute dynamic query based on user permissions."""

        company_id = context.get("company_id")
        role = context.get("role", "")

        if not company_id:
            return {
                "error": "Company context required",
                "hint": "Unable to determine your company context",
                "results": [],
            }

        # 1. Resolve table from data_type
        data_type = params.get("data_type", "").lower()
        table = resolve_table_name(data_type)

        if not table:
            accessible = get_accessible_tables(role)
            return {
                "error": f"Unknown data type: '{data_type}'",
                "hint": f"Available types for your role: {', '.join(accessible)}",
                "results": [],
            }

        # 2. Check permission
        config = get_table_config(table)
        if not config or role not in config.read_permissions:
            accessible = get_accessible_tables(role)
            return {
                "error": f"Access denied to '{data_type}'",
                "hint": f"Your role ({role}) cannot access this data. Available: {', '.join(accessible)}",
                "results": [],
            }

        # 3. Resolve project_id from name if needed
        project_id = params.get("project_id")
        project_name = params.get("project_name")
        resolved_project_name = None

        if project_name and not project_id:
            resolved = await self._resolve_project(project_name, company_id)
            if resolved.get("error"):
                return resolved
            project_id = resolved.get("project_id")
            resolved_project_name = resolved.get("project_name")

        # 4. Build query
        builder = QueryBuilder(table, role, company_id, project_id)

        filters: Dict[str, Any] = params.get("custom_filters", {}) or {}

        # Add status filter
        if params.get("status"):
            filters["status"] = params["status"]

        # Add priority filter
        if params.get("priority"):
            filters["priority"] = params["priority"]

        # Add date filter
        date_filter = params.get("date_filter")
        if date_filter and config.date_column:
            date_filters = builder.build_date_filter(date_filter)
            filters.update(date_filters)

        limit = min(params.get("limit", 50), 100)

        query, query_params = builder.build_select(filters, None, limit)

        # 5. Execute query
        try:
            rows = await db_manager.execute_query(query, *query_params)
            results = [dict(row) for row in rows]
        except Exception as e:
            return {
                "error": f"Query failed: {str(e)}",
                "results": [],
            }

        # 6. Format results
        formatted = self._format_results(results)

        # 7. Build summary
        summary = self._build_summary(results, table)

        return {
            "dataType": data_type,
            "table": table,
            "projectFilter": resolved_project_name or project_id,
            "dateFilter": date_filter,
            "statusFilter": params.get("status"),
            "priorityFilter": params.get("priority"),
            "results": formatted,
            "count": len(results),
            "summary": summary,
        }

    async def _resolve_project(self, name: str, company_id: str) -> Dict[str, Any]:
        """
        Resolve project name to ID.

        Args:
            name: Project name (partial match supported)
            company_id: Company ID for filtering

        Returns:
            Dictionary with project_id and project_name, or error info
        """
        query = """
            SELECT id, name FROM projects
            WHERE LOWER(name) LIKE LOWER($1) AND company_id = $2
            LIMIT 5
        """
        try:
            rows = await db_manager.execute_query(query, f"%{name}%", company_id)
        except Exception as e:
            return {
                "error": "project_lookup_failed",
                "message": f"Failed to look up project: {str(e)}",
                "results": [],
            }

        if len(rows) == 1:
            return {
                "project_id": str(rows[0]["id"]),
                "project_name": rows[0]["name"]
            }
        elif len(rows) > 1:
            matches = [{"id": str(r["id"]), "name": r["name"]} for r in rows]
            return {
                "error": "multiple_projects_found",
                "message": f"Multiple projects match '{name}'. Please specify which one:",
                "matches": matches,
                "results": [],
            }
        else:
            return {
                "error": "project_not_found",
                "message": f"No project found matching '{name}'",
                "results": [],
            }

    def _format_results(self, results: List[Dict]) -> List[Dict]:
        """
        Format results for display, converting dates and decimals.

        Args:
            results: List of row dictionaries

        Returns:
            Formatted list of dictionaries
        """
        formatted = []
        for row in results:
            item = {}
            for key, value in row.items():
                # Convert dates to ISO strings
                if isinstance(value, (date, datetime)):
                    item[key] = value.isoformat()
                # Convert Decimal to float
                elif isinstance(value, Decimal):
                    item[key] = float(value)
                # Convert UUID to string
                elif hasattr(value, 'hex'):
                    item[key] = str(value)
                else:
                    item[key] = value
            formatted.append(item)
        return formatted

    def _build_summary(self, results: List[Dict], table: str) -> Dict[str, Any]:
        """
        Build summary statistics for the results.

        Args:
            results: List of result dictionaries
            table: Table name for context-specific summaries

        Returns:
            Summary dictionary
        """
        summary: Dict[str, Any] = {"total": len(results)}

        if not results:
            return summary

        # Status breakdown if applicable
        if any("status" in r for r in results):
            status_counts: Dict[str, int] = {}
            for r in results:
                status = r.get("status", "unknown")
                if status:
                    status_counts[status] = status_counts.get(status, 0) + 1
            if status_counts:
                summary["byStatus"] = status_counts

        # Priority breakdown for tasks/issues
        if table in ("tasks", "issues") and any("priority" in r for r in results):
            priority_counts: Dict[str, int] = {}
            for r in results:
                priority = r.get("priority", "unknown")
                if priority:
                    priority_counts[priority] = priority_counts.get(priority, 0) + 1
            if priority_counts:
                summary["byPriority"] = priority_counts

        # Amount totals for payments
        if table == "payment_installments" and any("amount" in r for r in results):
            total_amount = sum(
                float(r.get("amount", 0)) for r in results
                if r.get("amount") is not None
            )
            summary["totalAmount"] = round(total_amount, 2)

            # Break down by status
            paid_amount = sum(
                float(r.get("amount", 0)) for r in results
                if r.get("status") == "paid" and r.get("amount") is not None
            )
            unpaid_amount = total_amount - paid_amount
            summary["paidAmount"] = round(paid_amount, 2)
            summary["unpaidAmount"] = round(unpaid_amount, 2)

        # Invoice totals
        if table == "invoices" and any("total" in r for r in results):
            invoice_total = sum(
                float(r.get("total", 0)) for r in results
                if r.get("total") is not None
            )
            summary["invoiceTotal"] = round(invoice_total, 2)

        # Progress average for stages
        if table == "project_stages" and any("progress" in r for r in results):
            progress_values = [
                r.get("progress", 0) for r in results
                if r.get("progress") is not None
            ]
            if progress_values:
                summary["averageProgress"] = round(
                    sum(progress_values) / len(progress_values), 1
                )

        return summary
