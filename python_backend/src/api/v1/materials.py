"""
Materials API endpoints for suggested materials and approval workflow.
Handles PM approval of auto-populated materials from templates.
"""
from typing import List, Dict, Any, Optional
from fastapi import APIRouter, HTTPException, status, Depends, Query
from pydantic import BaseModel, Field
import asyncpg

from src.database.connection import get_db_pool, db_manager
from src.api.auth import get_current_user_dependency, is_root_admin

router = APIRouter(prefix="/materials", tags=["materials"])


# ============================================================================
# PYDANTIC MODELS
# ============================================================================

class BulkApprovalRequest(BaseModel):
    """Request to bulk approve or reject materials."""
    material_ids: List[str] = Field(..., description="List of material item IDs")
    action: str = Field(..., pattern="^(approve|reject)$", description="'approve' or 'reject'")


class MaterialApprovalResponse(BaseModel):
    """Response after bulk approval."""
    success: bool
    updated_count: int
    message: str


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


# ============================================================================
# SUGGESTED MATERIALS ENDPOINTS
# ============================================================================

@router.get("/suggested", response_model=List[Dict[str, Any]])
async def get_suggested_materials(
    project_id: str = Query(..., alias="projectId", description="Project ID"),
    current_user: Dict[str, Any] = Depends(get_current_user_dependency),
    pool: asyncpg.Pool = Depends(get_db_pool)
):
    """
    Get materials pending PM approval.
    Only PMs/admins can view pending materials. Clients cannot access this endpoint.
    Returns materials grouped by area with stage information.
    """
    await verify_project_access(project_id, current_user, pool)

    # Clients cannot view suggested/pending materials
    if is_client_role(current_user):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Clients cannot view pending materials"
        )

    query = """
        SELECT
            mi.id,
            mi.area_id,
            mi.project_id,
            mi.name,
            mi.spec,
            mi.product_link,
            mi.vendor,
            mi.quantity,
            mi.unit_cost,
            mi.status,
            mi.stage_id,
            mi.approval_status,
            mi.is_from_template,
            mi.added_by,
            mi.created_at,
            mi.updated_at,
            ma.name as area_name,
            ps.name as stage_name
        FROM client_portal.material_items mi
        JOIN client_portal.material_areas ma ON mi.area_id = ma.id
        LEFT JOIN client_portal.project_stages ps ON mi.stage_id = ps.id
        WHERE mi.project_id = $1
          AND mi.is_from_template = true
          AND mi.approval_status = 'pending'
        ORDER BY ma.sort_order, ma.name, mi.created_at
    """

    rows = await db_manager.execute_query(query, project_id)

    # Convert to list of dicts with camelCase keys
    results = []
    for row in rows:
        results.append({
            "id": str(row['id']),
            "areaId": str(row['area_id']),
            "projectId": row['project_id'],
            "name": row['name'],
            "spec": row['spec'],
            "productLink": row['product_link'],
            "vendor": row['vendor'],
            "quantity": row['quantity'],
            "unitCost": float(row['unit_cost']) if row['unit_cost'] else None,
            "status": row['status'],
            "stageId": str(row['stage_id']) if row['stage_id'] else None,
            "approvalStatus": row['approval_status'],
            "isFromTemplate": row['is_from_template'],
            "addedBy": row['added_by'],
            "createdAt": row['created_at'].isoformat() if row['created_at'] else None,
            "updatedAt": row['updated_at'].isoformat() if row['updated_at'] else None,
            "areaName": row['area_name'],
            "stageName": row['stage_name']
        })

    return results


