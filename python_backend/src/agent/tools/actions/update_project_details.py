"""
Update Project Details tool — Sets or removes custom fields on a project.
Safety: AUDIT_LOGGED (non-destructive metadata update).
"""

import json
from typing import Dict, Any, List

from ..base_tool import BaseTool
from ..security import resolve_project_or_error
from ...models.agent_models import SafetyLevel
from src.database.connection import db_manager


class UpdateProjectDetailsTool(BaseTool):
    """Set or remove custom detail fields on a project (permit numbers, planning numbers, etc.)."""

    @property
    def name(self) -> str:
        return "update_project_details"

    @property
    def description(self) -> str:
        return (
            "Add, update, or remove custom detail fields on a project. Use this to store "
            "information like permit numbers, planning numbers, site contact phones, "
            "or any other project-specific details that don't have a dedicated field."
        )

    @property
    def input_schema(self) -> Dict[str, Any]:
        return {
            "properties": {
                "project_id": {
                    "type": "string",
                    "description": "The project ID (UUID) or project name",
                },
                "fields": {
                    "type": "object",
                    "description": (
                        "Key-value pairs to set. Use snake_case keys. "
                        'Example: {"permit_number": "B-2026-1234", "planning_number": "PL-456"}'
                    ),
                },
                "remove_fields": {
                    "type": "array",
                    "items": {"type": "string"},
                    "description": "List of field keys to remove (e.g. [\"permit_number\"])",
                },
            },
            "required": ["project_id", "fields"],
        }

    @property
    def permissions(self) -> List[str]:
        return ["admin", "project_manager"]

    @property
    def safety_level(self) -> SafetyLevel:
        return SafetyLevel.AUDIT_LOGGED

    async def execute(
        self,
        params: Dict[str, Any],
        context: Dict[str, Any],
    ) -> Dict[str, Any]:
        company_id = context.get("company_id")
        new_fields = params.get("fields", {})
        remove_keys = params.get("remove_fields", [])

        # Resolve project by UUID or name
        project, err = await resolve_project_or_error(
            params["project_id"], company_id, extra_columns="custom_fields"
        )
        if err:
            return err
        project_id = str(project["id"])

        # Get current custom_fields
        current = project.get("custom_fields") or {}
        if isinstance(current, str):
            current = json.loads(current)

        # Merge new fields
        updated = {**current, **new_fields}

        # Remove specified keys
        for key in remove_keys:
            updated.pop(key, None)

        # Save
        await db_manager.execute_one(
            "UPDATE projects SET custom_fields = $1, updated_at = NOW() WHERE id = $2 AND company_id = $3",
            json.dumps(updated), project_id, company_id,
        )

        # Build change summary
        added = [k for k in new_fields if k not in current]
        changed = [k for k in new_fields if k in current and current[k] != new_fields[k]]
        removed = [k for k in remove_keys if k in current]

        changes = []
        if added:
            changes.append(f"added: {', '.join(added)}")
        if changed:
            changes.append(f"updated: {', '.join(changed)}")
        if removed:
            changes.append(f"removed: {', '.join(removed)}")

        return {
            "success": True,
            "projectName": project["name"],
            "customFields": updated,
            "changes": changes,
            "message": (
                f"Updated custom details for {project['name']}: "
                f"{'; '.join(changes) if changes else 'no changes'}"
            ),
            "suggested_actions": [
                {"label": "View Project", "navigateTo": "/work"},
            ],
        }
