from typing import List, Dict, Any, Optional
from fastapi import APIRouter, HTTPException, status, Depends, Query, UploadFile, File
from pydantic import BaseModel
from datetime import datetime, date
from urllib.parse import urlparse, unquote
from uuid import UUID
import asyncpg
from asyncpg.exceptions import UniqueViolationError, ForeignKeyViolationError
import json
import re

from src.database.connection import get_db_pool
from src.api.auth import get_current_user_dependency, is_root_admin
from src.services.notification_service import NotificationService
from src.core.storage import generate_signed_url, get_storage_config

router = APIRouter()

# ============================================================================
# PYDANTIC MODELS
# ============================================================================

class IssueCreate(BaseModel):
    project_id: str
    title: str
    description: str
    category: Optional[str] = None
    priority: Optional[str] = "medium"
    assigned_to: Optional[str] = None
    photos: Optional[List[str]] = None

class IssueUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    category: Optional[str] = None
    priority: Optional[str] = None
    assigned_to: Optional[str] = None
    photos: Optional[List[str]] = None  # New photos to add

class IssueCommentCreate(BaseModel):
    issue_id: str
    body: str

class ForumThreadCreate(BaseModel):
    project_id: str
    title: str

class ForumMessageCreate(BaseModel):
    project_id: str
    content: str

class MaterialCreate(BaseModel):
    project_id: str
    name: str
    spec: Optional[str] = None
    link: Optional[str] = None
    vendor: Optional[str] = None
    quantity: Optional[str] = None
    unit_cost: Optional[float] = None

class MaterialUpdate(BaseModel):
    name: Optional[str] = None
    spec: Optional[str] = None
    link: Optional[str] = None
    vendor: Optional[str] = None
    quantity: Optional[str] = None
    unit_cost: Optional[float] = None

class InstallmentCreate(BaseModel):
    project_id: str
    label: str
    due_date: date
    amount: float

class InstallmentUpdate(BaseModel):
    status: Optional[str] = None

class NotificationSettingCreate(BaseModel):
    project_id: str
    event: str
    channel: str = "email"
    cadence: str = "immediate"

class MaterialAreaCreate(BaseModel):
    project_id: str
    name: str
    description: Optional[str] = None
    sort_order: Optional[int] = 0

class MaterialAreaUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    sort_order: Optional[int] = None

class MaterialAreaDuplicate(BaseModel):
    new_name: str

class MaterialItemCreate(BaseModel):
    area_id: str
    project_id: str
    name: str
    spec: Optional[str] = None
    product_link: Optional[str] = None
    vendor: Optional[str] = None
    quantity: Optional[str] = None
    unit_cost: Optional[float] = None
    status: Optional[str] = "pending"
    stage_id: Optional[str] = None  # Link to project stage
    order_status: Optional[str] = "pending_to_order"  # 'pending_to_order' or 'ordered'

class MaterialItemUpdate(BaseModel):
    name: Optional[str] = None
    spec: Optional[str] = None
    product_link: Optional[str] = None
    vendor: Optional[str] = None
    quantity: Optional[str] = None
    unit_cost: Optional[float] = None
    status: Optional[str] = None
    stage_id: Optional[str] = None  # Link to project stage
    order_status: Optional[str] = None  # 'pending_to_order' or 'ordered'
    area_id: Optional[str] = None  # Move item to a different area

class PaymentScheduleCreate(BaseModel):
    project_id: str
    title: str
    notes: Optional[str] = None

class PaymentScheduleUpdate(BaseModel):
    title: Optional[str] = None
    notes: Optional[str] = None

class PaymentInstallmentCreate(BaseModel):
    project_id: str
    schedule_id: str
    name: str
    description: Optional[str] = None
    amount: float
    currency: str = "USD"
    due_date: Optional[date] = None
    status: str = "planned"
    next_milestone: bool = False
    display_order: int = 0

class PaymentInstallmentUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    amount: Optional[float] = None
    currency: Optional[str] = None
    due_date: Optional[date] = None
    status: Optional[str] = None
    next_milestone: Optional[bool] = None
    display_order: Optional[int] = None

class PaymentDocumentCreate(BaseModel):
    project_id: str
    schedule_id: Optional[str] = None
    title: str
    file_id: str

class PaymentReceiptCreate(BaseModel):
    project_id: str
    installment_id: str
    receipt_type: str
    reference_no: Optional[str] = None
    payment_date: Optional[date] = None
    file_id: str

class MarkPaidRequest(BaseModel):
    tax: Optional[float] = 0.0

# ============================================================================
# HELPER FUNCTIONS
# ============================================================================

async def verify_project_access(project_id: str, current_user: Dict[str, Any], pool: asyncpg.Pool) -> None:
    """Verify user has access to the specified project (company scoping)."""
    if is_root_admin(current_user):
        return
    
    async with pool.acquire() as conn:
        project = await conn.fetchrow(
            "SELECT company_id FROM public.projects WHERE id = $1",
            project_id
        )
        if not project:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Project not found"
            )
        
        # Try both camelCase and snake_case for compatibility
        user_company_id = str(current_user.get('company_id') or current_user.get('companyId') or '')
        project_company_id = str(project.get('company_id', ''))
        
        if project_company_id != user_company_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied: Project belongs to different company"
            )

def is_client_role(current_user: Dict[str, Any]) -> bool:
    """Check if user has client role."""
    user_role = str(current_user.get('role', '')).lower()
    return user_role == 'client'


def extract_object_path_from_url(url: str) -> str:
    """
    Extract the object path from a signed GCS URL.
    Example: https://storage.googleapis.com/bucket/.private/uploads/abc123.jpg?X-Goog-...
    Returns: .private/uploads/abc123.jpg
    """
    if not url:
        return url

    try:
        parsed = urlparse(url)
        path = unquote(parsed.path)

        # Remove leading slash and bucket name from path
        # Path format: /bucket-name/.private/uploads/filename.ext
        path_parts = path.strip('/').split('/', 1)
        if len(path_parts) > 1:
            return path_parts[1]  # Return everything after bucket name

        # If no bucket in path, return the path as-is (might be relative already)
        return path.strip('/')
    except Exception:
        # If parsing fails, return original URL
        return url


def serialize_for_json(obj):
    """Convert non-serializable types (UUID, datetime, date) for JSON."""
    if obj is None:
        return None
    if isinstance(obj, dict):
        return {k: serialize_for_json(v) for k, v in obj.items()}
    if isinstance(obj, list):
        return [serialize_for_json(item) for item in obj]
    if isinstance(obj, UUID):
        return str(obj)
    if isinstance(obj, datetime):
        return obj.isoformat()
    if isinstance(obj, date):
        return obj.isoformat()
    return obj


async def log_issue_action(
    conn: asyncpg.Connection,
    issue_id: str,
    project_id: str,
    action: str,
    actor_id: str,
    changes: Optional[Dict] = None,
    issue_snapshot: Optional[Dict] = None
):
    """Log an action on an issue to the audit log."""
    await conn.execute(
        """INSERT INTO client_portal.issue_audit_log
           (issue_id, project_id, action, actor_id, changes, issue_snapshot)
           VALUES ($1, $2, $3, $4, $5, $6)""",
        issue_id,
        project_id,
        action,
        actor_id,
        json.dumps(serialize_for_json(changes)) if changes else None,
        json.dumps(serialize_for_json(issue_snapshot)) if issue_snapshot else None
    )


async def notify_pms_and_admins(
    pool: asyncpg.Pool,
    project_id: str,
    notification_type: str,
    source_kind: str,
    source_id: str,
    title: str,
    body: Optional[str] = None
) -> int:
    """
    Create notifications for all PMs and admins in the same company as the project.
    Returns the count of notifications created.
    """
    service = NotificationService(pool)

    async with pool.acquire() as conn:
        # Get all project managers and admins for this project's company
        # Note: users table only has role_id, not a role text column
        managers = await conn.fetch("""
            SELECT DISTINCT u.id, COALESCE(NULLIF(CONCAT(u.first_name, ' ', u.last_name), ' '), u.email) as full_name
            FROM users u
            JOIN roles r ON u.role_id = r.id
            WHERE COALESCE(r.role_name, r.name) IN ('admin', 'project_manager')
            AND u.company_id = (
                SELECT company_id FROM projects WHERE id = $1
            )
        """, project_id)

        notifications_created = 0
        for manager in managers:
            notification = await service.create_notification(
                project_id=project_id,
                recipient_user_id=manager['id'],
                notification_type=notification_type,
                source_kind=source_kind,
                source_id=source_id,
                title=title,
                body=body
            )
            if notification:
                notifications_created += 1

        return notifications_created


async def notify_office_managers(
    pool: asyncpg.Pool,
    project_id: str,
    installment_id: str,
    title: str,
    body: str
) -> int:
    """
    Create notifications for all office managers in the same company as the project.
    Used to notify them that an invoice needs to be uploaded.
    Returns the count of notifications created.
    """
    service = NotificationService(pool)

    async with pool.acquire() as conn:
        # Get all office managers for this project's company
        # Also include admins as they may handle invoices too
        # Note: users table only has role_id, not a role text column
        office_managers = await conn.fetch("""
            SELECT DISTINCT u.id, COALESCE(NULLIF(CONCAT(u.first_name, ' ', u.last_name), ' '), u.email) as full_name
            FROM users u
            JOIN roles r ON u.role_id = r.id
            WHERE COALESCE(r.role_name, r.name) IN ('office_manager', 'admin')
            AND u.company_id = (
                SELECT company_id FROM projects WHERE id = $1
            )
        """, project_id)

        notifications_created = 0
        for manager in office_managers:
            notification = await service.create_notification(
                project_id=project_id,
                recipient_user_id=manager['id'],
                notification_type='installment_paid',
                source_kind='payment',
                source_id=installment_id,
                title=title,
                body=body
            )
            if notification:
                notifications_created += 1

        return notifications_created


async def get_user_accessible_projects(current_user: Dict[str, Any], pool: asyncpg.Pool) -> List[str]:
    """Get list of project IDs accessible to the current user."""
    if is_root_admin(current_user):
        async with pool.acquire() as conn:
            rows = await conn.fetch("SELECT id FROM public.projects")
            return [row['id'] for row in rows]

    # Check if user is a client - they only see their assigned project
    user_role = str(current_user.get('role', '')).lower()
    assigned_project_id = current_user.get('assignedProjectId') or current_user.get('assigned_project_id')

    if user_role == 'client':
        if assigned_project_id:
            return [assigned_project_id]
        else:
            return []

    # Try both camelCase and snake_case for compatibility
    user_company_id = str(current_user.get('companyId') or current_user.get('company_id') or '')

    if not user_company_id:
        return []

    async with pool.acquire() as conn:
        rows = await conn.fetch(
            "SELECT id FROM public.projects WHERE company_id = $1",
            user_company_id
        )
        return [row['id'] for row in rows]

