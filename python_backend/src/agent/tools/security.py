"""Shared security utilities for agent tools."""

from typing import Optional, Dict, Any

from src.database.connection import db_manager


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
