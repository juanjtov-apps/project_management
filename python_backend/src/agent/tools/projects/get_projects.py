"""
Get Projects tool - Lists all projects for the user's company.
"""

from typing import Dict, Any, List

from ..base_tool import BaseTool
from ...models.agent_models import SafetyLevel
from src.database.repositories import ProjectRepository


class GetProjectsTool(BaseTool):
    """List all projects for the current user's company with status and summary metrics."""

    @property
    def name(self) -> str:
        return "get_projects"

    @property
    def description(self) -> str:
        return (
            "List all projects for the current user's company with status, progress, "
            "and summary metrics. Use this to get an overview of all active work or "
            "to find a specific project by name or status."
        )

    @property
    def input_schema(self) -> Dict[str, Any]:
        return {
            "properties": {
                "status_filter": {
                    "type": "string",
                    "description": "Filter by project status",
                    "enum": ["active", "completed", "on-hold", "delayed", "all"],
                },
                "search_query": {
                    "type": "string",
                    "description": "Search projects by name, location, or client name",
                },
            },
            "required": [],
        }

    @property
    def permissions(self) -> List[str]:
        return ["admin", "project_manager", "office_manager"]

    @property
    def safety_level(self) -> SafetyLevel:
        return SafetyLevel.READ_ONLY

    async def execute(
        self,
        params: Dict[str, Any],
        context: Dict[str, Any],
    ) -> Dict[str, Any]:
        """Execute the get_projects tool."""
        project_repo = ProjectRepository()
        company_id = context.get("company_id")

        # Get projects filtered by company
        if company_id:
            projects = await project_repo.get_by_company(company_id)
        else:
            projects = await project_repo.get_all()

        # Apply status filter
        status_filter = params.get("status_filter")
        if status_filter and status_filter != "all":
            projects = [p for p in projects if p.get("status") == status_filter]

        # Apply search filter
        search_query = params.get("search_query", "").lower()
        if search_query:
            projects = [
                p for p in projects
                if (
                    search_query in (p.get("name") or "").lower()
                    or search_query in (p.get("location") or "").lower()
                    or search_query in (p.get("clientName") or "").lower()
                )
            ]

        # Calculate summary metrics
        total_count = len(projects)
        status_counts = {}
        for p in projects:
            status = p.get("status", "unknown")
            status_counts[status] = status_counts.get(status, 0) + 1

        # Simplify project data for response
        simplified_projects = []
        for p in projects:
            simplified_projects.append({
                "id": str(p.get("id")) if p.get("id") else None,
                "name": p.get("name"),
                "status": p.get("status"),
                "progress": p.get("progress", 0),
                "location": p.get("location"),
                "clientName": p.get("clientName"),
                "dueDate": str(p.get("dueDate")) if p.get("dueDate") else None,
            })

        return {
            "projects": simplified_projects,
            "totalCount": total_count,
            "statusCounts": status_counts,
            "filter": {
                "status": status_filter,
                "search": search_query if search_query else None,
            },
        }