# ============================================================================
# ISSUES ENDPOINTS
# ============================================================================

@router.get("/client-issues")
async def get_issues(
    project_id: Optional[str] = Query(None),
    current_user: Dict[str, Any] = Depends(get_current_user_dependency),
    pool: asyncpg.Pool = Depends(get_db_pool)
):
    """Get all issues, optionally filtered by project."""
    accessible_projects = await get_user_accessible_projects(current_user, pool)
    
    if not accessible_projects:
        return []
    
    async with pool.acquire() as conn:
        if project_id:
            # Verify access to specific project
            if project_id not in accessible_projects:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Access denied"
                )
            rows = await conn.fetch(
                """SELECT i.*,
                   COALESCE(NULLIF(CONCAT(u.first_name, ' ', u.last_name), ' '), u.email) as created_by_name,
                   COALESCE(NULLIF(CONCAT(r.first_name, ' ', r.last_name), ' '), r.email) as resolved_by_name,
                   (SELECT COUNT(*) FROM client_portal.issue_comments WHERE issue_id = i.id) as comment_count,
                   (SELECT COUNT(*) FROM client_portal.issue_attachments WHERE issue_id = i.id) as attachment_count,
                   COALESCE(
                       (SELECT array_agg(url) FROM client_portal.issue_attachments WHERE issue_id = i.id),
                       ARRAY[]::text[]
                   ) as photos
                   FROM client_portal.issues i
                   LEFT JOIN public.users u ON i.created_by = u.id
                   LEFT JOIN public.users r ON i.resolved_by = r.id
                   WHERE i.project_id = $1
                   ORDER BY i.created_at DESC""",
                project_id
            )
        else:
            rows = await conn.fetch(
                """SELECT i.*,
                   COALESCE(NULLIF(CONCAT(u.first_name, ' ', u.last_name), ' '), u.email) as created_by_name,
                   COALESCE(NULLIF(CONCAT(r.first_name, ' ', r.last_name), ' '), r.email) as resolved_by_name,
                   (SELECT COUNT(*) FROM client_portal.issue_comments WHERE issue_id = i.id) as comment_count,
                   (SELECT COUNT(*) FROM client_portal.issue_attachments WHERE issue_id = i.id) as attachment_count,
                   COALESCE(
                       (SELECT array_agg(url) FROM client_portal.issue_attachments WHERE issue_id = i.id),
                       ARRAY[]::text[]
                   ) as photos
                   FROM client_portal.issues i
                   LEFT JOIN public.users u ON i.created_by = u.id
                   LEFT JOIN public.users r ON i.resolved_by = r.id
                   WHERE i.project_id = ANY($1::varchar[])
                   ORDER BY i.created_at DESC""",
                accessible_projects
            )

        # Debug logging for photo data
        result = [dict(row) for row in rows]
        return result

@router.post("/client-issues")
async def create_issue(
    issue: IssueCreate,
    current_user: Dict[str, Any] = Depends(get_current_user_dependency),
    pool: asyncpg.Pool = Depends(get_db_pool)
):
    """Create a new issue."""
    await verify_project_access(issue.project_id, current_user, pool)
    
    async with pool.acquire() as conn:
        row = await conn.fetchrow(
            """INSERT INTO client_portal.issues (project_id, created_by, assigned_to, title, description, category, priority, status)
               VALUES ($1, $2, $3, $4, $5, $6, $7, 'open')
               RETURNING *""",
            issue.project_id,
            current_user['id'],
            issue.assigned_to,
            issue.title,
            issue.description,
            issue.category,
            issue.priority
        )
        issue_data = dict(row)

        # Save photo attachments if provided - frontend sends object paths directly
        if issue.photos:
            for photo_path in issue.photos:
                await conn.execute(
                    """INSERT INTO client_portal.issue_attachments (issue_id, url, uploaded_by)
                       VALUES ($1, $2, $3)""",
                    issue_data['id'],
                    photo_path,
                    current_user['id']
                )

        # Log the creation in audit log
        await log_issue_action(
            conn=conn,
            issue_id=str(issue_data['id']),
            project_id=issue.project_id,
            action='created',
            actor_id=current_user['id'],
            issue_snapshot=issue_data
        )

    # Send notification to PMs/admins if creator is a client
    if is_client_role(current_user):
        await notify_pms_and_admins(
            pool=pool,
            project_id=issue.project_id,
            notification_type='issue_created',
            source_kind='issue',
            source_id=str(issue_data['id']),
            title=f"New Issue: {issue.title[:50]}",
            body=issue.description[:200] if issue.description else None
        )

    return issue_data

@router.patch("/client-issues/{issue_id}")
async def update_issue(
    issue_id: str,
    status_update: str = Query(..., alias="status"),
    current_user: Dict[str, Any] = Depends(get_current_user_dependency),
    pool: asyncpg.Pool = Depends(get_db_pool)
):
    """Update issue status."""
    async with pool.acquire() as conn:
        # Get current issue state for audit log
        issue = await conn.fetchrow(
            "SELECT * FROM client_portal.issues WHERE id = $1",
            issue_id
        )
        if not issue:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Issue not found")

        await verify_project_access(issue['project_id'], current_user, pool)

        old_status = issue['status']

        # Check if this is a close/resolve action
        is_resolving = status_update.lower() in ('closed', 'resolved')

        # If reopening a closed issue, only admins can do it
        user_role = str(current_user.get('role', '')).lower()
        if not is_resolving and old_status == 'closed':
            if user_role != 'admin':
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Only admins can reopen closed issues"
                )

        if is_resolving:
            # Update with resolution info
            row = await conn.fetchrow(
                """UPDATE client_portal.issues
                   SET status = $1, resolved_by = $2, resolved_at = NOW()
                   WHERE id = $3
                   RETURNING *""",
                status_update,
                current_user['id'],
                issue_id
            )
        else:
            # Regular status update (e.g., reopening) - clear resolution info
            row = await conn.fetchrow(
                """UPDATE client_portal.issues
                   SET status = $1, resolved_by = NULL, resolved_at = NULL
                   WHERE id = $2
                   RETURNING *""",
                status_update,
                issue_id
            )

        issue_data = dict(row)

        # Log the status change in audit log
        await log_issue_action(
            conn=conn,
            issue_id=issue_id,
            project_id=issue['project_id'],
            action='edited',
            actor_id=current_user['id'],
            changes={'status': {'old': old_status, 'new': status_update}},
            issue_snapshot=issue_data
        )

    # Send notification when issue is closed
    if is_resolving:
        # Build resolver name from available fields
        first = current_user.get('first_name', '')
        last = current_user.get('last_name', '')
        resolver_name = f"{first} {last}".strip()
        if not resolver_name:
            resolver_name = current_user.get('email', 'a user')

        await notify_pms_and_admins(
            pool=pool,
            project_id=issue['project_id'],
            notification_type='issue_created',  # Using existing type - title indicates it's resolved
            source_kind='issue',
            source_id=issue_id,
            title=f"Issue Resolved: {issue['title'][:50]}",
            body=f"Marked as resolved by {resolver_name}"
        )

    return issue_data


@router.put("/client-issues/{issue_id}")
async def edit_issue(
    issue_id: str,
    update: IssueUpdate,
    current_user: Dict[str, Any] = Depends(get_current_user_dependency),
    pool: asyncpg.Pool = Depends(get_db_pool)
):
    """Edit an issue's details."""
    async with pool.acquire() as conn:
        # Get current issue state
        issue = await conn.fetchrow(
            "SELECT * FROM client_portal.issues WHERE id = $1",
            issue_id
        )
        if not issue:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Issue not found")

        await verify_project_access(issue['project_id'], current_user, pool)

        # Build dynamic update query
        updates = []
        params = []
        param_idx = 1
        changes = {"old": {}, "new": {}}

        for field in ['title', 'description', 'category', 'priority', 'assigned_to']:
            new_value = getattr(update, field, None)
            if new_value is not None:
                updates.append(f"{field} = ${param_idx}")
                params.append(new_value)
                param_idx += 1
                changes["old"][field] = issue[field]
                changes["new"][field] = new_value

        if not updates:
            # No updates provided, just return current issue
            return dict(issue)

        # Add updated_at
        updates.append(f"updated_at = NOW()")

        # Build and execute query
        query = f"""UPDATE client_portal.issues
                    SET {', '.join(updates)}
                    WHERE id = ${param_idx}
                    RETURNING *"""
        params.append(issue_id)

        row = await conn.fetchrow(query, *params)
        issue_data = dict(row)

        # Handle new photos if provided - frontend sends object paths directly
        if update.photos:
            for photo_path in update.photos:
                # Frontend sends object paths directly (e.g., ".private/uploads/uuid")
                await conn.execute(
                    """INSERT INTO client_portal.issue_attachments (issue_id, url, uploaded_by)
                       VALUES ($1, $2, $3)""",
                    issue_id,
                    photo_path,
                    current_user['id']
                )

        # Log the edit in audit log
        await log_issue_action(
            conn=conn,
            issue_id=issue_id,
            project_id=issue['project_id'],
            action='edited',
            actor_id=current_user['id'],
            changes=changes,
            issue_snapshot=issue_data
        )

    # Send notification to PMs/admins if editor is a client
    if is_client_role(current_user):
        changed_fields = list(changes.get("new", {}).keys())
        await notify_pms_and_admins(
            pool=pool,
            project_id=issue['project_id'],
            notification_type='issue_created',  # Using existing type - title indicates it's an update
            source_kind='issue',
            source_id=issue_id,
            title=f"Issue Updated: {issue['title'][:50]}",
            body=f"Fields changed: {', '.join(changed_fields)}" if changed_fields else None
        )

    return issue_data


