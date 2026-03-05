"""
Platform Analytics API Endpoints.
Tracks user engagement: heartbeats for time-in-app, action counts,
login frequency, and agent vs app time split.
"""

import asyncio
import logging
from datetime import date, timedelta
from typing import Optional, List, Dict, Any

from fastapi import APIRouter, HTTPException, Depends, Query, Response
from pydantic import BaseModel

from ..database.connection import get_db_pool
from .auth import get_current_user_dependency, is_root_admin

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/analytics", tags=["analytics"])


# --- Request / Response Models ---

class HeartbeatRequest(BaseModel):
    agentActive: bool = False


class UserUsageStats(BaseModel):
    userId: str
    email: str
    name: str
    companyName: Optional[str] = None
    companyId: Optional[str] = None
    totalTimeSeconds: int
    agentTimeSeconds: int
    appTimeSeconds: int
    totalActions: int
    totalLogins: int
    lastActiveDate: Optional[str] = None


class DailyTrend(BaseModel):
    date: str
    activeUsers: int
    avgTimeSeconds: int
    totalActions: int
    totalLogins: int
    agentTimeSeconds: int
    appTimeSeconds: int


class AnalyticsOverview(BaseModel):
    activeUsersToday: int
    avgTimePerUserSeconds: int
    totalActionsToday: int
    totalLoginsToday: int
    totalAgentTimeToday: int
    totalAppTimeToday: int
    activeUsersInRange: int
    avgDailyActiveUsers: float


class AnalyticsDashboardResponse(BaseModel):
    overview: AnalyticsOverview
    dailyTrends: List[DailyTrend]
    topUsers: List[UserUsageStats]


# --- Helper ---

async def verify_root_admin(current_user: dict):
    """Verify the current user is root admin."""
    if not is_root_admin(current_user):
        raise HTTPException(
            status_code=403,
            detail="Root admin access required."
        )
    return current_user


# --- Endpoints ---

@router.post("/heartbeat", status_code=204)
async def record_heartbeat(
    body: HeartbeatRequest,
    current_user: dict = Depends(get_current_user_dependency),
):
    """
    Lightweight heartbeat ping from the frontend (every 60s).
    Upserts analytics_daily_stats with time delta split by agent/app.
    """
    user_id = str(current_user.get("id"))
    company_id = str(current_user.get("companyId") or current_user.get("company_id") or "")
    agent_active = body.agentActive

    try:
        pool = await get_db_pool()
        async with pool.acquire() as conn:
            # Insert raw heartbeat
            await conn.execute(
                """
                INSERT INTO public.analytics_heartbeats (user_id, company_id, agent_active, created_at)
                VALUES ($1, $2, $3, now())
                """,
                user_id, company_id, agent_active,
            )

            # Upsert daily stats with time delta
            await conn.execute(
                """
                INSERT INTO public.analytics_daily_stats
                    (user_id, company_id, stat_date, total_time_seconds,
                     agent_time_seconds, app_time_seconds,
                     last_heartbeat_at, last_agent_active, updated_at)
                VALUES ($1, $2, CURRENT_DATE, 0, 0, 0, now(), $3, now())
                ON CONFLICT (user_id, stat_date) DO UPDATE SET
                    total_time_seconds = CASE
                        WHEN analytics_daily_stats.last_heartbeat_at IS NOT NULL
                            AND EXTRACT(EPOCH FROM (now() - analytics_daily_stats.last_heartbeat_at)) BETWEEN 10 AND 120
                        THEN analytics_daily_stats.total_time_seconds
                            + EXTRACT(EPOCH FROM (now() - analytics_daily_stats.last_heartbeat_at))::int
                        ELSE analytics_daily_stats.total_time_seconds
                    END,
                    agent_time_seconds = CASE
                        WHEN $3 = true
                            AND analytics_daily_stats.last_heartbeat_at IS NOT NULL
                            AND EXTRACT(EPOCH FROM (now() - analytics_daily_stats.last_heartbeat_at)) BETWEEN 10 AND 120
                        THEN analytics_daily_stats.agent_time_seconds
                            + EXTRACT(EPOCH FROM (now() - analytics_daily_stats.last_heartbeat_at))::int
                        ELSE analytics_daily_stats.agent_time_seconds
                    END,
                    app_time_seconds = CASE
                        WHEN $3 = false
                            AND analytics_daily_stats.last_heartbeat_at IS NOT NULL
                            AND EXTRACT(EPOCH FROM (now() - analytics_daily_stats.last_heartbeat_at)) BETWEEN 10 AND 120
                        THEN analytics_daily_stats.app_time_seconds
                            + EXTRACT(EPOCH FROM (now() - analytics_daily_stats.last_heartbeat_at))::int
                        ELSE analytics_daily_stats.app_time_seconds
                    END,
                    last_heartbeat_at = now(),
                    last_agent_active = $3,
                    updated_at = now()
                """,
                user_id, company_id, agent_active,
            )
    except Exception as e:
        logger.warning(f"Heartbeat recording error: {e}")
        # Never fail the heartbeat — analytics must not affect UX

    return Response(status_code=204)


