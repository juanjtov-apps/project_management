from typing import List, Dict, Any, Optional
from fastapi import APIRouter, HTTPException, status, Depends, Query, UploadFile, File
from pydantic import BaseModel
from datetime import datetime, date
import asyncpg

from src.database.connection import get_db_pool
from src.api.auth import get_current_user_dependency, is_root_admin

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

async def get_user_accessible_projects(current_user: Dict[str, Any], pool: asyncpg.Pool) -> List[str]:
    """Get list of project IDs accessible to the current user."""
    if is_root_admin(current_user):
        async with pool.acquire() as conn:
            rows = await conn.fetch("SELECT id FROM public.projects")
            return [row['id'] for row in rows]
    
    # Try both camelCase and snake_case for compatibility
    user_company_id = str(current_user.get('company_id') or current_user.get('companyId') or '')
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
                   (SELECT COUNT(*) FROM client_portal.issue_comments WHERE issue_id = i.id) as comment_count,
                   (SELECT COUNT(*) FROM client_portal.issue_attachments WHERE issue_id = i.id) as attachment_count
                   FROM client_portal.issues i
                   WHERE i.project_id = $1
                   ORDER BY i.created_at DESC""",
                project_id
            )
        else:
            rows = await conn.fetch(
                """SELECT i.*, 
                   (SELECT COUNT(*) FROM client_portal.issue_comments WHERE issue_id = i.id) as comment_count,
                   (SELECT COUNT(*) FROM client_portal.issue_attachments WHERE issue_id = i.id) as attachment_count
                   FROM client_portal.issues i
                   WHERE i.project_id = ANY($1::varchar[])
                   ORDER BY i.created_at DESC""",
                accessible_projects
            )
        
        return [dict(row) for row in rows]

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
        return dict(row)

@router.patch("/client-issues/{issue_id}")
async def update_issue(
    issue_id: str,
    status_update: str = Query(..., alias="status"),
    current_user: Dict[str, Any] = Depends(get_current_user_dependency),
    pool: asyncpg.Pool = Depends(get_db_pool)
):
    """Update issue status."""
    async with pool.acquire() as conn:
        # Get issue to verify project access
        issue = await conn.fetchrow(
            "SELECT project_id FROM client_portal.issues WHERE id = $1",
            issue_id
        )
        if not issue:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Issue not found")
        
        await verify_project_access(issue['project_id'], current_user, pool)
        
        row = await conn.fetchrow(
            "UPDATE client_portal.issues SET status = $1 WHERE id = $2 RETURNING *",
            status_update,
            issue_id
        )
        return dict(row)

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
            """SELECT c.*, u.name as author_name
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
                """SELECT m.*, u.name as author_name, m.author_id as authorId, m.body as content, t.project_id as projectId
                   FROM client_portal.forum_messages m
                   LEFT JOIN public.users u ON m.author_id = u.id
                   LEFT JOIN client_portal.forum_threads t ON m.thread_id = t.id
                   WHERE t.project_id = $1
                   ORDER BY m.created_at ASC""",
                project_id
            )
        else:
            rows = await conn.fetch(
                """SELECT m.*, u.name as author_name, m.author_id as authorId, m.body as content, t.project_id as projectId
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
                """SELECT m.*, u.name as added_by_name
                   FROM client_portal.materials m
                   LEFT JOIN public.users u ON m.added_by = u.id
                   WHERE m.project_id = $1
                   ORDER BY m.created_at DESC""",
                project_id
            )
        else:
            rows = await conn.fetch(
                """SELECT m.*, u.name as added_by_name
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