@router.delete("/client-issues/{issue_id}")
async def delete_issue(
    issue_id: str,
    current_user: Dict[str, Any] = Depends(get_current_user_dependency),
    pool: asyncpg.Pool = Depends(get_db_pool)
):
    """Delete an issue."""
    async with pool.acquire() as conn:
        # Get current issue state for audit log
        issue = await conn.fetchrow(
            "SELECT * FROM client_portal.issues WHERE id = $1",
            issue_id
        )
        if not issue:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Issue not found")

        await verify_project_access(issue['project_id'], current_user, pool)

        # Get attachments for snapshot
        attachments = await conn.fetch(
            "SELECT * FROM client_portal.issue_attachments WHERE issue_id = $1",
            issue_id
        )

        # Create snapshot with attachments
        issue_snapshot = dict(issue)
        issue_snapshot['attachments'] = [dict(a) for a in attachments]

        # Log the deletion BEFORE deleting (to preserve the data)
        await log_issue_action(
            conn=conn,
            issue_id=issue_id,
            project_id=issue['project_id'],
            action='deleted',
            actor_id=current_user['id'],
            issue_snapshot=issue_snapshot
        )

        # Delete the issue (cascade will delete attachments and comments)
        await conn.execute(
            "DELETE FROM client_portal.issues WHERE id = $1",
            issue_id
        )

        return {"success": True, "message": "Issue deleted successfully"}


@router.get("/client-issues/{issue_id}/photos")
async def get_issue_photos(
    issue_id: str,
    current_user: Dict[str, Any] = Depends(get_current_user_dependency),
    pool: asyncpg.Pool = Depends(get_db_pool)
):
    """Get fresh signed URLs for issue photos."""
    async with pool.acquire() as conn:
        # Get issue to verify access
        issue = await conn.fetchrow(
            "SELECT project_id FROM client_portal.issues WHERE id = $1",
            issue_id
        )
        if not issue:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Issue not found")

        await verify_project_access(issue['project_id'], current_user, pool)

        # Get attachments
        attachments = await conn.fetch(
            "SELECT id, url, created_at FROM client_portal.issue_attachments WHERE issue_id = $1 ORDER BY created_at",
            issue_id
        )

        # Generate fresh signed URLs for each attachment
        storage_config = get_storage_config()
        bucket_id = storage_config['bucket_id']

        photos = []
        for attachment in attachments:
            object_path = attachment['url']
            try:
                signed_url = await generate_signed_url(
                    bucket_id,
                    object_path,
                    method="GET",
                    expires_minutes=60
                )
                photos.append({
                    "id": str(attachment['id']),
                    "url": signed_url,
                    "created_at": attachment['created_at'].isoformat() if attachment['created_at'] else None
                })
            except Exception:
                # If signing fails, skip this photo
                continue

        return {"photos": photos}


@router.delete("/client-issues/{issue_id}/photos/{photo_id}")
async def delete_issue_photo(
    issue_id: str,
    photo_id: str,
    current_user: Dict[str, Any] = Depends(get_current_user_dependency),
    pool: asyncpg.Pool = Depends(get_db_pool)
):
    """Delete a photo from an issue."""
    async with pool.acquire() as conn:
        # Get issue to verify access
        issue = await conn.fetchrow(
            "SELECT project_id FROM client_portal.issues WHERE id = $1",
            issue_id
        )
        if not issue:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Issue not found")

        await verify_project_access(issue['project_id'], current_user, pool)

        # Verify photo belongs to this issue
        photo = await conn.fetchrow(
            "SELECT id FROM client_portal.issue_attachments WHERE id = $1 AND issue_id = $2",
            photo_id,
            issue_id
        )
        if not photo:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Photo not found")

        # Delete the photo
        await conn.execute(
            "DELETE FROM client_portal.issue_attachments WHERE id = $1",
            photo_id
        )

        return {"success": True, "message": "Photo deleted successfully"}


@router.get("/client-issues/{issue_id}/history")
async def get_issue_history(
    issue_id: str,
    current_user: Dict[str, Any] = Depends(get_current_user_dependency),
    pool: asyncpg.Pool = Depends(get_db_pool)
):
    """Get audit history for an issue. Only admins and project managers can view."""
    # Check if user is admin or project manager
    user_role = str(current_user.get('role', '')).lower()
    if user_role not in ('admin', 'project_manager'):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only admins and project managers can view issue history"
        )

    async with pool.acquire() as conn:
        # Get the issue to verify project access
        issue = await conn.fetchrow("SELECT project_id FROM client_portal.issues WHERE id = $1", issue_id)
        if not issue:
            raise HTTPException(status_code=404, detail="Issue not found")
        await verify_project_access(issue['project_id'], current_user, pool)

        # Get audit log entries with actor name
        rows = await conn.fetch(
            """SELECT
                   l.id,
                   l.issue_id,
                   l.action,
                   l.changes,
                   l.issue_snapshot,
                   l.created_at,
                   l.actor_id,
                   COALESCE(NULLIF(CONCAT(u.first_name, ' ', u.last_name), ' '), u.email) as actor_name
               FROM client_portal.issue_audit_log l
               LEFT JOIN public.users u ON l.actor_id = u.id
               WHERE l.issue_id = $1
               ORDER BY l.created_at DESC""",
            issue_id
        )

        return [dict(row) for row in rows]


@router.get("/client-issues/{issue_id}/comments")
async def get_issue_comments(
    issue_id: str,
    current_user: Dict[str, Any] = Depends(get_current_user_dependency),
    pool: asyncpg.Pool = Depends(get_db_pool)
):
    """Get comments for an issue."""
    async with pool.acquire() as conn:
        # Get the issue to verify project access
        issue = await conn.fetchrow("SELECT project_id FROM client_portal.issues WHERE id = $1", issue_id)
        if not issue:
            raise HTTPException(status_code=404, detail="Issue not found")
        await verify_project_access(issue['project_id'], current_user, pool)
        
        rows = await conn.fetch(
            """SELECT c.*, CONCAT(u.first_name, ' ', u.last_name) as author_name
               FROM client_portal.issue_comments c
               LEFT JOIN public.users u ON c.author_id = u.id
               WHERE c.issue_id = $1
               ORDER BY c.created_at ASC""",
            issue_id
        )
        return [dict(row) for row in rows]

@router.post("/client-issues/{issue_id}/comments")
async def create_issue_comment(
    issue_id: str,
    comment: IssueCommentCreate,
    current_user: Dict[str, Any] = Depends(get_current_user_dependency),
    pool: asyncpg.Pool = Depends(get_db_pool)
):
    """Add a comment to an issue."""
    async with pool.acquire() as conn:
        # Get the issue to verify project access
        issue = await conn.fetchrow("SELECT project_id FROM client_portal.issues WHERE id = $1", issue_id)
        if not issue:
            raise HTTPException(status_code=404, detail="Issue not found")
        await verify_project_access(issue['project_id'], current_user, pool)
        
        row = await conn.fetchrow(
            """INSERT INTO client_portal.issue_comments (issue_id, author_id, body)
               VALUES ($1, $2, $3)
               RETURNING *""",
            issue_id,
            current_user['id'],
            comment.body
        )
        return dict(row)

# ============================================================================
# FORUM ENDPOINTS
# ============================================================================

@router.get("/client-forum")
async def get_forum_messages(
    project_id: Optional[str] = Query(None),
    current_user: Dict[str, Any] = Depends(get_current_user_dependency),
    pool: asyncpg.Pool = Depends(get_db_pool)
):
    """Get forum messages for a project (simplified - returns messages directly)."""
    accessible_projects = await get_user_accessible_projects(current_user, pool)
    
    if not accessible_projects:
        return []
    
    async with pool.acquire() as conn:
        if project_id:
            if project_id not in accessible_projects:
                raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")
            # Get messages from the auto-thread for this project
            rows = await conn.fetch(
                """SELECT m.*, CONCAT(u.first_name, ' ', u.last_name) as author_name, m.author_id as authorId, m.body as content, t.project_id as projectId
                   FROM client_portal.forum_messages m
                   LEFT JOIN public.users u ON m.author_id = u.id
                   LEFT JOIN client_portal.forum_threads t ON m.thread_id = t.id
                   WHERE t.project_id = $1
                   ORDER BY m.created_at ASC""",
                project_id
            )
        else:
            rows = await conn.fetch(
                """SELECT m.*, CONCAT(u.first_name, ' ', u.last_name) as author_name, m.author_id as authorId, m.body as content, t.project_id as projectId
                   FROM client_portal.forum_messages m
                   LEFT JOIN public.users u ON m.author_id = u.id
                   LEFT JOIN client_portal.forum_threads t ON m.thread_id = t.id
                   WHERE t.project_id = ANY($1::varchar[])
                   ORDER BY m.created_at ASC""",
                accessible_projects
            )
        return [dict(row) for row in rows]

@router.post("/client-forum")
async def create_forum_message(
    message: ForumMessageCreate,
    current_user: Dict[str, Any] = Depends(get_current_user_dependency),
    pool: asyncpg.Pool = Depends(get_db_pool)
):
    """Create a new forum message (simplified - no threads)."""
    await verify_project_access(message.project_id, current_user, pool)
    
    async with pool.acquire() as conn:
        # Get or create an auto-thread for this project
        thread = await conn.fetchrow(
            "SELECT id FROM client_portal.forum_threads WHERE project_id = $1 LIMIT 1",
            message.project_id
        )
        
        if not thread:
            thread = await conn.fetchrow(
                """INSERT INTO client_portal.forum_threads (project_id, title, created_by)
                   VALUES ($1, $2, $3)
                   RETURNING id""",
                message.project_id,
                f"Project {message.project_id} Discussion",
                current_user['id']
            )
        
        # Create message in the thread
        msg_row = await conn.fetchrow(
            """INSERT INTO client_portal.forum_messages (thread_id, author_id, body)
               VALUES ($1, $2, $3)
               RETURNING *""",
            thread['id'],
            current_user['id'],
            message.content
        )
        return dict(msg_row)


# ============================================================================
# MATERIALS ENDPOINTS
# ============================================================================

@router.get("/client-materials")
async def get_materials(
    project_id: Optional[str] = Query(None),
    current_user: Dict[str, Any] = Depends(get_current_user_dependency),
    pool: asyncpg.Pool = Depends(get_db_pool)
):
    """Get materials, optionally filtered by project."""
    accessible_projects = await get_user_accessible_projects(current_user, pool)
    
    if not accessible_projects:
        return []
    
    async with pool.acquire() as conn:
        if project_id:
            if project_id not in accessible_projects:
                raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")
            rows = await conn.fetch(
                """SELECT m.*, COALESCE(NULLIF(CONCAT(u.first_name, ' ', u.last_name), ' '), u.email) as added_by_name
                   FROM client_portal.materials m
                   LEFT JOIN public.users u ON m.added_by = u.id
                   WHERE m.project_id = $1
                   ORDER BY m.created_at DESC""",
                project_id
            )
        else:
            rows = await conn.fetch(
                """SELECT m.*, COALESCE(NULLIF(CONCAT(u.first_name, ' ', u.last_name), ' '), u.email) as added_by_name
                   FROM client_portal.materials m
                   LEFT JOIN public.users u ON m.added_by = u.id
                   WHERE m.project_id = ANY($1::varchar[])
                   ORDER BY m.created_at DESC""",
                accessible_projects
            )
        return [dict(row) for row in rows]

