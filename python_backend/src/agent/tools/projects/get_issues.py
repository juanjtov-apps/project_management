"""
Get Issues tool - Retrieves issues/problems for projects.
"""

from typing import Dict, Any, List
from datetime import date, datetime

from ..base_tool import BaseTool
from ...models.agent_models import SafetyLevel
from src.database.connection import db_manager


class GetIssuesTool(BaseTool):
    """Retrieve issues (problems/concerns) for a project with priority and status."""

    @property
    def name(self) -> str:
        return "get_issues"

    @property
    def description(self) -> str:
        return (
            "Retrieve issues (problems/concerns) for projects with priority, status, "
            "and assignment info. Use ONLY when you have a specific project_id. "
            "For queries involving project NAMES (not IDs), date filtering, or "
            "cross-project queries, use query_database instead."
        )

    @property
    def input_schema(self) -> Dict[str, Any]:
        return {
            "properties": {
                "project_id": {
                    "type": "string",
                    "description": "Filter by project ID",
                },
                "status_filter": {
                    "type": "string",
                    "description": "Filter by issue status",
                    "enum": ["open", "in_progress", "resolved", "closed", "all"],
                },
                "priority_filter": {
                    "type": "string",
                    "description": "Filter by priority level",
                    "enum": ["critical", "high", "medium", "low", "all"],
                },
                "assigned_to": {
                    "type": "string",
                    "description": "Filter by assigned user ID",
                },
                "urgent_only": {
                    "type": "boolean",
                    "description": "Only show critical and high priority open issues",
                },
            },
            "required": [],
        }

    @property
    def permissions(self) -> List[str]:
        return ["admin", "project_manager", "office_manager", "crew", "subcontractor", "client"]

    @property
    def safety_level(self) -> SafetyLevel:
        return SafetyLevel.READ_ONLY

    async def execute(
        self,
        params: Dict[str, Any],
        context: Dict[str, Any],
    ) -> Dict[str, Any]:
        """Execute the get_issues tool."""
        company_id = context.get("company_id")
        project_id = params.get("project_id")

        # Build query
        query = """
            SELECT i.*, p.name as project_name, COALESCE(NULLIF(CONCAT(u.first_name, ' ', u.last_name), ' '), u.email) as assigned_user_name
            FROM client_portal.issues i
            LEFT JOIN projects p ON i.project_id::text = p.id::text
            LEFT JOIN users u ON i.assigned_to::text = u.id::text
            WHERE 1=1
        """
        query_params = []
        param_count = 1

        # Filter by company (mandatory for multi-tenant isolation)
        if not company_id:
            return {
                "error": "Company context required",
                "issues": [],
                "summary": {},
            }
        query += f" AND p.company_id = ${param_count}"
        query_params.append(str(company_id))
        param_count += 1

        # Filter by project
        if project_id:
            query += f" AND i.project_id::text = ${param_count}"
            query_params.append(str(project_id))
            param_count += 1

        query += " ORDER BY i.created_at DESC"

        # Execute query
        rows = await db_manager.execute_query(query, *query_params)
        issues = [dict(row) for row in rows]

        # Apply in-memory filters
        status_filter = params.get("status_filter")
        if status_filter and status_filter != "all":
            issues = [i for i in issues if i.get("status") == status_filter]

        priority_filter = params.get("priority_filter")
        if priority_filter and priority_filter != "all":
            issues = [i for i in issues if i.get("priority") == priority_filter]

        assigned_to = params.get("assigned_to")
        if assigned_to:
            issues = [i for i in issues if str(i.get("assigned_to")) == str(assigned_to)]

        # Client visibility filter — clients only see public/client issues
        if context.get("role") == "client":
            issues = [
                i for i in issues
                if i.get("visibility") in ("public", "client", None)
            ]

        # Urgent only filter (critical/high priority AND open)
        if params.get("urgent_only"):
            issues = [
                i for i in issues
                if i.get("priority") in ["critical", "high"]
                and i.get("status") in ["open", "in_progress"]
            ]

        # Calculate summary
        summary = {
            "totalIssues": len(issues),
            "open": sum(1 for i in issues if i.get("status") == "open"),
            "inProgress": sum(1 for i in issues if i.get("status") == "in_progress"),
            "resolved": sum(1 for i in issues if i.get("status") == "resolved"),
            "closed": sum(1 for i in issues if i.get("status") == "closed"),
            "critical": sum(1 for i in issues if i.get("priority") == "critical"),
            "high": sum(1 for i in issues if i.get("priority") == "high"),
        }

        # Simplify issue output
        simplified_issues = []
        for i in issues[:50]:  # Limit to 50
            simplified_issues.append({
                "id": str(i.get("id")),
                "title": i.get("title"),
                "description": i.get("description"),
                "status": i.get("status"),
                "priority": i.get("priority"),
                "projectId": str(i.get("project_id")) if i.get("project_id") else None,
                "projectName": i.get("project_name"),
                "assignedTo": str(i.get("assigned_to")) if i.get("assigned_to") else None,
                "assignedUserName": i.get("assigned_user_name"),
                "createdAt": str(i.get("created_at")) if i.get("created_at") else None,
            })

        return {
            "issues": simplified_issues,
            "summary": summary,
            "filters": {
                "project": project_id,
                "status": status_filter,
                "priority": priority_filter,
                "assignedTo": assigned_to,
                "urgentOnly": params.get("urgent_only"),
            },
        }