@router.get("/usage", response_model=List[UserUsageStats])
async def get_usage(
    start_date: Optional[date] = Query(None),
    end_date: Optional[date] = Query(None),
    company_id: Optional[str] = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    current_user: dict = Depends(get_current_user_dependency),
):
    """Per-user usage stats for a date range (root admin only)."""
    await verify_root_admin(current_user)

    if not start_date:
        start_date = date.today() - timedelta(days=7)
    if not end_date:
        end_date = date.today()

    pool = await get_db_pool()
    async with pool.acquire() as conn:
        params: list = [start_date, end_date]
        company_filter = ""
        if company_id:
            company_filter = " AND ds.company_id = $3"
            params.append(company_id)

        idx = len(params) + 1
        params.extend([skip, limit])

        query = f"""
            SELECT
                ds.user_id,
                u.email,
                COALESCE(u.first_name || ' ' || u.last_name, u.email) as name,
                c.name as company_name,
                ds.company_id,
                SUM(ds.total_time_seconds) as total_time_seconds,
                SUM(ds.agent_time_seconds) as agent_time_seconds,
                SUM(ds.app_time_seconds) as app_time_seconds,
                SUM(ds.action_count) as total_actions,
                SUM(ds.login_count) as total_logins,
                MAX(ds.stat_date) as last_active_date
            FROM public.analytics_daily_stats ds
            JOIN public.users u ON ds.user_id = u.id
            LEFT JOIN public.companies c ON ds.company_id = c.id
            WHERE ds.stat_date BETWEEN $1 AND $2
            {company_filter}
            GROUP BY ds.user_id, u.email, u.first_name, u.last_name, c.name, ds.company_id
            ORDER BY total_time_seconds DESC
            OFFSET ${idx} LIMIT ${idx + 1}
        """

        rows = await conn.fetch(query, *params)

        return [
            UserUsageStats(
                userId=row["user_id"],
                email=row["email"],
                name=row["name"],
                companyName=row["company_name"],
                companyId=row["company_id"],
                totalTimeSeconds=row["total_time_seconds"] or 0,
                agentTimeSeconds=row["agent_time_seconds"] or 0,
                appTimeSeconds=row["app_time_seconds"] or 0,
                totalActions=row["total_actions"] or 0,
                totalLogins=row["total_logins"] or 0,
                lastActiveDate=str(row["last_active_date"]) if row["last_active_date"] else None,
            )
            for row in rows
        ]