@router.post("/client-materials")
async def create_material(
    material: MaterialCreate,
    current_user: Dict[str, Any] = Depends(get_current_user_dependency),
    pool: asyncpg.Pool = Depends(get_db_pool)
):
    """Create a new material."""
    await verify_project_access(material.project_id, current_user, pool)
    
    async with pool.acquire() as conn:
        row = await conn.fetchrow(
            """INSERT INTO client_portal.materials 
               (project_id, added_by, name, spec, link, vendor, qty, unit_price)
               VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
               RETURNING *""",
            material.project_id,
            current_user['id'],
            material.name,
            material.spec,
            material.link,
            material.vendor,
            material.quantity,
            material.unit_cost
        )
        return dict(row)

@router.patch("/client-materials/{material_id}")
async def update_material(
    material_id: str,
    update: MaterialUpdate,
    current_user: Dict[str, Any] = Depends(get_current_user_dependency),
    pool: asyncpg.Pool = Depends(get_db_pool)
):
    """Update a material."""
    async with pool.acquire() as conn:
        # Build update query dynamically
        updates = []
        values = []
        param_count = 1
        
        if update.name is not None:
            updates.append(f"name = ${param_count}")
            values.append(update.name)
            param_count += 1
        if update.spec is not None:
            updates.append(f"spec = ${param_count}")
            values.append(update.spec)
            param_count += 1
        if update.link is not None:
            updates.append(f"link = ${param_count}")
            values.append(update.link)
            param_count += 1
        if update.vendor is not None:
            updates.append(f"vendor = ${param_count}")
            values.append(update.vendor)
            param_count += 1
        if update.quantity is not None:
            updates.append(f"qty = ${param_count}")
            values.append(update.quantity)
            param_count += 1
        if update.unit_cost is not None:
            updates.append(f"unit_price = ${param_count}")
            values.append(update.unit_cost)
            param_count += 1
        
        if not updates:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="No fields to update")
        
        values.append(material_id)
        query = f"UPDATE client_portal.materials SET {', '.join(updates)} WHERE id = ${param_count} RETURNING *"
        
        row = await conn.fetchrow(query, *values)
        if not row:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Material not found")
        return dict(row)

@router.delete("/client-materials/{material_id}")
async def delete_material(
    material_id: str,
    current_user: Dict[str, Any] = Depends(get_current_user_dependency),
    pool: asyncpg.Pool = Depends(get_db_pool)
):
    """Delete a material."""
    async with pool.acquire() as conn:
        await conn.execute(
            "DELETE FROM client_portal.materials WHERE id = $1",
            material_id
        )
        return {"success": True}

# ============================================================================
# INSTALLMENTS ENDPOINTS
# ============================================================================

@router.get("/client-installments")
async def get_installments(
    project_id: Optional[str] = Query(None),
    current_user: Dict[str, Any] = Depends(get_current_user_dependency),
    pool: asyncpg.Pool = Depends(get_db_pool)
):
    """Get payment installments, optionally filtered by project."""
    accessible_projects = await get_user_accessible_projects(current_user, pool)
    
    if not accessible_projects:
        return []
    
    async with pool.acquire() as conn:
        if project_id:
            if project_id not in accessible_projects:
                raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")
            rows = await conn.fetch(
                """SELECT i.*,
                   (SELECT COUNT(*) FROM client_portal.installment_files WHERE installment_id = i.id) as file_count
                   FROM client_portal.installments i
                   WHERE i.project_id = $1
                   ORDER BY i.due_date ASC""",
                project_id
            )
        else:
            rows = await conn.fetch(
                """SELECT i.*,
                   (SELECT COUNT(*) FROM client_portal.installment_files WHERE installment_id = i.id) as file_count
                   FROM client_portal.installments i
                   WHERE i.project_id = ANY($1::varchar[])
                   ORDER BY i.due_date ASC""",
                accessible_projects
            )
        return [dict(row) for row in rows]

@router.post("/client-installments")
async def create_installment(
    installment: InstallmentCreate,
    current_user: Dict[str, Any] = Depends(get_current_user_dependency),
    pool: asyncpg.Pool = Depends(get_db_pool)
):
    """Create a new installment."""
    await verify_project_access(installment.project_id, current_user, pool)
    
    async with pool.acquire() as conn:
        row = await conn.fetchrow(
            """INSERT INTO client_portal.installments (project_id, label, due_date, amount, status)
               VALUES ($1, $2, $3, $4, 'scheduled')
               RETURNING *""",
            installment.project_id,
            installment.label,
            installment.due_date,
            installment.amount
        )
        return dict(row)

@router.patch("/client-installments/{installment_id}")
async def update_installment(
    installment_id: str,
    update: InstallmentUpdate,
    current_user: Dict[str, Any] = Depends(get_current_user_dependency),
    pool: asyncpg.Pool = Depends(get_db_pool)
):
    """Update installment status."""
    async with pool.acquire() as conn:
        # Get the installment to verify project access
        installment = await conn.fetchrow("SELECT project_id FROM client_portal.installments WHERE id = $1", installment_id)
        if not installment:
            raise HTTPException(status_code=404, detail="Installment not found")
        await verify_project_access(installment['project_id'], current_user, pool)
        
        row = await conn.fetchrow(
            "UPDATE client_portal.installments SET status = $1 WHERE id = $2 RETURNING *",
            update.status,
            installment_id
        )
        if not row:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Installment not found")
        return dict(row)

@router.get("/client-installments/{installment_id}/files")
async def get_installment_files(
    installment_id: str,
    current_user: Dict[str, Any] = Depends(get_current_user_dependency),
    pool: asyncpg.Pool = Depends(get_db_pool)
):
    """Get files for an installment."""
    async with pool.acquire() as conn:
        # Get the installment to verify project access
        installment = await conn.fetchrow("SELECT project_id FROM client_portal.installments WHERE id = $1", installment_id)
        if not installment:
            raise HTTPException(status_code=404, detail="Installment not found")
        await verify_project_access(installment['project_id'], current_user, pool)
        
        rows = await conn.fetch(
            "SELECT * FROM client_portal.installment_files WHERE installment_id = $1 ORDER BY created_at DESC",
            installment_id
        )
        return [dict(row) for row in rows]

# ============================================================================
# NOTIFICATIONS ENDPOINTS
# ============================================================================

@router.get("/client-notifications")
async def get_notification_settings(
    project_id: Optional[str] = Query(None),
    current_user: Dict[str, Any] = Depends(get_current_user_dependency),
    pool: asyncpg.Pool = Depends(get_db_pool)
):
    """Get notification settings."""
    accessible_projects = await get_user_accessible_projects(current_user, pool)
    
    if not accessible_projects:
        return []
    
    async with pool.acquire() as conn:
        if project_id:
            if project_id not in accessible_projects:
                raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")
            rows = await conn.fetch(
                "SELECT * FROM client_portal.notification_settings WHERE project_id = $1 AND user_id = $2",
                project_id,
                current_user['id']
            )
        else:
            rows = await conn.fetch(
                "SELECT * FROM client_portal.notification_settings WHERE user_id = $1 AND project_id = ANY($2::varchar[])",
                current_user['id'],
                accessible_projects
            )
        return [dict(row) for row in rows]

@router.post("/client-notifications")
async def create_notification_setting(
    setting: NotificationSettingCreate,
    current_user: Dict[str, Any] = Depends(get_current_user_dependency),
    pool: asyncpg.Pool = Depends(get_db_pool)
):
    """Create a notification setting."""
    await verify_project_access(setting.project_id, current_user, pool)
    
    async with pool.acquire() as conn:
        row = await conn.fetchrow(
            """INSERT INTO client_portal.notification_settings (project_id, user_id, channel, event, cadence)
               VALUES ($1, $2, $3, $4, $5)
               ON CONFLICT (project_id, user_id, event, channel) 
               DO UPDATE SET cadence = EXCLUDED.cadence
               RETURNING *""",
            setting.project_id,
            current_user['id'],
            setting.channel,
            setting.event,
            setting.cadence
        )
        return dict(row)

@router.delete("/client-notifications/{setting_id}")
async def delete_notification_setting(
    setting_id: str,
    current_user: Dict[str, Any] = Depends(get_current_user_dependency),
    pool: asyncpg.Pool = Depends(get_db_pool)
):
    """Delete a notification setting."""
    async with pool.acquire() as conn:
        await conn.execute(
            "DELETE FROM client_portal.notification_settings WHERE id = $1",
            setting_id
        )
        return {"success": True}

# ============================================================================
# MATERIAL AREAS ENDPOINTS (Comprehensive Redesign)
# ============================================================================

@router.get("/material-areas")
async def get_material_areas(
    project_id: str = Query(...),
    current_user: Dict[str, Any] = Depends(get_current_user_dependency),
    pool: asyncpg.Pool = Depends(get_db_pool)
):
    """Get all material areas for a project with item counts and totals."""
    await verify_project_access(project_id, current_user, pool)
    
    async with pool.acquire() as conn:
        rows = await conn.fetch(
            """SELECT 
                ma.*,
                COUNT(mi.id) as item_count,
                COALESCE(SUM(mi.unit_cost * CAST(NULLIF(mi.quantity, '') AS NUMERIC)), 0) as total_cost
               FROM client_portal.material_areas ma
               LEFT JOIN client_portal.material_items mi ON ma.id = mi.area_id
               WHERE ma.project_id = $1
               GROUP BY ma.id
               ORDER BY ma.sort_order, ma.created_at""",
            project_id
        )
        return [dict(row) for row in rows]

@router.post("/material-areas")
async def create_material_area(
    area: MaterialAreaCreate,
    current_user: Dict[str, Any] = Depends(get_current_user_dependency),
    pool: asyncpg.Pool = Depends(get_db_pool)
):
    """Create a new material area."""
    await verify_project_access(area.project_id, current_user, pool)
    
    async with pool.acquire() as conn:
        row = await conn.fetchrow(
            """INSERT INTO client_portal.material_areas 
               (project_id, name, description, sort_order, created_by)
               VALUES ($1, $2, $3, $4, $5)
               RETURNING *""",
            area.project_id,
            area.name,
            area.description,
            area.sort_order,
            current_user['id']
        )
        return dict(row)

