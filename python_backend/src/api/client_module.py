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

class MaterialAreaCreate(BaseModel):
    project_id: str
    name: str
    description: Optional[str] = None
    sort_order: Optional[int] = 0

class MaterialAreaUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    sort_order: Optional[int] = None

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

class MaterialItemUpdate(BaseModel):
    name: Optional[str] = None
    spec: Optional[str] = None
    product_link: Optional[str] = None
    vendor: Optional[str] = None
    quantity: Optional[str] = None
    unit_cost: Optional[float] = None
    status: Optional[str] = None

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
        
        row = await conn.fetchrow(query, *values)
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

# ============================================================================
# MATERIAL ITEMS ENDPOINTS (Comprehensive Redesign)
# ============================================================================

@router.get("/material-items")
async def get_material_items(
    project_id: Optional[str] = Query(None),
    area_id: Optional[str] = Query(None),
    current_user: Dict[str, Any] = Depends(get_current_user_dependency),
    pool: asyncpg.Pool = Depends(get_db_pool)
):
    """Get material items, optionally filtered by project or area."""
    if project_id:
        await verify_project_access(project_id, current_user, pool)
    
    async with pool.acquire() as conn:
        if area_id:
            rows = await conn.fetch(
                """SELECT mi.*, u.name as added_by_name, ma.name as area_name
                   FROM client_portal.material_items mi
                   LEFT JOIN public.users u ON mi.added_by = u.id
                   LEFT JOIN client_portal.material_areas ma ON mi.area_id = ma.id
                   WHERE mi.area_id = $1
                   ORDER BY mi.created_at DESC""",
                area_id
            )
        elif project_id:
            rows = await conn.fetch(
                """SELECT mi.*, u.name as added_by_name, ma.name as area_name
                   FROM client_portal.material_items mi
                   LEFT JOIN public.users u ON mi.added_by = u.id
                   LEFT JOIN client_portal.material_areas ma ON mi.area_id = ma.id
                   WHERE mi.project_id = $1
                   ORDER BY ma.sort_order, mi.created_at DESC""",
                project_id
            )
        else:
            accessible_projects = await get_user_accessible_projects(current_user, pool)
            rows = await conn.fetch(
                """SELECT mi.*, u.name as added_by_name, ma.name as area_name
                   FROM client_portal.material_items mi
                   LEFT JOIN public.users u ON mi.added_by = u.id
                   LEFT JOIN client_portal.material_areas ma ON mi.area_id = ma.id
                   WHERE mi.project_id = ANY($1::varchar[])
                   ORDER BY mi.created_at DESC""",
                accessible_projects
            )
        return [dict(row) for row in rows]

@router.post("/material-items")
async def create_material_item(
    item: MaterialItemCreate,
    current_user: Dict[str, Any] = Depends(get_current_user_dependency),
    pool: asyncpg.Pool = Depends(get_db_pool)
):
    """Create a new material item."""
    await verify_project_access(item.project_id, current_user, pool)
    
    async with pool.acquire() as conn:
        row = await conn.fetchrow(
            """INSERT INTO client_portal.material_items 
               (area_id, project_id, name, spec, product_link, vendor, quantity, unit_cost, status, added_by)
               VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
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
            current_user['id']
        )
        return dict(row)

@router.patch("/material-items/{item_id}")
async def update_material_item(
    item_id: str,
    update: MaterialItemUpdate,
    current_user: Dict[str, Any] = Depends(get_current_user_dependency),
    pool: asyncpg.Pool = Depends(get_db_pool)
):
    """Update a material item."""
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
    """Delete a material item."""
    async with pool.acquire() as conn:
        await conn.execute(
            "DELETE FROM client_portal.material_items WHERE id = $1",
            item_id
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
    
    async with pool.acquire() as conn:
        row = await conn.fetchrow(
            """INSERT INTO client_portal.payment_schedules 
               (project_id, title, notes, created_by, updated_by) 
               VALUES ($1, $2, $3, $4, $5) 
               RETURNING *""",
            data.project_id, data.title, data.notes, 
            current_user['id'], current_user['id']
        )
        return dict(row)

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
        
        row = await conn.fetchrow(query, *values)
        return dict(row)

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
    
    async with pool.acquire() as conn:
        # If next_milestone is true, clear any existing next_milestone for this project
        if data.next_milestone:
            await conn.execute(
                """UPDATE client_portal.payment_installments 
                   SET next_milestone = FALSE 
                   WHERE project_id = $1 AND status != 'paid'""",
                data.project_id
            )
        
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
        
        row = await conn.fetchrow(query, *values)
        
        # Log status changes
        if 'status' in diff:
            import json
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
    """Mark an installment as paid and generate invoice."""
    async with pool.acquire() as conn:
        # Get installment
        installment = await conn.fetchrow(
            "SELECT * FROM client_portal.payment_installments WHERE id = $1",
            installment_id
        )
        if not installment:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Installment not found")
        
        await verify_project_access(installment['project_id'], current_user, pool)
        
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
        
        # Check if already has an invoice
        existing_invoice = await conn.fetchrow(
            "SELECT id FROM client_portal.invoices WHERE installment_id = $1",
            installment_id
        )
        if existing_invoice:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Installment already has an invoice"
            )
        
        # Generate invoice number
        year = datetime.now().year
        project_short = installment['project_id'][:8]
        
        # Get next sequence number for this project and year
        max_invoice = await conn.fetchrow(
            """SELECT invoice_no FROM client_portal.invoices 
               WHERE project_id = $1 AND invoice_no LIKE $2 
               ORDER BY created_at DESC LIMIT 1""",
            installment['project_id'], f"INV-{project_short}-{year}-%"
        )
        
        if max_invoice:
            last_seq = int(max_invoice['invoice_no'].split('-')[-1])
            seq = last_seq + 1
        else:
            seq = 1
        
        invoice_no = f"INV-{project_short}-{year}-{seq:04d}"
        
        # Calculate totals
        subtotal = float(installment['amount'])
        tax = request.tax or 0.0
        total = subtotal + tax
        
        # For now, use a placeholder for PDF file_id (will be generated separately)
        import uuid
        pdf_file_id = str(uuid.uuid4())
        
        # Create invoice record
        invoice = await conn.fetchrow(
            """INSERT INTO client_portal.invoices 
               (project_id, installment_id, invoice_no, subtotal, tax, total, 
                currency, pdf_file_id, created_by) 
               VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) 
               RETURNING *""",
            installment['project_id'], installment_id, invoice_no, 
            subtotal, tax, total, installment['currency'], 
            pdf_file_id, current_user['id']
        )
        
        # Update installment status to paid and clear next_milestone
        await conn.execute(
            """UPDATE client_portal.payment_installments 
               SET status = 'paid', next_milestone = FALSE, updated_by = $1, updated_at = NOW() 
               WHERE id = $2""",
            current_user['id'], installment_id
        )
        
        # Log the event
        import json
        await conn.execute(
            """INSERT INTO client_portal.payment_events 
               (project_id, actor_id, entity_type, entity_id, action, diff) 
               VALUES ($1, $2, 'installment', $3, 'marked_paid', $4)""",
            installment['project_id'], current_user['id'], installment_id,
            json.dumps({'invoice_no': invoice_no})
        )
        
        return {
            "success": True,
            "invoice": dict(invoice),
            "installment_id": installment_id
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