@router.post("/approve-bulk", response_model=MaterialApprovalResponse)
async def approve_materials_bulk(
    request: BulkApprovalRequest,
    current_user: Dict[str, Any] = Depends(get_current_user_dependency),
    pool: asyncpg.Pool = Depends(get_db_pool)
):
    """
    Bulk approve or reject suggested materials.
    Only PMs/admins can approve materials. Clients cannot access this endpoint.

    - action='approve': Sets approval_status to 'approved', materials become visible to clients
    - action='reject': Sets approval_status to 'rejected', materials remain hidden
    """
    # Clients cannot approve materials
    if is_client_role(current_user):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Clients cannot approve or reject materials"
        )

    if not request.material_ids:
        return MaterialApprovalResponse(
            success=True,
            updated_count=0,
            message="No materials to update"
        )

    new_status = request.action  # 'approve' -> 'approved', 'reject' -> 'rejected'
    if request.action == 'approve':
        new_status = 'approved'
    elif request.action == 'reject':
        new_status = 'rejected'

    # Verify user has access to at least one of these materials' projects
    async with pool.acquire() as conn:
        # Get project IDs for the materials to verify access
        project_ids_query = """
            SELECT DISTINCT project_id FROM client_portal.material_items
            WHERE id = ANY($1::uuid[])
        """
        project_rows = await conn.fetch(project_ids_query, request.material_ids)

        for row in project_rows:
            await verify_project_access(row['project_id'], current_user, pool)

        # Update approval status
        update_query = """
            UPDATE client_portal.material_items
            SET approval_status = $1,
                updated_at = NOW()
            WHERE id = ANY($2::uuid[])
              AND is_from_template = true
              AND approval_status = 'pending'
            RETURNING id
        """

        updated_rows = await conn.fetch(update_query, new_status, request.material_ids)
        updated_count = len(updated_rows)

    action_word = "approved" if request.action == "approve" else "rejected"
    return MaterialApprovalResponse(
        success=True,
        updated_count=updated_count,
        message=f"Successfully {action_word} {updated_count} material(s)"
    )


@router.get("/by-stage/{stage_id}", response_model=List[Dict[str, Any]])
async def get_materials_by_stage(
    stage_id: str,
    current_user: Dict[str, Any] = Depends(get_current_user_dependency),
    pool: asyncpg.Pool = Depends(get_db_pool)
):
    """
    Get all materials linked to a specific stage.
    Clients only see approved materials.
    """
    # First get the stage to verify project access
    stage_query = """
        SELECT project_id FROM client_portal.project_stages WHERE id = $1
    """
    stage_row = await db_manager.execute_one(stage_query, stage_id)

    if not stage_row:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Stage not found"
        )

    await verify_project_access(stage_row['project_id'], current_user, pool)

    # Build approval filter for clients
    approval_filter = ""
    if is_client_role(current_user):
        approval_filter = "AND mi.approval_status = 'approved'"

    query = f"""
        SELECT
            mi.id,
            mi.area_id,
            mi.project_id,
            mi.name,
            mi.spec,
            mi.product_link,
            mi.vendor,
            mi.quantity,
            mi.unit_cost,
            mi.status,
            mi.stage_id,
            mi.approval_status,
            mi.is_from_template,
            mi.added_by,
            mi.created_at,
            mi.updated_at,
            ma.name as area_name
        FROM client_portal.material_items mi
        JOIN client_portal.material_areas ma ON mi.area_id = ma.id
        WHERE mi.stage_id = $1
        {approval_filter}
        ORDER BY ma.sort_order, ma.name, mi.created_at
    """

    rows = await db_manager.execute_query(query, stage_id)

    # Convert to list of dicts with camelCase keys
    results = []
    for row in rows:
        results.append({
            "id": str(row['id']),
            "areaId": str(row['area_id']),
            "projectId": row['project_id'],
            "name": row['name'],
            "spec": row['spec'],
            "productLink": row['product_link'],
            "vendor": row['vendor'],
            "quantity": row['quantity'],
            "unitCost": float(row['unit_cost']) if row['unit_cost'] else None,
            "status": row['status'],
            "stageId": str(row['stage_id']) if row['stage_id'] else None,
            "approvalStatus": row['approval_status'],
            "isFromTemplate": row['is_from_template'],
            "addedBy": row['added_by'],
            "createdAt": row['created_at'].isoformat() if row['created_at'] else None,
            "updatedAt": row['updated_at'].isoformat() if row['updated_at'] else None,
            "areaName": row['area_name']
        })

    return results


@router.get("/pending-count", response_model=Dict[str, int])
async def get_pending_materials_count(
    project_id: str = Query(..., alias="projectId", description="Project ID"),
    current_user: Dict[str, Any] = Depends(get_current_user_dependency),
    pool: asyncpg.Pool = Depends(get_db_pool)
):
    """
    Get count of materials pending approval for a project.
    Useful for showing badge/notification to PMs.
    """
    await verify_project_access(project_id, current_user, pool)

    # Clients don't need to see pending count
    if is_client_role(current_user):
        return {"count": 0}

    query = """
        SELECT COUNT(*) as count
        FROM client_portal.material_items
        WHERE project_id = $1
          AND is_from_template = true
          AND approval_status = 'pending'
    """

    row = await db_manager.execute_one(query, project_id)
    return {"count": row['count'] if row else 0}
