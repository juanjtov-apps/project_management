"""
Activities API endpoints for Proesphere.
Provides recent activity feed for dashboard.
"""

from fastapi import APIRouter, HTTPException, status, Depends, Request
from typing import List, Dict, Any
from datetime import datetime, timedelta
import asyncpg
from ..database.connection import get_db_pool
from .auth import get_current_user_dependency

router = APIRouter(prefix="/activities", tags=["activities"])

@router.get("", response_model=List[Dict[str, Any]])
async def get_activities(request: Request, current_user: Dict[str, Any] = Depends(get_current_user_dependency)):
    """Get recent activities for the user's company."""
    try:
        pool = await get_db_pool()
        async with pool.acquire() as conn:
            company_id = current_user.get("company_id")
            
            # Get recent activities from multiple sources
            activities = []
            
            # 1. Project logs as activities
            project_logs = await conn.fetch("""
                SELECT 
                    pl.id,
                    pl.user_id,
                    $1 as company_id,
                    'project_log_created' as action_type,
                    pl.title as description,
                    'project_log' as entity_type,
                    pl.id as entity_id,
                    pl.created_at,
                    u.first_name,
                    u.email
                FROM project_logs pl
                LEFT JOIN users u ON pl.user_id = u.id
                LEFT JOIN projects p ON pl.project_id = p.id
                WHERE u.company_id = $1
                ORDER BY pl.created_at DESC
                LIMIT 10
            """, company_id)
            
            for log in project_logs:
                activities.append(dict(log))
            
            # 2. Recent task completions
            task_activities = await conn.fetch("""
                SELECT 
                    t.id,
                    t.assignee_id as user_id,
                    $1 as company_id,
                    CASE WHEN t.status = 'completed' THEN 'task_completed' ELSE 'task_updated' END as action_type,
                    'Updated: ' || t.title as description,
                    'task' as entity_type,
                    t.id as entity_id,
                    t.created_at,
                    u.first_name,
                    u.email
                FROM tasks t
                LEFT JOIN users u ON t.assignee_id = u.id
                WHERE t.company_id = $1 AND t.created_at > NOW() - INTERVAL '7 days'
                ORDER BY t.created_at DESC
                LIMIT 5
            """, company_id)
            
            for task in task_activities:
                activities.append(dict(task))
            
            # 3. Recent project updates (simplified since no created_by column)
            project_activities = await conn.fetch("""
                SELECT 
                    p.id,
                    NULL as user_id,
                    $1 as company_id,
                    'project_created' as action_type,
                    'Project Created: ' || p.name as description,
                    'project' as entity_type,
                    p.id as entity_id,
                    p.created_at,
                    'System' as first_name,
                    'system@proesphere.com' as email
                FROM projects p
                WHERE p.company_id = $1 AND p.created_at > NOW() - INTERVAL '7 days'
                ORDER BY p.created_at DESC
                LIMIT 5
            """, company_id)
            
            for project in project_activities:
                activities.append(dict(project))
            
            # Sort all activities by date and return top 20
            activities.sort(key=lambda x: x['created_at'], reverse=True)
            return activities[:20]
            
    except Exception as e:
        print(f"Activities error: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to fetch activities"
        )