@router.patch("/material-areas/{area_id}")
async def update_material_area(
    area_id: str,
    update: MaterialAreaUpdate,
    current_user: Dict[str, Any] = Depends(get_current_user_dependency),
    pool: asyncpg.Pool = Depends(get_db_pool)
):
    """Update a material area."""
    if is_client_role(current_user):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Clients cannot update material areas"
        )

    async with pool.acquire() as conn:
        updates = []
        values = []
        param_count = 1

        if update.name is not None:
            updates.append(f"name = ${param_count}")
            values.append(update.name)
            param_count += 1
        if update.description is not None:
            updates.append(f"description = ${param_count}")
            values.append(update.description)
            param_count += 1
        if update.sort_order is not None:
            updates.append(f"sort_order = ${param_count}")
            values.append(update.sort_order)
            param_count += 1

        if not updates:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="No fields to update")

        values.append(area_id)
        query = f"UPDATE client_portal.material_areas SET {', '.join(updates)}, updated_at = now() WHERE id = ${param_count} RETURNING *"

        try:
            row = await conn.fetchrow(query, *values)
        except UniqueViolationError:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="An area with this name already exists in this project"
            )
        if not row:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Area not found")
        return dict(row)

@router.delete("/material-areas/{area_id}")
async def delete_material_area(
    area_id: str,
    current_user: Dict[str, Any] = Depends(get_current_user_dependency),
    pool: asyncpg.Pool = Depends(get_db_pool)
):
    """Delete a material area (cascade deletes items)."""
    async with pool.acquire() as conn:
        await conn.execute(
            "DELETE FROM client_portal.material_areas WHERE id = $1",
            area_id
        )
        return {"success": True}

@router.post("/material-areas/{area_id}/duplicate")
async def duplicate_material_area(
    area_id: str,
    data: MaterialAreaDuplicate,
    current_user: Dict[str, Any] = Depends(get_current_user_dependency),
    pool: asyncpg.Pool = Depends(get_db_pool)
):
    """Duplicate a material area with all its materials.

    Creates a new area with the given name, copies all material items
    from the source area. Duplicated materials are renamed as
    "{original_material_name} - {new_area_name}".
    """
    if is_client_role(current_user):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Clients cannot duplicate material areas"
        )

    new_name = data.new_name.strip()
    if not new_name:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="New area name is required"
        )

    async with pool.acquire() as conn:
        # Fetch original area
        original_area = await conn.fetchrow(
            "SELECT * FROM client_portal.material_areas WHERE id = $1",
            area_id
        )
        if not original_area:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Source area not found"
            )

        project_id = original_area['project_id']
        await verify_project_access(project_id, current_user, pool)

        async with conn.transaction():
            # Create the new area
            try:
                new_area = await conn.fetchrow(
                    """INSERT INTO client_portal.material_areas
                       (project_id, name, description, sort_order, created_by)
                       VALUES ($1, $2, $3, $4, $5)
                       RETURNING *""",
                    project_id,
                    new_name,
                    original_area['description'],
                    original_area['sort_order'] + 1,
                    current_user['id']
                )
            except UniqueViolationError:
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail=f"An area named '{new_name}' already exists in this project"
                )

            # Fetch all materials from the original area
            original_items = await conn.fetch(
                """SELECT * FROM client_portal.material_items
                   WHERE area_id = $1 ORDER BY name""",
                area_id
            )

            # Copy each material item with renamed name
            new_items = []
            for item in original_items:
                new_item_name = f"{item['name']} - {new_name}"
                new_item = await conn.fetchrow(
                    """INSERT INTO client_portal.material_items
                       (area_id, project_id, name, spec, product_link, vendor,
                        quantity, unit_cost, status, added_by, stage_id,
                        approval_status, is_from_template, order_status)
                       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
                       RETURNING *""",
                    str(new_area['id']),
                    project_id,
                    new_item_name,
                    item['spec'],
                    item['product_link'],
                    item['vendor'],
                    item['quantity'],
                    item['unit_cost'],
                    item['status'],
                    current_user['id'],
                    item['stage_id'],
                    'approved',
                    False,
                    'pending_to_order'
                )
                new_items.append(dict(new_item))

        return {
            "area": dict(new_area),
            "items": new_items,
            "items_copied": len(new_items)
        }

# ============================================================================
# MATERIAL ITEMS ENDPOINTS (Comprehensive Redesign)
# ============================================================================

@router.get("/material-items")
async def get_material_items(
    project_id: Optional[str] = Query(None),
    area_id: Optional[str] = Query(None),
    stage_id: Optional[str] = Query(None),
    current_user: Dict[str, Any] = Depends(get_current_user_dependency),
    pool: asyncpg.Pool = Depends(get_db_pool)
):
    """Get material items, optionally filtered by project, area, or stage.

    Clients only see materials with approval_status='approved'.
    PMs/admins see all materials regardless of approval status.
    """
    if project_id:
        await verify_project_access(project_id, current_user, pool)

    # Clients only see approved materials
    approval_filter = ""
    if is_client_role(current_user):
        approval_filter = "AND (mi.approval_status = 'approved' OR mi.approval_status IS NULL)"

    async with pool.acquire() as conn:
        # Filter by stage_id if provided
        if stage_id:
            rows = await conn.fetch(
                f"""SELECT mi.*, COALESCE(NULLIF(CONCAT(u.first_name, ' ', u.last_name), ' '), u.email) as added_by_name, ma.name as area_name,
                          ps.name as stage_name
                   FROM client_portal.material_items mi
                   LEFT JOIN public.users u ON mi.added_by = u.id
                   LEFT JOIN client_portal.material_areas ma ON mi.area_id = ma.id
                   LEFT JOIN client_portal.project_stages ps ON mi.stage_id = ps.id
                   WHERE mi.stage_id = $1 {approval_filter}
                   ORDER BY mi.name ASC, mi.id""",
                stage_id
            )
        elif area_id:
            rows = await conn.fetch(
                f"""SELECT mi.*, COALESCE(NULLIF(CONCAT(u.first_name, ' ', u.last_name), ' '), u.email) as added_by_name, ma.name as area_name,
                          ps.name as stage_name
                   FROM client_portal.material_items mi
                   LEFT JOIN public.users u ON mi.added_by = u.id
                   LEFT JOIN client_portal.material_areas ma ON mi.area_id = ma.id
                   LEFT JOIN client_portal.project_stages ps ON mi.stage_id = ps.id
                   WHERE mi.area_id = $1 {approval_filter}
                   ORDER BY mi.name ASC, mi.id""",
                area_id
            )
        elif project_id:
            rows = await conn.fetch(
                f"""SELECT mi.*, COALESCE(NULLIF(CONCAT(u.first_name, ' ', u.last_name), ' '), u.email) as added_by_name, ma.name as area_name,
                          ps.name as stage_name
                   FROM client_portal.material_items mi
                   LEFT JOIN public.users u ON mi.added_by = u.id
                   LEFT JOIN client_portal.material_areas ma ON mi.area_id = ma.id
                   LEFT JOIN client_portal.project_stages ps ON mi.stage_id = ps.id
                   WHERE mi.project_id = $1 {approval_filter}
                   ORDER BY ma.sort_order, mi.name ASC, mi.id""",
                project_id
            )
        else:
            accessible_projects = await get_user_accessible_projects(current_user, pool)
            rows = await conn.fetch(
                f"""SELECT mi.*, COALESCE(NULLIF(CONCAT(u.first_name, ' ', u.last_name), ' '), u.email) as added_by_name, ma.name as area_name,
                          ps.name as stage_name
                   FROM client_portal.material_items mi
                   LEFT JOIN public.users u ON mi.added_by = u.id
                   LEFT JOIN client_portal.material_areas ma ON mi.area_id = ma.id
                   LEFT JOIN client_portal.project_stages ps ON mi.stage_id = ps.id
                   WHERE mi.project_id = ANY($1::varchar[]) {approval_filter}
                   ORDER BY mi.name ASC, mi.id""",
                accessible_projects
            )
        return [dict(row) for row in rows]

@router.get("/material-items/check-duplicate")
async def check_material_duplicate(
    area_id: str = Query(..., description="The area ID to check within"),
    name: str = Query(..., description="The material name to check"),
    current_user: Dict[str, Any] = Depends(get_current_user_dependency),
    pool: asyncpg.Pool = Depends(get_db_pool)
):
    """Check if a material with the same name exists in the given area."""
    async with pool.acquire() as conn:
        exists = await conn.fetchval("""
            SELECT EXISTS(
                SELECT 1 FROM client_portal.material_items
                WHERE area_id = $1 AND LOWER(TRIM(name)) = LOWER(TRIM($2))
            )
        """, area_id, name)
    return {"exists": exists, "area_id": area_id, "name": name}

@router.post("/material-items")
async def create_material_item(
    item: MaterialItemCreate,
    current_user: Dict[str, Any] = Depends(get_current_user_dependency),
    pool: asyncpg.Pool = Depends(get_db_pool)
):
    """Create a new material item."""
    await verify_project_access(item.project_id, current_user, pool)

    async with pool.acquire() as conn:
        # Server-side duplicate check
        exists = await conn.fetchval("""
            SELECT EXISTS(
                SELECT 1 FROM client_portal.material_items
                WHERE area_id = $1 AND LOWER(TRIM(name)) = LOWER(TRIM($2))
            )
        """, item.area_id, item.name)
        if exists:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"A material named '{item.name}' already exists in this area"
            )

        row = await conn.fetchrow(
            """INSERT INTO client_portal.material_items
               (area_id, project_id, name, spec, product_link, vendor, quantity, unit_cost, status, added_by, stage_id, order_status)
               VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
               RETURNING *""",
            item.area_id,
            item.project_id,
            item.name,
            item.spec,
            item.product_link,
            item.vendor,
            item.quantity,
            item.unit_cost,
            item.status,
            current_user['id'],
            item.stage_id,
            item.order_status
        )

    # Send notification to PMs/admins if creator is a client
    if is_client_role(current_user):
        await notify_pms_and_admins(
            pool=pool,
            project_id=item.project_id,
            notification_type='material_added',
            source_kind='material',
            source_id=str(row['id']),
            title=f"New Material: {item.name[:50]}",
            body=f"Spec: {item.spec[:100]}" if item.spec else None
        )

    return dict(row)

