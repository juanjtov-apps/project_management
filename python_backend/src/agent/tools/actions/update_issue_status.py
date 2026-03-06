"""
Update Issue Status tool — Changes the status of an existing issue.
Safety: AUDIT_LOGGED (executes immediately, logged for audit trail).
"""

from typing import Dict, Any, List

from ..base_tool import BaseTool
from ...models.agent_models import SafetyLevel
from src.database.connection import db_manager


class UpdateIssueStatusTool(BaseTool):
    """Update the status of an existing issue."""

    @property
    def name(self) -> str:
        return "update_issue_status"

    @property
    def description(self) -> str:
        return (
            "Update an issue's status or priority. Use when the user says an issue "
            "is resolved, closed, in progress, or needs priority changed."
        )

    @property
    def input_schema(self) -> Dict[str, Any]:
        return {
            "properties": {
                "issue_id": {
                    "type": "string",
                    "description": "The issue ID to update",
                },
                "status": {
                    "type": "string",
                    "description": "New status for the issue",
                    "enum": ["open", "in_progress", "resolved", "closed"],
                },
                "priority": {
                    "type": "string",
                    "description": "New priority (optional, only if changing)",
                    "enum": ["low", "medium", "high", "critical"],
                },
            },
            "required": ["issue_id", "status"],
        }

    @property
    def permissions(self) -> List[str]:
        return ["admin", "project_manager", "office_manager", "crew"]

    @property
    def safety_level(self) -> SafetyLevel:
        return SafetyLevel.AUDIT_LOGGED

    async def execute(
        self,
        params: Dict[str, Any],
        context: Dict[str, Any],
    ) -> Dict[str, Any]:
        company_id = context.get("company_id")
        issue_id = params["issue_id"]
        new_status = params["status"]

        # Verify issue belongs to a project in this company
        issue = await db_manager.execute_one(
            """SELECT i.id, i.title, i.status, i.priority, p.name as project_name
               FROM client_portal.issues i
               JOIN projects p ON p.id = i.project_id
               WHERE i.id = $1::uuid AND p.company_id = $2""",
            issue_id, company_id,
        )
        if not issue:
            return {"error": "Issue not found or access denied"}

        old_status = issue["status"]

        set_clauses = ["status = $2", "updated_at = NOW()"]
        args: list = [issue_id, new_status]
        idx = 3

        if params.get("priority"):
            set_clauses.append(f"priority = ${idx}")
            args.append(params["priority"])
            idx += 1

        query = f"""
            UPDATE client_portal.issues SET {', '.join(set_clauses)}
            WHERE id = $1::uuid
            RETURNING id, title, status, priority
        """
        row = await db_manager.execute_one(query, *args)

        return {
            "success": True,
            "issue": {
                "id": str(row["id"]),
                "title": row["title"],
                "oldStatus": old_status,
                "newStatus": row["status"],
                "priority": row["priority"],
                "projectName": issue["project_name"],
            },
            "message": f"Issue '{row['title']}' updated: {old_status} → {new_status}",
        }