@router.get("/dashboard", response_model=AnalyticsDashboardResponse)
async def get_dashboard(
    start_date: Optional[date] = Query(None),
    end_date: Optional[date] = Query(None),
    company_id: Optional[str] = Query(None),
    current_user: dict = Depends(get_current_user_dependency),
):
    """Aggregated analytics dashboard data (root admin only)."""
    await verify_root_admin(current_user)

    if not start_date:
        start_date = date.today() - timedelta(days=7)
    if not end_date:
        end_date = date.today()

    today = date.today()
    pool = await get_db_pool()
    async with pool.acquire() as conn:
        params: list = [start_date, end_date]
        company_filter = ""
        if company_id:
            company_filter = " AND ds.company_id = $3"
            params.append(company_id)

        # --- Overview: today ---
        today_params: list = [today, today]
        today_company_filter = ""
        if company_id:
            today_company_filter = " AND ds.company_id = $3"
            today_params.append(company_id)

        today_row = await conn.fetchrow(
            f"""
            SELECT
                COUNT(DISTINCT ds.user_id) as active_users,
                COALESCE(AVG(ds.total_time_seconds), 0)::int as avg_time,
                COALESCE(SUM(ds.action_count), 0)::int as total_actions,
                COALESCE(SUM(ds.login_count), 0)::int as total_logins,
                COALESCE(SUM(ds.agent_time_seconds), 0)::int as agent_time,
                COALESCE(SUM(ds.app_time_seconds), 0)::int as app_time
            FROM public.analytics_daily_stats ds
            WHERE ds.stat_date BETWEEN $1 AND $2
            {today_company_filter}
            """,
            *today_params,
        )

        # --- Overview: date range ---
        range_row = await conn.fetchrow(
            f"""
            SELECT
                COUNT(DISTINCT ds.user_id) as active_users_in_range,
                COALESCE(AVG(daily_active.cnt), 0) as avg_daily_active
            FROM public.analytics_daily_stats ds,
            LATERAL (
                SELECT COUNT(DISTINCT user_id) as cnt
                FROM public.analytics_daily_stats
                WHERE stat_date BETWEEN $1 AND $2
                {company_filter.replace('ds.', '')}
                GROUP BY stat_date
            ) daily_active
            WHERE ds.stat_date BETWEEN $1 AND $2
            {company_filter}
            """,
            *params,
        )

        # --- Daily trends ---
        trend_rows = await conn.fetch(
            f"""
            SELECT
                ds.stat_date::text as date,
                COUNT(DISTINCT ds.user_id) as active_users,
                COALESCE(AVG(ds.total_time_seconds), 0)::int as avg_time_seconds,
                COALESCE(SUM(ds.action_count), 0)::int as total_actions,
                COALESCE(SUM(ds.login_count), 0)::int as total_logins,
                COALESCE(SUM(ds.agent_time_seconds), 0)::int as agent_time_seconds,
                COALESCE(SUM(ds.app_time_seconds), 0)::int as app_time_seconds
            FROM public.analytics_daily_stats ds
            WHERE ds.stat_date BETWEEN $1 AND $2
            {company_filter}
            GROUP BY ds.stat_date
            ORDER BY ds.stat_date
            """,
            *params,
        )

        # --- Top users (in range) ---
        top_idx = len(params) + 1
        top_params = list(params) + [10]
        top_rows = await conn.fetch(
            f"""
            SELECT
                ds.user_id,
                u.email,
                COALESCE(u.first_name || ' ' || u.last_name, u.email) as name,
                c.name as company_name,
                ds.company_id,
                SUM(ds.total_time_seconds) as total_time_seconds,
                SUM(ds.agent_time_seconds) as agent_time_seconds,
                SUM(ds.app_time_seconds) as app_time_seconds,
                SUM(ds.action_count) as total_actions,
                SUM(ds.login_count) as total_logins,
                MAX(ds.stat_date) as last_active_date
            FROM public.analytics_daily_stats ds
            JOIN public.users u ON ds.user_id = u.id
            LEFT JOIN public.companies c ON ds.company_id = c.id
            WHERE ds.stat_date BETWEEN $1 AND $2
            {company_filter}
            GROUP BY ds.user_id, u.email, u.first_name, u.last_name, c.name, ds.company_id
            ORDER BY total_time_seconds DESC
            LIMIT ${top_idx}
            """,
            *top_params,
        )

        overview = AnalyticsOverview(
            activeUsersToday=today_row["active_users"] if today_row else 0,
            avgTimePerUserSeconds=today_row["avg_time"] if today_row else 0,
            totalActionsToday=today_row["total_actions"] if today_row else 0,
            totalLoginsToday=today_row["total_logins"] if today_row else 0,
            totalAgentTimeToday=today_row["agent_time"] if today_row else 0,
            totalAppTimeToday=today_row["app_time"] if today_row else 0,
            activeUsersInRange=range_row["active_users_in_range"] if range_row else 0,
            avgDailyActiveUsers=float(range_row["avg_daily_active"]) if range_row else 0.0,
        )

        daily_trends = [
            DailyTrend(
                date=row["date"],
                activeUsers=row["active_users"],
                avgTimeSeconds=row["avg_time_seconds"],
                totalActions=row["total_actions"],
                totalLogins=row["total_logins"],
                agentTimeSeconds=row["agent_time_seconds"],
                appTimeSeconds=row["app_time_seconds"],
            )
            for row in trend_rows
        ]

        top_users = [
            UserUsageStats(
                userId=row["user_id"],
                email=row["email"],
                name=row["name"],
                companyName=row["company_name"],
                companyId=row["company_id"],
                totalTimeSeconds=row["total_time_seconds"] or 0,
                agentTimeSeconds=row["agent_time_seconds"] or 0,
                appTimeSeconds=row["app_time_seconds"] or 0,
                totalActions=row["total_actions"] or 0,
                totalLogins=row["total_logins"] or 0,
                lastActiveDate=str(row["last_active_date"]) if row["last_active_date"] else None,
            )
            for row in top_rows
        ]

        return AnalyticsDashboardResponse(
            overview=overview,
            dailyTrends=daily_trends,
            topUsers=top_users,
        )


# --- Background cleanup ---

async def start_heartbeat_cleanup_task():
    """Periodically prune old heartbeat records (older than 30 days)."""
    while True:
        try:
            await asyncio.sleep(86400)  # Run once per day
            pool = await get_db_pool()
            async with pool.acquire() as conn:
                result = await conn.execute(
                    "DELETE FROM public.analytics_heartbeats WHERE created_at < now() - interval '30 days'"
                )
                logger.info(f"Analytics cleanup: pruned old heartbeat records ({result})")
        except asyncio.CancelledError:
            break
        except Exception as e:
            logger.warning(f"Heartbeat cleanup error: {e}")
