"""Shared security utilities for agent tools."""

import re
from typing import Optional, Dict, Any, Tuple

from src.database.connection import db_manager


_UUID_RE = re.compile(
    r'^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$',
    re.IGNORECASE,
)


async def verify_project_access(
    project_id: str, company_id: str
) -> Optional[Dict[str, Any]]:
    """Verify a project belongs to the given company.

    Returns the project row (id, name) if access is granted, None otherwise.
    """
    if not project_id or not company_id:
        return None
    row = await db_manager.execute_one(
        "SELECT id, name FROM projects WHERE id = $1 AND company_id = $2",
        project_id, company_id,
    )
    return dict(row) if row else None


async def resolve_project(
    project_id_or_name: str,
    company_id: str,
    extra_columns: str = "",
) -> Optional[Dict[str, Any]]:
    """Resolve a project by UUID or fuzzy name match within a company.

    Returns:
        - Dict with project row if exactly one match
        - Dict with {"ambiguous": True, "matches": [...]} if multiple matches
        - None if no match
    """
    if not project_id_or_name or not company_id:
        return None

    cols = "id, name"
    if extra_columns:
        cols += f", {extra_columns}"

    # Step 1: Try UUID lookup
    if _UUID_RE.match(project_id_or_name.strip()):
        row = await db_manager.execute_one(
            f"SELECT {cols} FROM projects WHERE id = $1 AND company_id = $2",
            project_id_or_name.strip(), company_id,
        )
        return dict(row) if row else None

    # Step 2: Fuzzy name match (case-insensitive substring)
    rows = await db_manager.execute_query(
        f"SELECT {cols} FROM projects WHERE company_id = $1",
        company_id,
    )
    name_lower = project_id_or_name.strip().lower()
    matches = [dict(r) for r in rows if name_lower in (r.get("name") or "").lower()]

    if len(matches) == 1:
        return matches[0]
    if len(matches) > 1:
        return {
            "ambiguous": True,
            "matches": [{"id": str(m["id"]), "name": m["name"]} for m in matches],
        }
    return None


async def resolve_project_or_error(
    project_id_or_name: str,
    company_id: str,
    extra_columns: str = "",
) -> Tuple[Optional[Dict[str, Any]], Optional[Dict[str, Any]]]:
    """Convenience wrapper: (project_row, None) on success or (None, error_dict) on failure."""
    resolved = await resolve_project(project_id_or_name, company_id, extra_columns)
    if resolved is None:
        return None, {
            "error": f"No project found matching '{project_id_or_name}'. Use get_projects to list available projects."
        }
    if resolved.get("ambiguous"):
        names = ", ".join(m["name"] for m in resolved["matches"])
        return None, {
            "error": f"Multiple projects match '{project_id_or_name}': {names}. Please specify which one."
        }
    return resolved, None
