"""
Activities API endpoints for Proesphere.
Provides recent activity feed for dashboard.
"""

from fastapi import APIRouter, HTTPException, status, Depends, Request
from typing import List, Dict, Any
from datetime import datetime, timedelta
import asyncpg
from ..database.connection import get_db_pool
from .auth import get_current_user_dependency, is_root_admin

router = APIRouter(prefix="/activities", tags=["activities"])

@router.get("", response_model=List[Dict[str, Any]])
async def get_activities(request: Request, current_user: Dict[str, Any] = Depends(get_current_user_dependency)):
    """Get recent activities for the user's company."""
    try:
        pool = await get_db_pool()
        async with pool.acquire() as conn:
            # Apply company filtering unless root admin
            company_id = None
            if not is_root_admin(current_user):
                # Try both camelCase and snake_case for compatibility
                company_id = current_user.get("companyId") or current_user.get("company_id")
                print(f"Activities: User {current_user.get('email')} - company: {company_id}")
                
                if not company_id:
                    print("Warning: User has no company_id, returning empty activities")
                    return []
            else:
                print(f"Activities: Root admin - retrieving all activities")
            
            # Get recent activities from multiple sources
            activities = []
            
            # 1. Project logs as activities
            if company_id:
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
            else:
                # Root admin - get all project logs
                project_logs = await conn.fetch("""
                    SELECT 
                        pl.id,
                        pl.user_id,
                        p.company_id,
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
                    ORDER BY pl.created_at DESC
                    LIMIT 10
                """)
            
            for log in project_logs:
                activities.append(dict(log))
            
            # 2. Recent task completions (tasks don't have company_id - join with projects)
            if company_id:
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
                    LEFT JOIN projects p ON t.project_id = p.id
                    WHERE p.company_id = $1 AND t.created_at > NOW() - INTERVAL '7 days'
                    ORDER BY t.created_at DESC
                    LIMIT 5
                """, company_id)
            else:
                # Root admin - get all task activities
                task_activities = await conn.fetch("""
                    SELECT 
                        t.id,
                        t.assignee_id as user_id,
                        p.company_id,
                        CASE WHEN t.status = 'completed' THEN 'task_completed' ELSE 'task_updated' END as action_type,
                        'Updated: ' || t.title as description,
                        'task' as entity_type,
                        t.id as entity_id,
                        t.created_at,
                        u.first_name,
                        u.email
                    FROM tasks t
                    LEFT JOIN users u ON t.assignee_id = u.id
                    LEFT JOIN projects p ON t.project_id = p.id
                    WHERE t.created_at > NOW() - INTERVAL '7 days'
                    ORDER BY t.created_at DESC
                    LIMIT 5
                """)
            
            for task in task_activities:
                activities.append(dict(task))
            
            # 3. Recent project updates (simplified since no created_by column)
            if company_id:
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
            else:
                # Root admin - get all project activities
                project_activities = await conn.fetch("""
                    SELECT 
                        p.id,
                        NULL as user_id,
                        p.company_id,
                        'project_created' as action_type,
                        'Project Created: ' || p.name as description,
                        'project' as entity_type,
                        p.id as entity_id,
                        p.created_at,
                        'System' as first_name,
                        'system@proesphere.com' as email
                    FROM projects p
                    WHERE p.created_at > NOW() - INTERVAL '7 days'
                    ORDER BY p.created_at DESC
                    LIMIT 5
                """)
            
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