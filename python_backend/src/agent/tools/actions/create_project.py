"""
Create Project tool — Creates a new project from scratch.
Safety: REQUIRES_CONFIRMATION (user must approve before execution).
"""

import uuid
from typing import Dict, Any, List
from datetime import datetime, timezone

from ..base_tool import BaseTool
from ...models.agent_models import SafetyLevel
from src.database.connection import db_manager


class CreateProjectTool(BaseTool):
    """Create a new project for the user's company."""

    @property
    def name(self) -> str:
        return "create_project"

    @property
    def description(self) -> str:
        return (
            "Create a new project from scratch. Use when the user wants to start a new "
            "construction project, add a new job, or set up a new project. "
            "Only the project name is required. After getting the name, briefly ask if "
            "they'd like to add a description, location, or due date — but proceed "
            "without them if the user declines or doesn't provide them. "
            "IMPORTANT: When calling this tool, include ALL details the user has provided "
            "(description, location, due date) as parameters — do not omit them. "
            "If the user mentions custom fields like permit numbers, planning numbers, or "
            "other extra info, first create the project, then immediately call "
            "update_project_details to store those custom fields."
        )

    @property
    def input_schema(self) -> Dict[str, Any]:
        return {
            "properties": {
                "name": {
                    "type": "string",
                    "description": "Project name (e.g., 'Oak Street Renovation')",
                },
                "description": {
                    "type": "string",
                    "description": "Project description or scope of work (optional)",
                },
                "location": {
                    "type": "string",
                    "description": "Project address or location (optional)",
                },
                "status": {
                    "type": "string",
                    "description": "Initial project status",
                    "enum": ["active", "on-hold"],
                },
                "due_date": {
                    "type": "string",
                    "description": "Target completion date in ISO 8601 format (YYYY-MM-DD)",
                },
            },
            "required": ["name"],
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
        if not company_id:
            return {"error": "No company associated with your account."}

        name = params["name"]
        project_id = str(uuid.uuid4())
        now = datetime.now(timezone.utc).replace(tzinfo=None)

        # Validate due_date if provided
        due_date = None
        if params.get("due_date"):
            try:
                due_date = datetime.fromisoformat(params["due_date"]).replace(tzinfo=None)
            except ValueError:
                return {"error": f"Invalid date format: {params['due_date']}. Use YYYY-MM-DD."}

        query = """
            INSERT INTO projects (id, name, description, location, status, progress,
                                  due_date, company_id, created_at)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
            RETURNING id, name, status, location, due_date
        """
        row = await db_manager.execute_one(
            query,
            project_id,
            name,
            params.get("description", ""),
            params.get("location", ""),
            params.get("status", "active"),
            0,  # progress starts at 0
            due_date,
            company_id,
            now,
        )

        # Build formatted result message with <<highlights>> for mint rendering
        status = params.get("status", "active")
        lines = [f"Project <<{name}>> created successfully.\n"]
        lines.append(f"**Status:** <<{status}>>")
        if params.get("description"):
            lines.append(f"**Description:** {params['description']}")
        if params.get("location"):
            lines.append(f"**Location:** <<{params['location']}>>")
        if due_date:
            lines.append(f"**Due date:** <<{params['due_date']}>>")

        message = "\n".join(lines)

        return {
            "success": True,
            "project": {
                "id": str(row["id"]),
                "name": row["name"],
                "status": row["status"],
                "location": row["location"] or None,
                "dueDate": str(row["due_date"]) if row["due_date"] else None,
                "description": params.get("description", ""),
            },
            "message": message,
            "suggested_actions": [
                {"label": "Go to Project", "navigateTo": "/work"},
                {"label": "Add Tasks", "prompt": f"Create tasks for {name}"},
                {"label": "Add Project Details", "prompt": f"Add custom details to {name} (permit number, planning number, etc.)"},
                {"label": "Apply Stage Template", "prompt": f"Apply a stage template to {name}"},
            ],
        }
