"""
Analytics tracking middleware.
Counts authenticated API actions per user per day via fire-and-forget DB writes.
"""

import asyncio
import logging

from fastapi import Request
from starlette.middleware.base import BaseHTTPMiddleware

logger = logging.getLogger(__name__)

# Paths to skip counting
SKIP_PATHS = {
    "/api/v1/analytics/heartbeat",
    "/api/v1/auth/user",
    "/health",
    "/docs",
    "/redoc",
    "/openapi.json",
}


class AnalyticsTrackingMiddleware(BaseHTTPMiddleware):
    """Count authenticated API requests per user per day."""

    async def dispatch(self, request: Request, call_next):
        response = await call_next(request)

        # Only count /api/ requests
        path = request.url.path
        if not path.startswith("/api/"):
            return response

        # Skip specific paths
        if path in SKIP_PATHS:
            return response

        # Only count successful responses
        if response.status_code >= 400:
            return response

        # Need a session cookie to identify the user
        session_id = request.cookies.get("session_id")
        if not session_id:
            return response

        # Fire-and-forget: increment action count in background
        asyncio.create_task(_increment_action_count(session_id))

        return response


async def _increment_action_count(session_id: str):
    """Look up user from session and increment their daily action count."""
    try:
        from ..api.auth import get_session
        from ..database.connection import get_db_pool

        session_data = await get_session(session_id)
        if not session_data:
            return

        user_id = session_data.get("userId")
        if not user_id:
            return

        user_data = session_data.get("user_data", {})
        company_id = str(
            user_data.get("companyId")
            or user_data.get("company_id")
            or ""
        )

        pool = await get_db_pool()
        async with pool.acquire() as conn:
            await conn.execute(
                """
                INSERT INTO public.analytics_daily_stats
                    (user_id, company_id, stat_date, action_count, updated_at)
                VALUES ($1, $2, CURRENT_DATE, 1, now())
                ON CONFLICT (user_id, stat_date) DO UPDATE SET
                    action_count = analytics_daily_stats.action_count + 1,
                    updated_at = now()
                """,
                user_id, company_id,
            )
    except Exception as e:
        logger.debug(f"Analytics action count error: {e}")
