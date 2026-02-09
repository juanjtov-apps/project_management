"""
Project Stages API endpoints.
Manages project construction stages and stage templates.
"""
from typing import List, Dict, Any, Optional
from fastapi import APIRouter, HTTPException, status, Depends, Query, Body
from pydantic import BaseModel, Field
from datetime import date
import asyncpg

from src.database.connection import get_db_pool
from src.database.stage_repository import stage_template_repo, project_stage_repo
from src.api.auth import get_current_user_dependency, is_root_admin
from src.models.stage import (
    ProjectStageCreate,
    ProjectStageUpdate,
    ApplyTemplateRequest,
    ReorderStagesRequest,
)

router = APIRouter(prefix="/stages", tags=["stages"])


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
# STAGE TEMPLATES ENDPOINTS
# ============================================================================

@router.get("/templates", response_model=List[Dict[str, Any]])
async def get_stage_templates(
    current_user: Dict[str, Any] = Depends(get_current_user_dependency)
):
    """
    Get all available stage templates.
    Returns templates with their predefined stages.
    """
    return await stage_template_repo.get_all_templates()


@router.get("/templates/{template_id}", response_model=Dict[str, Any])
async def get_stage_template(
    template_id: str,
    current_user: Dict[str, Any] = Depends(get_current_user_dependency)
):
    """
    Get a specific stage template with its items.
    """
    template = await stage_template_repo.get_template_by_id(template_id)
    if not template:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Template not found"
        )
    return template


# ============================================================================
# PROJECT STAGES ENDPOINTS
# ============================================================================

@router.get("", response_model=List[Dict[str, Any]])
async def get_project_stages(
    project_id: str = Query(..., alias="projectId", description="Project ID to get stages for"),
    include_hidden: bool = Query(True, alias="includeHidden", description="Include stages hidden from clients"),
    current_user: Dict[str, Any] = Depends(get_current_user_dependency),
    pool: asyncpg.Pool = Depends(get_db_pool)
):
    """
    Get all stages for a project.
    Clients only see stages where client_visible=true.
    """
    await verify_project_access(project_id, current_user, pool)

    # Clients only see visible stages
    if is_client_role(current_user):
        include_hidden = False

    return await project_stage_repo.get_by_project(project_id, include_hidden)


@router.get("/{stage_id}", response_model=Dict[str, Any])
async def get_stage(
    stage_id: str,
    current_user: Dict[str, Any] = Depends(get_current_user_dependency),
    pool: asyncpg.Pool = Depends(get_db_pool)
):
    """
    Get a specific stage by ID.
    """
    stage = await project_stage_repo.get_by_id(stage_id)
    if not stage:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Stage not found"
        )

    await verify_project_access(stage['projectId'], current_user, pool)

    # Clients cannot view hidden stages
    if is_client_role(current_user) and not stage.get('clientVisible', True):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied: Stage is not visible to clients"
        )

    return stage


@router.post("", response_model=Dict[str, Any], status_code=status.HTTP_201_CREATED)
async def create_stage(
    stage: ProjectStageCreate,
    current_user: Dict[str, Any] = Depends(get_current_user_dependency),
    pool: asyncpg.Pool = Depends(get_db_pool)
):
    """
    Create a new project stage.
    Only PMs/admins can create stages.
    """
    await verify_project_access(stage.project_id, current_user, pool)

    if is_client_role(current_user):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Clients cannot create stages"
        )

    # Convert Pydantic model to dict
    stage_data = stage.model_dump(by_alias=False)

    return await project_stage_repo.create(stage_data, current_user['id'])


@router.patch("/{stage_id}", response_model=Dict[str, Any])
async def update_stage(
    stage_id: str,
    update: ProjectStageUpdate,
    current_user: Dict[str, Any] = Depends(get_current_user_dependency),
    pool: asyncpg.Pool = Depends(get_db_pool)
):
    """
    Update a project stage.
    Only PMs/admins can update stages.
    """
    stage = await project_stage_repo.get_by_id(stage_id)
    if not stage:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Stage not found"
        )

    await verify_project_access(stage['projectId'], current_user, pool)

    if is_client_role(current_user):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Clients cannot edit stages"
        )

    # Convert Pydantic model to dict, excluding unset fields
    update_data = update.model_dump(exclude_unset=True, by_alias=False)

    # Handle status enum
    if 'status' in update_data and update_data['status']:
        update_data['status'] = update_data['status'].value if hasattr(update_data['status'], 'value') else update_data['status']

    return await project_stage_repo.update(stage_id, update_data, user_id=current_user['id'])


@router.delete("/{stage_id}", status_code=status.HTTP_200_OK)
async def delete_stage(
    stage_id: str,
    current_user: Dict[str, Any] = Depends(get_current_user_dependency),
    pool: asyncpg.Pool = Depends(get_db_pool)
):
    """
    Delete a project stage.
    Materials linked to this stage become unlinked (not deleted).
    Only PMs/admins can delete stages.
    """
    stage = await project_stage_repo.get_by_id(stage_id)
    if not stage:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Stage not found"
        )

    await verify_project_access(stage['projectId'], current_user, pool)

    if is_client_role(current_user):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Clients cannot delete stages"
        )

    success = await project_stage_repo.delete(stage_id)
    return {"success": success, "message": "Stage deleted successfully"}


@router.post("/reorder", response_model=List[Dict[str, Any]])
async def reorder_stages(
    project_id: str = Query(..., alias="projectId"),
    request: ReorderStagesRequest = Body(...),
    current_user: Dict[str, Any] = Depends(get_current_user_dependency),
    pool: asyncpg.Pool = Depends(get_db_pool)
):
    """
    Reorder stages within a project.
    Only PMs/admins can reorder stages.
    """
    await verify_project_access(project_id, current_user, pool)

    if is_client_role(current_user):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Clients cannot reorder stages"
        )

    return await project_stage_repo.reorder(project_id, request.stage_ids)


@router.post("/apply-template", response_model=List[Dict[str, Any]])
async def apply_template(
    request: ApplyTemplateRequest,
    current_user: Dict[str, Any] = Depends(get_current_user_dependency),
    pool: asyncpg.Pool = Depends(get_db_pool)
):
    """
    Apply a template to create stages for a project.
    Only PMs/admins can apply templates.
    Overwrites existing stages if any.
    """
    await verify_project_access(request.project_id, current_user, pool)

    if is_client_role(current_user):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Clients cannot apply templates"
        )

    # Check if template exists
    template = await stage_template_repo.get_template_by_id(request.template_id)
    if not template:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Template not found"
        )

    # Check if project already has stages
    existing_count = await project_stage_repo.get_stages_count(request.project_id)
    if existing_count > 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Project already has {existing_count} stages. Delete existing stages first or add stages manually."
        )

    return await project_stage_repo.apply_template(
        request.project_id,
        request.template_id,
        current_user['id'],
        request.start_date
    )


@router.get("/count/{project_id}", response_model=Dict[str, int])
async def get_stages_count(
    project_id: str,
    current_user: Dict[str, Any] = Depends(get_current_user_dependency),
    pool: asyncpg.Pool = Depends(get_db_pool)
):
    """
    Get count of stages for a project.
    Useful for checking if template can be applied.
    """
    await verify_project_access(project_id, current_user, pool)

    count = await project_stage_repo.get_stages_count(project_id)
    return {"count": count}
