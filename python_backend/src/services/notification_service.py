"""
Notification Service for PM Notifications System
Handles creation, retrieval, and management of notifications
"""

import asyncpg
from typing import List, Dict, Optional, Any
from uuid import UUID
from datetime import datetime


class NotificationService:
    """Service for managing project manager notifications."""
    
    def __init__(self, db_pool):
        self.db_pool = db_pool
    
    async def create_notification(
        self,
        project_id: str,
        recipient_user_id: str,
        notification_type: str,  # 'issue_created' or 'message_posted'
        source_kind: str,  # 'issue' or 'message'
        source_id: str,
        title: str,
        body: Optional[str] = None
    ) -> Optional[Dict]:
        """Create a new notification."""
        query = """
            INSERT INTO client_portal.pm_notifications
            (project_id, recipient_user_id, type, source_kind, source_id, title, body)
            VALUES ($1, $2, $3, $4, $5, $6, $7)
            RETURNING *
        """
        
        async with self.db_pool.acquire() as conn:
            row = await conn.fetchrow(
                query,
                project_id,
                recipient_user_id,
                notification_type,
                source_kind,
                source_id,
                title,
                body
            )
            return dict(row) if row else None
    
    async def list_notifications(
        self,
        recipient_user_id: str,
        limit: int = 20,
        cursor: Optional[str] = None,
        is_read: Optional[bool] = None
    ) -> Dict:
        """List notifications for a user with cursor pagination."""
        
        # Build query conditions
        conditions = ["recipient_user_id = $1"]
        params: List[Any] = [recipient_user_id]
        param_count = 1
        
        if cursor:
            param_count += 1
            conditions.append(f"created_at < (SELECT created_at FROM client_portal.pm_notifications WHERE id = ${param_count})")
            params.append(cursor)
        
        if is_read is not None:
            param_count += 1
            conditions.append(f"is_read = ${param_count}")
            params.append(is_read)
        
        where_clause = " AND ".join(conditions)
        param_count += 1
        
        query = f"""
            SELECT *
            FROM client_portal.pm_notifications
            WHERE {where_clause}
            ORDER BY created_at DESC
            LIMIT ${param_count}
        """
        params.append(limit + 1)  # Fetch one extra to determine if there's a next page
        
        async with self.db_pool.acquire() as conn:
            rows = await conn.fetch(query, *params)
            
            has_more = len(rows) > limit
            items = [dict(row) for row in rows[:limit]]
            next_cursor = str(items[-1]['id']) if has_more and items else None
            
            return {
                "items": items,
                "next_cursor": next_cursor
            }
    
    async def mark_read(self, notification_id: str, recipient_user_id: str) -> bool:
        """Mark a single notification as read."""
        query = """
            UPDATE client_portal.pm_notifications
            SET is_read = TRUE
            WHERE id = $1 AND recipient_user_id = $2
            RETURNING id
        """
        
        async with self.db_pool.acquire() as conn:
            row = await conn.fetchrow(query, notification_id, recipient_user_id)
            return row is not None
    
    async def mark_all_read(self, recipient_user_id: str) -> int:
        """Mark all notifications as read for a user. Returns count of updated notifications."""
        query = """
            UPDATE client_portal.pm_notifications
            SET is_read = TRUE
            WHERE recipient_user_id = $1 AND is_read = FALSE
            RETURNING id
        """
        
        async with self.db_pool.acquire() as conn:
            rows = await conn.fetch(query, recipient_user_id)
            return len(rows)
    
    async def unread_count(self, recipient_user_id: str) -> int:
        """Get count of unread notifications for a user."""
        query = """
            SELECT COUNT(*) as count
            FROM client_portal.pm_notifications
            WHERE recipient_user_id = $1 AND is_read = FALSE
        """
        
        async with self.db_pool.acquire() as conn:
            row = await conn.fetchrow(query, recipient_user_id)
            return row['count'] if row else 0
    
    async def get_notification_by_id(self, notification_id: str, recipient_user_id: str) -> Optional[Dict]:
        """Get a single notification by ID (with access control)."""
        query = """
            SELECT *
            FROM client_portal.pm_notifications
            WHERE id = $1 AND recipient_user_id = $2
        """
        
        async with self.db_pool.acquire() as conn:
            row = await conn.fetchrow(query, notification_id, recipient_user_id)
            return dict(row) if row else None
    
    def generate_route_path(self, notification: Dict) -> str:
        """Generate deep link route path based on notification type."""
        project_id = notification['project_id']
        source_kind = notification['source_kind']
        source_id = notification['source_id']
        
        if source_kind == 'issue':
            # Route to client portal issues tab with issue ID
            return f"/client-portal?project={project_id}&tab=issues&issue={source_id}"
        elif source_kind == 'message':
            # Route to client portal forum tab with message focus
            return f"/client-portal?project={project_id}&tab=forum&focus={source_id}"
        
        # Fallback to project client portal
        return f"/client-portal?project={project_id}"
