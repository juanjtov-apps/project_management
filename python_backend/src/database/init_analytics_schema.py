"""
Platform Analytics Database Schema Initialization.
Safe, additive migration that creates tables for tracking
user engagement: heartbeats, daily usage stats, and agent vs app time.
"""

from .connection import get_db_pool


async def init_analytics_schema():
    """Initialize analytics tables in public schema."""
    pool = await get_db_pool()

    init_sql = """
    BEGIN;

    -- =============================================
    -- RAW HEARTBEAT PINGS (write-heavy, pruned after 30 days)
    -- =============================================
    CREATE TABLE IF NOT EXISTS public.analytics_heartbeats(
        id bigserial PRIMARY KEY,
        user_id varchar NOT NULL,
        company_id varchar,
        agent_active boolean NOT NULL DEFAULT false,
        created_at timestamptz NOT NULL DEFAULT now()
    );

    CREATE INDEX IF NOT EXISTS idx_heartbeat_user_created
        ON public.analytics_heartbeats(user_id, created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_heartbeat_created
        ON public.analytics_heartbeats(created_at);

    -- =============================================
    -- PRE-AGGREGATED DAILY STATS (one row per user per day)
    -- =============================================
    CREATE TABLE IF NOT EXISTS public.analytics_daily_stats(
        id bigserial PRIMARY KEY,
        user_id varchar NOT NULL,
        company_id varchar,
        stat_date date NOT NULL,
        total_time_seconds integer NOT NULL DEFAULT 0,
        agent_time_seconds integer NOT NULL DEFAULT 0,
        app_time_seconds integer NOT NULL DEFAULT 0,
        action_count integer NOT NULL DEFAULT 0,
        login_count integer NOT NULL DEFAULT 0,
        last_heartbeat_at timestamptz,
        last_agent_active boolean DEFAULT false,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT uq_daily_stats_user_date UNIQUE(user_id, stat_date)
    );

    CREATE INDEX IF NOT EXISTS idx_daily_stats_date
        ON public.analytics_daily_stats(stat_date);
    CREATE INDEX IF NOT EXISTS idx_daily_stats_user_date
        ON public.analytics_daily_stats(user_id, stat_date DESC);
    CREATE INDEX IF NOT EXISTS idx_daily_stats_company_date
        ON public.analytics_daily_stats(company_id, stat_date);

    COMMIT;
    """

    try:
        async with pool.acquire() as conn:
            await conn.execute(init_sql)
            print("Analytics schema initialized successfully")
            return True
    except Exception as e:
        print(f"Error initializing analytics schema: {e}")
        raise