@router.patch("/material-items/{item_id}")
async def update_material_item(
    item_id: str,
    update: MaterialItemUpdate,
    current_user: Dict[str, Any] = Depends(get_current_user_dependency),
    pool: asyncpg.Pool = Depends(get_db_pool)
):
    """Update a material item.

    Clients can only edit: spec, product_link, vendor, quantity, unit_cost
    Clients CANNOT edit: name, status, stage_id (PM-only fields)
    """
    is_client = is_client_role(current_user)

    # Clients cannot change restricted fields
    if is_client:
        if update.name is not None:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Clients cannot change material name. Contact your project manager."
            )
        if update.status is not None:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Clients cannot change material status. Contact your project manager."
            )
        if update.stage_id is not None:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Clients cannot assign materials to stages. Contact your project manager."
            )
        if update.area_id is not None:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Clients cannot move materials between areas. Contact your project manager."
            )

    async with pool.acquire() as conn:
        updates = []
        values = []
        param_count = 1

        if update.name is not None:
            updates.append(f"name = ${param_count}")
            values.append(update.name)
            param_count += 1
        if update.spec is not None:
            updates.append(f"spec = ${param_count}")
            values.append(update.spec)
            param_count += 1
        if update.product_link is not None:
            updates.append(f"product_link = ${param_count}")
            values.append(update.product_link)
            param_count += 1
        if update.vendor is not None:
            updates.append(f"vendor = ${param_count}")
            values.append(update.vendor)
            param_count += 1
        if update.quantity is not None:
            updates.append(f"quantity = ${param_count}")
            values.append(update.quantity)
            param_count += 1
        if update.unit_cost is not None:
            updates.append(f"unit_cost = ${param_count}")
            values.append(update.unit_cost)
            param_count += 1
        if update.status is not None:
            updates.append(f"status = ${param_count}")
            values.append(update.status)
            param_count += 1
        if update.stage_id is not None:
            updates.append(f"stage_id = ${param_count}")
            values.append(update.stage_id if update.stage_id != "" else None)
            param_count += 1
        if update.order_status is not None:
            updates.append(f"order_status = ${param_count}")
            values.append(update.order_status)
            param_count += 1
        if update.area_id is not None:
            # Validate the target area exists and belongs to the same project
            item_row = await conn.fetchrow(
                "SELECT project_id FROM client_portal.material_items WHERE id = $1", item_id
            )
            if item_row:
                target_area = await conn.fetchrow(
                    "SELECT id FROM client_portal.material_areas WHERE id = $1 AND project_id = $2",
                    update.area_id, item_row['project_id']
                )
                if not target_area:
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail="Target area not found or belongs to a different project"
                    )
            updates.append(f"area_id = ${param_count}")
            values.append(update.area_id)
            param_count += 1

        if not updates:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="No fields to update")

        values.append(item_id)
        query = f"UPDATE client_portal.material_items SET {', '.join(updates)}, updated_at = now() WHERE id = ${param_count} RETURNING *"

        row = await conn.fetchrow(query, *values)
        if not row:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Item not found")
        return dict(row)

@router.delete("/material-items/{item_id}")
async def delete_material_item(
    item_id: str,
    current_user: Dict[str, Any] = Depends(get_current_user_dependency),
    pool: asyncpg.Pool = Depends(get_db_pool)
):
    """Delete a material item.

    Only PMs/admins can delete materials. Clients cannot delete.
    """
    if is_client_role(current_user):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Clients cannot delete materials. Contact your project manager."
        )

    async with pool.acquire() as conn:
        await conn.execute(
            "DELETE FROM client_portal.material_items WHERE id = $1",
            item_id
        )
        return {"success": True}

# ============================================================================
# MATERIAL DOCUMENTS ENDPOINTS
# ============================================================================

class MaterialDocumentCreate(BaseModel):
    item_id: str
    project_id: str
    document_path: str
    file_name: str
    mime_type: Optional[str] = None


@router.get("/material-documents")
async def get_material_documents(
    item_id: str = Query(...),
    current_user: Dict[str, Any] = Depends(get_current_user_dependency),
    pool: asyncpg.Pool = Depends(get_db_pool)
):
    """Get all documents attached to a material item. Returns fresh signed GET URLs."""
    async with pool.acquire() as conn:
        rows = await conn.fetch(
            """SELECT md.id, md.item_id, md.project_id, md.document_path,
                      md.file_name, md.mime_type, md.uploaded_by, md.created_at,
                      u.email as uploaded_by_email
               FROM client_portal.material_documents md
               LEFT JOIN public.users u ON u.id = md.uploaded_by
               WHERE md.item_id = $1
               ORDER BY md.created_at DESC""",
            item_id
        )

        config = get_storage_config()
        documents = []
        for row in rows:
            doc = dict(row)
            doc["created_at"] = doc["created_at"].isoformat() if doc["created_at"] else None
            # Generate fresh signed GET URL for downloading
            download_url = await generate_signed_url(
                config["bucket_id"],
                doc["document_path"],
                method="GET",
                expires_minutes=60
            )
            doc["download_url"] = download_url
            documents.append(doc)

        return documents


@router.post("/material-documents")
async def create_material_document(
    data: MaterialDocumentCreate,
    current_user: Dict[str, Any] = Depends(get_current_user_dependency),
    pool: asyncpg.Pool = Depends(get_db_pool)
):
    """Attach a document to a material item. Both clients and PMs can upload. Max 5 per item."""
    async with pool.acquire() as conn:
        # Enforce max 5 documents per item
        count = await conn.fetchval(
            "SELECT COUNT(*) FROM client_portal.material_documents WHERE item_id = $1",
            data.item_id
        )
        if count >= 5:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Maximum 5 documents per material item. Delete an existing document first."
            )

        row = await conn.fetchrow(
            """INSERT INTO client_portal.material_documents
               (item_id, project_id, document_path, file_name, mime_type, uploaded_by)
               VALUES ($1, $2, $3, $4, $5, $6)
               RETURNING id, created_at""",
            data.item_id,
            data.project_id,
            data.document_path,
            data.file_name,
            data.mime_type,
            current_user["id"]
        )

        return {
            "id": str(row["id"]),
            "item_id": data.item_id,
            "file_name": data.file_name,
            "created_at": row["created_at"].isoformat() if row["created_at"] else None,
        }


@router.delete("/material-documents/{doc_id}")
async def delete_material_document(
    doc_id: str,
    current_user: Dict[str, Any] = Depends(get_current_user_dependency),
    pool: asyncpg.Pool = Depends(get_db_pool)
):
    """Delete a material document. PMs/admins can delete any, clients can only delete their own."""
    async with pool.acquire() as conn:
        doc = await conn.fetchrow(
            "SELECT uploaded_by FROM client_portal.material_documents WHERE id = $1",
            doc_id
        )
        if not doc:
            raise HTTPException(status_code=404, detail="Document not found")

        # Clients can only delete their own uploads
        if is_client_role(current_user) and doc["uploaded_by"] != current_user["id"]:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You can only delete documents you uploaded."
            )

        await conn.execute(
            "DELETE FROM client_portal.material_documents WHERE id = $1",
            doc_id
        )
        return {"success": True}


@router.get("/material-documents/count")
async def get_material_document_counts(
    project_id: str = Query(...),
    current_user: Dict[str, Any] = Depends(get_current_user_dependency),
    pool: asyncpg.Pool = Depends(get_db_pool)
):
    """Get document counts per material item for a project (for badge display)."""
    async with pool.acquire() as conn:
        rows = await conn.fetch(
            """SELECT item_id, COUNT(*) as doc_count
               FROM client_portal.material_documents
               WHERE project_id = $1
               GROUP BY item_id""",
            project_id
        )
        return {str(row["item_id"]): row["doc_count"] for row in rows}


# ============================================================================
# STATS ENDPOINT
# ============================================================================

@router.get("/client-stats")
async def get_client_portal_stats(
    project_id: Optional[str] = Query(None),
    current_user: Dict[str, Any] = Depends(get_current_user_dependency),
    pool: asyncpg.Pool = Depends(get_db_pool)
):
    """Get client portal statistics."""
    accessible_projects = await get_user_accessible_projects(current_user, pool)
    
    if not accessible_projects:
        return {
            "open_issues": 0,
            "forum_threads": 0,
            "pending_materials": 0,
            "upcoming_installments": 0
        }
    
    async with pool.acquire() as conn:
        if project_id:
            if project_id not in accessible_projects:
                raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")
            stats = await conn.fetchrow(
                """SELECT
                   (SELECT COUNT(*) FROM client_portal.issues WHERE project_id = $1 AND status = 'open') as open_issues,
                   (SELECT COUNT(*) FROM client_portal.forum_threads WHERE project_id = $1) as forum_threads,
                   (SELECT COUNT(*) FROM client_portal.materials WHERE project_id = $1 AND status = 'pending') as pending_materials,
                   (SELECT COUNT(*) FROM client_portal.installments WHERE project_id = $1 AND status = 'scheduled' AND due_date >= CURRENT_DATE) as upcoming_installments
                """,
                project_id
            )
        else:
            stats = await conn.fetchrow(
                """SELECT
                   (SELECT COUNT(*) FROM client_portal.issues WHERE project_id = ANY($1::varchar[]) AND status = 'open') as open_issues,
                   (SELECT COUNT(*) FROM client_portal.forum_threads WHERE project_id = ANY($1::varchar[])) as forum_threads,
                   (SELECT COUNT(*) FROM client_portal.materials WHERE project_id = ANY($1::varchar[]) AND status = 'pending') as pending_materials,
                   (SELECT COUNT(*) FROM client_portal.installments WHERE project_id = ANY($1::varchar[]) AND status = 'scheduled' AND due_date >= CURRENT_DATE) as upcoming_installments
                """,
                accessible_projects
            )
        return dict(stats)

# ============================================================================
# PAYMENT SCHEDULES
# ============================================================================

@router.post("/payment-schedules")
async def create_payment_schedule(
    data: PaymentScheduleCreate,
    current_user: Dict[str, Any] = Depends(get_current_user_dependency),
    pool: asyncpg.Pool = Depends(get_db_pool)
):
    """Create a payment schedule for a project."""
    await verify_project_access(data.project_id, current_user, pool)

    # Clients cannot create payment schedules
    if is_client_role(current_user):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Clients cannot create payment schedules"
        )

    async with pool.acquire() as conn:
        try:
            row = await conn.fetchrow(
                """INSERT INTO client_portal.payment_schedules
                   (project_id, title, notes, created_by, updated_by)
                   VALUES ($1, $2, $3, $4, $5)
                   RETURNING *""",
                data.project_id, data.title, data.notes,
                current_user['id'], current_user['id']
            )
            return dict(row)
        except UniqueViolationError:
            # Schedule already exists — return it (idempotent get-or-create)
            row = await conn.fetchrow(
                "SELECT * FROM client_portal.payment_schedules WHERE project_id = $1 AND LOWER(title) = LOWER($2)",
                data.project_id, data.title
            )
            if row:
                return dict(row)
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="A payment schedule with this title already exists for this project"
            )

