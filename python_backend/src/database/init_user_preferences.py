"""
User Preferences Schema Initialization
Safe, additive migration that adds a preferences JSONB column to the users table.
"""

import logging
from .connection import get_db_pool

logger = logging.getLogger(__name__)


async def init_user_preferences():
    """Add preferences JSONB column to users table if it doesn't exist."""
    pool = await get_db_pool()

    init_sql = """
    ALTER TABLE public.users
    ADD COLUMN IF NOT EXISTS preferences jsonb DEFAULT '{}';
    """

    async with pool.acquire() as conn:
        await conn.execute(init_sql)
        logger.info("User preferences column verified/initialized")
