"""
Stage-based progress auto-computation service.
Recomputes project progress as (completed_stages / total_stages) * 100.
"""

import logging
from typing import List
from src.database.connection import db_manager

logger = logging.getLogger(__name__)


async def recompute_all_project_progress() -> int:
    """Batch recompute progress for all active projects that have stages.
    Called at startup to seed existing projects.
    """
    try:
        rows = await db_manager.execute_query(
            "SELECT id FROM projects WHERE status != 'completed'"
        )
        count = 0
        for row in rows:
            result = await recompute_project_progress(str(row["id"]))
            if result > 0:
                count += 1
        logger.info("Recomputed progress for %d projects", count)
        return count
    except Exception as e:
        logger.exception("Failed to batch recompute progress: %s", e)
        return 0


async def recompute_project_progress(project_id: str) -> int:
    """Recompute project progress based on stage completion.

    If no stages exist, leaves manual progress unchanged.
    Returns the new progress value.
    """
    try:
        row = await db_manager.execute_one(
            """
            SELECT COUNT(*) as total,
                   COUNT(*) FILTER (WHERE status = 'COMPLETE') as done
            FROM client_portal.project_stages
            WHERE project_id = $1
            """,
            project_id,
        )

        total = row["total"] if row else 0
        if total == 0:
            # No stages defined — keep manual progress
            current = await db_manager.execute_one(
                "SELECT progress FROM projects WHERE id = $1", project_id
            )
            return current["progress"] if current else 0

        done = row["done"] or 0
        progress = round(done / total * 100)

        await db_manager.execute(
            "UPDATE projects SET progress = $1, updated_at = NOW() WHERE id = $2",
            progress,
            project_id,
        )

        logger.info("Project %s progress recomputed: %d%% (%d/%d stages)", project_id, progress, done, total)
        return progress

    except Exception as e:
        logger.exception("Failed to recompute progress for project %s: %s", project_id, e)
        return 0