@router.get("/payment-schedules")
async def get_payment_schedules(
    project_id: str = Query(...),
    current_user: Dict[str, Any] = Depends(get_current_user_dependency),
    pool: asyncpg.Pool = Depends(get_db_pool)
):
    """Get payment schedules for a project."""
    await verify_project_access(project_id, current_user, pool)
    
    async with pool.acquire() as conn:
        rows = await conn.fetch(
            "SELECT * FROM client_portal.payment_schedules WHERE project_id = $1 ORDER BY created_at DESC",
            project_id
        )
        return [dict(row) for row in rows]

@router.patch("/payment-schedules/{schedule_id}")
async def update_payment_schedule(
    schedule_id: str,
    update: PaymentScheduleUpdate,
    current_user: Dict[str, Any] = Depends(get_current_user_dependency),
    pool: asyncpg.Pool = Depends(get_db_pool)
):
    """Update a payment schedule."""
    async with pool.acquire() as conn:
        # First get the schedule to verify access
        schedule = await conn.fetchrow(
            "SELECT project_id FROM client_portal.payment_schedules WHERE id = $1",
            schedule_id
        )
        if not schedule:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Schedule not found")
        
        await verify_project_access(schedule['project_id'], current_user, pool)

        # Clients cannot edit payment schedules
        if is_client_role(current_user):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Clients cannot edit payment schedules"
            )

        updates = []
        values = []
        param_count = 1

        if update.title is not None:
            updates.append(f"title = ${param_count}")
            values.append(update.title)
            param_count += 1
        if update.notes is not None:
            updates.append(f"notes = ${param_count}")
            values.append(update.notes)
            param_count += 1
        
        if not updates:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="No fields to update")
        
        values.extend([current_user['id'], schedule_id])
        query = f"""UPDATE client_portal.payment_schedules
                   SET {', '.join(updates)}, updated_by = ${param_count}, updated_at = NOW()
                   WHERE id = ${param_count + 1}
                   RETURNING *"""

        try:
            row = await conn.fetchrow(query, *values)
            if not row:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Schedule not found or was deleted"
                )
            return dict(row)
        except UniqueViolationError:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="A payment schedule with this title already exists for this project"
            )

# ============================================================================
# PAYMENT INSTALLMENTS
# ============================================================================

@router.post("/payment-installments")
async def create_payment_installment(
    data: PaymentInstallmentCreate,
    current_user: Dict[str, Any] = Depends(get_current_user_dependency),
    pool: asyncpg.Pool = Depends(get_db_pool)
):
    """Create a payment installment."""
    await verify_project_access(data.project_id, current_user, pool)

    # Clients cannot create installments
    if is_client_role(current_user):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Clients cannot create payment installments"
        )

    async with pool.acquire() as conn:
        async with conn.transaction():
            # If next_milestone is true, clear any existing next_milestone for this project
            if data.next_milestone:
                await conn.execute(
                    """UPDATE client_portal.payment_installments
                       SET next_milestone = FALSE
                       WHERE project_id = $1 AND status != 'paid'""",
                    data.project_id
                )

            try:
                row = await conn.fetchrow(
                    """INSERT INTO client_portal.payment_installments
                       (project_id, schedule_id, name, description, amount, currency,
                        due_date, status, next_milestone, display_order, created_by, updated_by)
                       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
                       RETURNING *""",
                    data.project_id, data.schedule_id, data.name, data.description,
                    data.amount, data.currency, data.due_date, data.status,
                    data.next_milestone, data.display_order,
                    current_user['id'], current_user['id']
                )
            except UniqueViolationError:
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail="A next milestone already exists for this project"
                )

            # Log the event
            await conn.execute(
                """INSERT INTO client_portal.payment_events
                   (project_id, actor_id, entity_type, entity_id, action)
                   VALUES ($1, $2, 'installment', $3, 'created')""",
                data.project_id, current_user['id'], row['id']
            )

            return dict(row)

@router.get("/payment-installments")
async def get_payment_installments(
    project_id: str = Query(...),
    schedule_id: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    current_user: Dict[str, Any] = Depends(get_current_user_dependency),
    pool: asyncpg.Pool = Depends(get_db_pool)
):
    """Get payment installments for a project."""
    await verify_project_access(project_id, current_user, pool)

    async with pool.acquire() as conn:
        # Auto-update: planned -> payable when due_date has passed
        await conn.execute(
            """UPDATE client_portal.payment_installments
               SET status = 'payable', updated_at = NOW()
               WHERE project_id = $1
                 AND status = 'planned'
                 AND due_date IS NOT NULL
                 AND due_date < CURRENT_DATE""",
            project_id
        )

        query = "SELECT * FROM client_portal.payment_installments WHERE project_id = $1"
        params = [project_id]
        
        if schedule_id:
            params.append(schedule_id)
            query += f" AND schedule_id = ${len(params)}"
        
        if status:
            params.append(status)
            query += f" AND status = ${len(params)}"
        
        query += " ORDER BY display_order, due_date NULLS LAST, created_at"
        
        rows = await conn.fetch(query, *params)
        return [dict(row) for row in rows]

@router.patch("/payment-installments/{installment_id}")
async def update_payment_installment(
    installment_id: str,
    update: PaymentInstallmentUpdate,
    current_user: Dict[str, Any] = Depends(get_current_user_dependency),
    pool: asyncpg.Pool = Depends(get_db_pool)
):
    """Update a payment installment."""
    async with pool.acquire() as conn:
        # Get the installment to verify access and track changes
        installment = await conn.fetchrow(
            "SELECT * FROM client_portal.payment_installments WHERE id = $1",
            installment_id
        )
        if not installment:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Installment not found")
        
        await verify_project_access(installment['project_id'], current_user, pool)

        # Clients cannot edit installments
        if is_client_role(current_user):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Clients cannot edit payment installments"
            )

        async with conn.transaction():
            # If next_milestone is being set to true, clear others
            if update.next_milestone:
                await conn.execute(
                    """UPDATE client_portal.payment_installments
                       SET next_milestone = FALSE
                       WHERE project_id = $1 AND id != $2 AND status != 'paid'""",
                    installment['project_id'], installment_id
                )

            updates = []
            values = []
            param_count = 1
            diff = {}

            if update.name is not None:
                updates.append(f"name = ${param_count}")
                values.append(update.name)
                diff['name'] = {'old': installment['name'], 'new': update.name}
                param_count += 1
            if update.description is not None:
                updates.append(f"description = ${param_count}")
                values.append(update.description)
                param_count += 1
            if update.amount is not None:
                updates.append(f"amount = ${param_count}")
                values.append(update.amount)
                diff['amount'] = {'old': str(installment['amount']), 'new': str(update.amount)}
                param_count += 1
            if update.currency is not None:
                updates.append(f"currency = ${param_count}")
                values.append(update.currency)
                param_count += 1
            if update.due_date is not None:
                updates.append(f"due_date = ${param_count}")
                values.append(update.due_date)
                param_count += 1
            if update.status is not None:
                updates.append(f"status = ${param_count}")
                values.append(update.status)
                diff['status'] = {'old': installment['status'], 'new': update.status}
                param_count += 1
            if update.next_milestone is not None:
                updates.append(f"next_milestone = ${param_count}")
                values.append(update.next_milestone)
                param_count += 1
            if update.display_order is not None:
                updates.append(f"display_order = ${param_count}")
                values.append(update.display_order)
                param_count += 1

            if not updates:
                raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="No fields to update")

            values.extend([current_user['id'], installment_id])
            query = f"""UPDATE client_portal.payment_installments
                       SET {', '.join(updates)}, updated_by = ${param_count}, updated_at = NOW()
                       WHERE id = ${param_count + 1}
                       RETURNING *"""

            try:
                row = await conn.fetchrow(query, *values)
                if not row:
                    raise HTTPException(
                        status_code=status.HTTP_404_NOT_FOUND,
                        detail="Installment not found or was deleted"
                    )
            except UniqueViolationError:
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail="A next milestone already exists for this project"
                )

            # Log status changes
            if 'status' in diff:
                await conn.execute(
                    """INSERT INTO client_portal.payment_events
                       (project_id, actor_id, entity_type, entity_id, action, diff)
                       VALUES ($1, $2, 'installment', $3, 'status_changed', $4)""",
                    installment['project_id'], current_user['id'], installment_id, json.dumps(diff)
                )

            return dict(row)

# ============================================================================
# PAYMENT DOCUMENTS
# ============================================================================

@router.post("/payment-documents")
async def create_payment_document(
    data: PaymentDocumentCreate,
    current_user: Dict[str, Any] = Depends(get_current_user_dependency),
    pool: asyncpg.Pool = Depends(get_db_pool)
):
    """Upload a payment document."""
    await verify_project_access(data.project_id, current_user, pool)

    # Clients cannot upload payment documents (they use receipts instead)
    if is_client_role(current_user):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Clients cannot upload payment documents. Use payment receipts to upload proof of payment."
        )

    async with pool.acquire() as conn:
        row = await conn.fetchrow(
            """INSERT INTO client_portal.payment_documents 
               (project_id, schedule_id, title, file_id, uploaded_by) 
               VALUES ($1, $2, $3, $4, $5) 
               RETURNING *""",
            data.project_id, data.schedule_id, data.title, 
            data.file_id, current_user['id']
        )
        return dict(row)

@router.get("/payment-documents")
async def get_payment_documents(
    project_id: str = Query(...),
    current_user: Dict[str, Any] = Depends(get_current_user_dependency),
    pool: asyncpg.Pool = Depends(get_db_pool)
):
    """Get payment documents for a project."""
    await verify_project_access(project_id, current_user, pool)
    
    async with pool.acquire() as conn:
        rows = await conn.fetch(
            "SELECT * FROM client_portal.payment_documents WHERE project_id = $1 ORDER BY created_at DESC",
            project_id
        )
        return [dict(row) for row in rows]

