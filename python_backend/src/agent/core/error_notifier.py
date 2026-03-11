"""
Agent Error Notifier.

Notifies root admins when agent errors occur via:
1. metric_events table (always) - for the troubleshooting page
2. pm_notifications (when project_id available) - for the bell icon
"""

import asyncio
import logging
import time
from typing import Optional

from src.agent.repositories.agent_repository import agent_repo
from src.database.connection import get_db_pool

logger = logging.getLogger(__name__)

# In-memory rate limiter: {key: last_notified_timestamp}
_rate_limit_cache: dict[str, float] = {}
RATE_LIMIT_SECONDS = 300  # 5 minutes per error key


def _is_rate_limited(key: str) -> bool:
    """Check if this error key was recently notified."""
    now = time.time()
    last_time = _rate_limit_cache.get(key)
    if last_time and (now - last_time) < RATE_LIMIT_SECONDS:
        return True
    _rate_limit_cache[key] = now
    return False


async def notify_root_admins_on_error(
    error_type: str,
    error_message: str,
    tool_name: Optional[str] = None,
    user_id: Optional[str] = None,
    conversation_id: Optional[str] = None,
    project_id: Optional[str] = None,
    company_id: Optional[str] = None,
) -> None:
    """
    Notify root admins about an agent error.

    Always saves to agent.metric_events. When project_id is available,
    also inserts into pm_notifications for the bell icon.

    Rate-limited: max 1 notification per error key per 5 minutes.
    Wrapped in try/except so failures never crash the main flow.
    """
    try:
        rate_key = f"{error_type}:{tool_name or 'general'}"
        if _is_rate_limited(rate_key):
            logger.debug(f"Rate limited error notification: {rate_key}")
            return

        # 1. Always save to metric_events for the troubleshooting page
        await agent_repo.save_metric_event(
            event_type="agent_error",
            event_data={
                "error_type": error_type,
                "error_message": str(error_message)[:500],
                "tool_name": tool_name,
                "user_id": user_id,
                "conversation_id": conversation_id,
                "project_id": project_id,
            },
            user_id=user_id,
            company_id=company_id,
            conversation_id=conversation_id,
        )

        # 2. If project_id is available, also notify via pm_notifications (bell icon)
        if project_id:
            try:
                root_ids = await agent_repo.get_root_user_ids()
                if not root_ids:
                    return

                pool = await get_db_pool()
                title = f"Agent Error: {tool_name or error_type}"[:100]
                body = str(error_message)[:200]
                source_id = conversation_id or "00000000-0000-0000-0000-000000000000"

                async with pool.acquire() as conn:
                    for root_id in root_ids:
                        try:
                            await conn.execute(
                                """
                                INSERT INTO client_portal.pm_notifications
                                (project_id, recipient_user_id, type, source_kind, source_id, title, body)
                                VALUES ($1, $2, 'agent_error', 'agent_error', $3::uuid, $4, $5)
                                """,
                                project_id,
                                root_id,
                                source_id,
                                title,
                                body,
                            )
                        except Exception as e:
                            logger.debug(f"Failed to notify root user {root_id}: {e}")
            except Exception as e:
                logger.debug(f"Failed to send pm_notifications: {e}")

    except Exception as e:
        logger.warning(f"Error notifier failed (non-fatal): {e}")