@router.delete("/payment-documents/{document_id}")
async def delete_payment_document(
    document_id: str,
    current_user: Dict[str, Any] = Depends(get_current_user_dependency),
    pool: asyncpg.Pool = Depends(get_db_pool)
):
    """Delete a payment document."""
    async with pool.acquire() as conn:
        await conn.execute(
            "DELETE FROM client_portal.payment_documents WHERE id = $1",
            document_id
        )
        return {"success": True}

# ============================================================================
# PAYMENT RECEIPTS
# ============================================================================

@router.post("/payment-receipts")
async def create_payment_receipt(
    data: PaymentReceiptCreate,
    current_user: Dict[str, Any] = Depends(get_current_user_dependency),
    pool: asyncpg.Pool = Depends(get_db_pool)
):
    """Upload a payment receipt."""
    await verify_project_access(data.project_id, current_user, pool)
    
    async with pool.acquire() as conn:
        row = await conn.fetchrow(
            """INSERT INTO client_portal.payment_receipts
               (project_id, installment_id, receipt_type, reference_no,
                payment_date, file_id, uploaded_by)
               VALUES ($1, $2, $3, $4, $5, $6, $7)
               RETURNING *""",
            data.project_id, data.installment_id, data.receipt_type,
            data.reference_no, data.payment_date, data.file_id, current_user['id']
        )

        # Send notification to PMs/admins if uploader is a client
        if is_client_role(current_user):
            # Get installment label for better notification context
            installment = await conn.fetchrow(
                "SELECT label FROM client_portal.payment_installments WHERE id = $1",
                data.installment_id
            )
            installment_label = installment['label'] if installment else 'an installment'

            await notify_pms_and_admins(
                pool=pool,
                project_id=data.project_id,
                notification_type='receipt_uploaded',
                source_kind='receipt',
                source_id=str(row['id']),
                title="Payment Receipt Uploaded",
                body=f"Client uploaded receipt for {installment_label}"
            )

        return dict(row)

@router.get("/payment-receipts")
async def get_payment_receipts(
    installment_id: Optional[str] = Query(None),
    project_id: Optional[str] = Query(None),
    current_user: Dict[str, Any] = Depends(get_current_user_dependency),
    pool: asyncpg.Pool = Depends(get_db_pool)
):
    """Get payment receipts."""
    if project_id:
        await verify_project_access(project_id, current_user, pool)
    
    async with pool.acquire() as conn:
        if installment_id:
            rows = await conn.fetch(
                "SELECT * FROM client_portal.payment_receipts WHERE installment_id = $1 ORDER BY created_at DESC",
                installment_id
            )
        elif project_id:
            rows = await conn.fetch(
                "SELECT * FROM client_portal.payment_receipts WHERE project_id = $1 ORDER BY created_at DESC",
                project_id
            )
        else:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="installment_id or project_id required")
        
        return [dict(row) for row in rows]

# ============================================================================
# INVOICES
# ============================================================================

@router.get("/invoices")
async def get_invoices(
    project_id: str = Query(...),
    current_user: Dict[str, Any] = Depends(get_current_user_dependency),
    pool: asyncpg.Pool = Depends(get_db_pool)
):
    """Get invoices for a project."""
    await verify_project_access(project_id, current_user, pool)
    
    async with pool.acquire() as conn:
        rows = await conn.fetch(
            """SELECT i.*, pi.name as installment_name 
               FROM client_portal.invoices i
               JOIN client_portal.payment_installments pi ON i.installment_id = pi.id
               WHERE i.project_id = $1 
               ORDER BY i.created_at DESC""",
            project_id
        )
        return [dict(row) for row in rows]

@router.post("/payment-installments/{installment_id}/mark-paid")
async def mark_installment_paid(
    installment_id: str,
    request: MarkPaidRequest,
    current_user: Dict[str, Any] = Depends(get_current_user_dependency),
    pool: asyncpg.Pool = Depends(get_db_pool)
):
    """Mark an installment as paid and notify office managers to upload invoice."""
    async with pool.acquire() as conn:
        # Get installment
        installment = await conn.fetchrow(
            "SELECT * FROM client_portal.payment_installments WHERE id = $1",
            installment_id
        )
        if not installment:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Installment not found")

        await verify_project_access(installment['project_id'], current_user, pool)

        # Clients cannot mark installments as paid
        if is_client_role(current_user):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Clients cannot mark installments as paid"
            )

        # Check if already paid
        if installment['status'] == 'paid':
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Installment is already marked as paid"
            )

        # Check if at least one receipt exists
        receipt_count = await conn.fetchval(
            "SELECT COUNT(*) FROM client_portal.payment_receipts WHERE installment_id = $1",
            installment_id
        )
        if receipt_count == 0:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="At least one receipt must be uploaded before marking as paid"
            )

        # Update installment status to paid and clear next_milestone
        await conn.execute(
            """UPDATE client_portal.payment_installments
               SET status = 'paid', next_milestone = FALSE, updated_by = $1, updated_at = NOW()
               WHERE id = $2""",
            current_user['id'], installment_id
        )

        # Log the event
        await conn.execute(
            """INSERT INTO client_portal.payment_events
               (project_id, actor_id, entity_type, entity_id, action, diff)
               VALUES ($1, $2, 'installment', $3, 'marked_paid', $4)""",
            installment['project_id'], current_user['id'], installment_id,
            json.dumps({'amount': str(installment['amount'])})
        )

    # Notify office managers to upload the invoice (outside transaction)
    # Wrapped in try-except to not fail the main operation if notifications fail
    notifications_sent = 0
    try:
        amount_formatted = f"${float(installment['amount']):,.2f}"
        notifications_sent = await notify_office_managers(
            pool=pool,
            project_id=installment['project_id'],
            installment_id=installment_id,
            title=f"Invoice Needed: {installment['name']}",
            body=f"Payment of {amount_formatted} has been marked as paid. Please upload the invoice."
        )
    except Exception:
        # Notification failure should not fail the request
        pass

    return {
        "success": True,
        "installment_id": installment_id,
        "notifications_sent": notifications_sent
    }

# ============================================================================
# PAYMENT TOTALS
# ============================================================================

@router.get("/payment-totals")
async def get_payment_totals(
    project_id: str = Query(...),
    current_user: Dict[str, Any] = Depends(get_current_user_dependency),
    pool: asyncpg.Pool = Depends(get_db_pool)
):
    """Get payment totals and summary for a project."""
    await verify_project_access(project_id, current_user, pool)
    
    async with pool.acquire() as conn:
        # Get totals
        totals = await conn.fetchrow(
            """SELECT 
                COALESCE(SUM(amount), 0) as total_amount,
                COALESCE(SUM(CASE WHEN status = 'paid' THEN amount ELSE 0 END), 0) as total_paid,
                COALESCE(SUM(CASE WHEN status IN ('planned', 'payable') THEN amount ELSE 0 END), 0) as total_pending
               FROM client_portal.payment_installments 
               WHERE project_id = $1""",
            project_id
        )
        
        total_amount = float(totals['total_amount'])
        total_paid = float(totals['total_paid'])
        total_pending = float(totals['total_pending'])
        
        percent_complete = (total_paid / total_amount * 100) if total_amount > 0 else 0
        
        # Get next milestone
        next_milestone = await conn.fetchrow(
            """SELECT * FROM client_portal.payment_installments 
               WHERE project_id = $1 AND next_milestone = TRUE AND status != 'paid'
               LIMIT 1""",
            project_id
        )
        
        return {
            "total_amount": total_amount,
            "total_paid": total_paid,
            "total_pending": total_pending,
            "percent_complete": round(percent_complete, 2),
            "next_milestone": dict(next_milestone) if next_milestone else None
        }

# ============================================================================
# COMPREHENSIVE PAYMENTS VIEW
# ============================================================================

@router.get("/projects/{project_id}/payments")
async def get_project_payments(
    project_id: str,
    current_user: Dict[str, Any] = Depends(get_current_user_dependency),
    pool: asyncpg.Pool = Depends(get_db_pool)
):
    """Get comprehensive payment data for a project."""
    await verify_project_access(project_id, current_user, pool)

    async with pool.acquire() as conn:
        # Auto-update: planned -> payable when due_date has passed
        await conn.execute(
            """UPDATE client_portal.payment_installments
               SET status = 'payable', updated_at = NOW()
               WHERE project_id = $1
                 AND status = 'planned'
                 AND due_date IS NOT NULL
                 AND due_date < CURRENT_DATE""",
            project_id
        )

        # Get schedules
        schedules = await conn.fetch(
            "SELECT * FROM client_portal.payment_schedules WHERE project_id = $1",
            project_id
        )

        # Get installments
        installments = await conn.fetch(
            "SELECT * FROM client_portal.payment_installments WHERE project_id = $1 ORDER BY display_order, due_date",
            project_id
        )
        
        # Get documents
        documents = await conn.fetch(
            "SELECT * FROM client_portal.payment_documents WHERE project_id = $1 ORDER BY created_at DESC",
            project_id
        )
        
        # Get receipts
        receipts = await conn.fetch(
            "SELECT * FROM client_portal.payment_receipts WHERE project_id = $1",
            project_id
        )
        
        # Get invoices
        invoices = await conn.fetch(
            """SELECT i.*, pi.name as installment_name 
               FROM client_portal.invoices i
               JOIN client_portal.payment_installments pi ON i.installment_id = pi.id
               WHERE i.project_id = $1 
               ORDER BY i.created_at DESC""",
            project_id
        )
        
        # Get totals
        totals = await conn.fetchrow(
            """SELECT 
                COALESCE(SUM(amount), 0) as total_amount,
                COALESCE(SUM(CASE WHEN status = 'paid' THEN amount ELSE 0 END), 0) as total_paid,
                COALESCE(SUM(CASE WHEN status IN ('planned', 'payable') THEN amount ELSE 0 END), 0) as total_pending
               FROM client_portal.payment_installments 
               WHERE project_id = $1""",
            project_id
        )
        
        total_amount = float(totals['total_amount'])
        total_paid = float(totals['total_paid'])
        total_pending = float(totals['total_pending'])
        percent_complete = (total_paid / total_amount * 100) if total_amount > 0 else 0
        
        return {
            "schedules": [dict(row) for row in schedules],
            "installments": [dict(row) for row in installments],
            "documents": [dict(row) for row in documents],
            "receipts": [dict(row) for row in receipts],
            "invoices": [dict(row) for row in invoices],
            "totals": {
                "total_amount": total_amount,
                "total_paid": total_paid,
                "total_pending": total_pending,
                "percent_complete": round(percent_complete, 2)
            }
        }
