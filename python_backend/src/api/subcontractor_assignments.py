from fastapi import APIRouter, HTTPException, Depends
from typing import List, Dict, Any
from pydantic import BaseModel, Field, ConfigDict
from datetime import datetime
from ..database.repositories import SubcontractorAssignmentRepository
from ..database.connection import get_db_pool
from .auth import get_current_user_dependency, is_root_admin
import asyncpg

router = APIRouter()
repo = SubcontractorAssignmentRepository()

class SubcontractorAssignmentCreate(BaseModel):
    model_config = ConfigDict(populate_by_name=True)
    
    subcontractor_id: str = Field(alias="subcontractorId")
    project_id: str = Field(alias="projectId")
    assigned_by: str = Field(alias="assignedBy")
    start_date: datetime | None = Field(alias="startDate", default=None)
    end_date: datetime | None = Field(alias="endDate", default=None)
    specialization: str | None = None
    status: str = "active"

class SubcontractorAssignmentResponse(BaseModel):
    model_config = ConfigDict(populate_by_name=True, from_attributes=True)
    
    id: str
    subcontractor_id: str = Field(alias="subcontractorId")
    project_id: str = Field(alias="projectId")
    assigned_by: str = Field(alias="assignedBy")
    start_date: datetime | None = Field(alias="startDate")
    end_date: datetime | None = Field(alias="endDate")
    specialization: str | None = None
    status: str
    created_at: datetime = Field(alias="createdAt")

@router.get("/", response_model=List[SubcontractorAssignmentResponse])
async def get_subcontractor_assignments(
    current_user: Dict[str, Any] = Depends(get_current_user_dependency),
    pool: asyncpg.Pool = Depends(get_db_pool)
):
    """Get all subcontractor assignments with company scoping."""
    try:
        assignments = await repo.get_all()
        
        # Apply company filtering unless root admin
        if not is_root_admin(current_user):
            user_company_id = str(current_user.get('companyId') or current_user.get('company_id'))
            filtered_assignments = []
            async with pool.acquire() as conn:
                for assignment in assignments:
                    # Get project to check company
                    project_id = assignment.get('project_id') or assignment.get('projectId')
                    if project_id:
                        project = await conn.fetchrow(
                            "SELECT company_id FROM projects WHERE id = $1",
                            project_id
                        )
                        if project and str(project['company_id']) == user_company_id:
                            filtered_assignments.append(assignment)
            assignments = filtered_assignments
        
        return assignments
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/{assignment_id}", response_model=SubcontractorAssignmentResponse)
async def get_subcontractor_assignment(
    assignment_id: str,
    current_user: Dict[str, Any] = Depends(get_current_user_dependency),
    pool: asyncpg.Pool = Depends(get_db_pool)
):
    """Get a specific subcontractor assignment with company access check."""
    try:
        assignment = await repo.get_by_id(assignment_id)
        if not assignment:
            raise HTTPException(status_code=404, detail="Subcontractor assignment not found")
        
        # Verify company access unless root admin
        if not is_root_admin(current_user):
            user_company_id = str(current_user.get('companyId') or current_user.get('company_id'))
            project_id = assignment.get('project_id') or assignment.get('projectId')
            if project_id:
                async with pool.acquire() as conn:
                    project = await conn.fetchrow(
                        "SELECT company_id FROM projects WHERE id = $1",
                        project_id
                    )
                    if not project or str(project['company_id']) != user_company_id:
                        raise HTTPException(status_code=403, detail="Access denied to this assignment")
        
        return assignment
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/", response_model=SubcontractorAssignmentResponse, status_code=201)
async def create_subcontractor_assignment(
    assignment: SubcontractorAssignmentCreate,
    current_user: Dict[str, Any] = Depends(get_current_user_dependency),
    pool: asyncpg.Pool = Depends(get_db_pool)
):
    """Create a new subcontractor assignment with company access check."""
    try:
        # Verify company access unless root admin
        if not is_root_admin(current_user):
            user_company_id = str(current_user.get('companyId') or current_user.get('company_id'))
            project_id = assignment.project_id
            async with pool.acquire() as conn:
                project = await conn.fetchrow(
                    "SELECT company_id FROM projects WHERE id = $1",
                    project_id
                )
                if not project or str(project['company_id']) != user_company_id:
                    raise HTTPException(status_code=403, detail="Cannot create assignment for projects outside your company")
        
        assignment_data = assignment.model_dump()
        new_assignment = await repo.create(assignment_data)
        return new_assignment
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.put("/{assignment_id}", response_model=SubcontractorAssignmentResponse)
async def update_subcontractor_assignment(
    assignment_id: str,
    assignment: SubcontractorAssignmentCreate,
    current_user: Dict[str, Any] = Depends(get_current_user_dependency),
    pool: asyncpg.Pool = Depends(get_db_pool)
):
    """Update a subcontractor assignment with company access check."""
    try:
        # Get existing assignment to verify access
        existing = await repo.get_by_id(assignment_id)
        if not existing:
            raise HTTPException(status_code=404, detail="Subcontractor assignment not found")
        
        # Verify company access unless root admin
        if not is_root_admin(current_user):
            user_company_id = str(current_user.get('companyId') or current_user.get('company_id'))
            project_id = existing.get('project_id') or existing.get('projectId')
            if project_id:
                async with pool.acquire() as conn:
                    project = await conn.fetchrow(
                        "SELECT company_id FROM projects WHERE id = $1",
                        project_id
                    )
                    if not project or str(project['company_id']) != user_company_id:
                        raise HTTPException(status_code=403, detail="Cannot update assignment for projects outside your company")
        
        assignment_data = assignment.model_dump()
        updated_assignment = await repo.update(assignment_id, assignment_data)
        if not updated_assignment:
            raise HTTPException(status_code=404, detail="Subcontractor assignment not found")
        return updated_assignment
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/{assignment_id}", status_code=204)
async def delete_subcontractor_assignment(
    assignment_id: str,
    current_user: Dict[str, Any] = Depends(get_current_user_dependency),
    pool: asyncpg.Pool = Depends(get_db_pool)
):
    """Delete a subcontractor assignment with company access check."""
    try:
        # Get existing assignment to verify access
        existing = await repo.get_by_id(assignment_id)
        if not existing:
            raise HTTPException(status_code=404, detail="Subcontractor assignment not found")
        
        # Verify company access unless root admin
        if not is_root_admin(current_user):
            user_company_id = str(current_user.get('companyId') or current_user.get('company_id'))
            project_id = existing.get('project_id') or existing.get('projectId')
            if project_id:
                async with pool.acquire() as conn:
                    project = await conn.fetchrow(
                        "SELECT company_id FROM projects WHERE id = $1",
                        project_id
                    )
                    if not project or str(project['company_id']) != user_company_id:
                        raise HTTPException(status_code=403, detail="Cannot delete assignment for projects outside your company")
        
        success = await repo.delete(assignment_id)
        if not success:
            raise HTTPException(status_code=404, detail="Subcontractor assignment not found")
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/subcontractor/{subcontractor_id}", response_model=List[SubcontractorAssignmentResponse])
async def get_assignments_by_subcontractor(
    subcontractor_id: str,
    current_user: Dict[str, Any] = Depends(get_current_user_dependency),
    pool: asyncpg.Pool = Depends(get_db_pool)
):
    """Get all assignments for a specific subcontractor with company scoping."""
    try:
        assignments = await repo.get_by_subcontractor(subcontractor_id)
        
        # Apply company filtering unless root admin
        if not is_root_admin(current_user):
            user_company_id = str(current_user.get('companyId') or current_user.get('company_id'))
            filtered_assignments = []
            async with pool.acquire() as conn:
                for assignment in assignments:
                    project_id = assignment.get('project_id') or assignment.get('projectId')
                    if project_id:
                        project = await conn.fetchrow(
                            "SELECT company_id FROM projects WHERE id = $1",
                            project_id
                        )
                        if project and str(project['company_id']) == user_company_id:
                            filtered_assignments.append(assignment)
            assignments = filtered_assignments
        
        return assignments
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/project/{project_id}", response_model=List[SubcontractorAssignmentResponse])
async def get_assignments_by_project(
    project_id: str,
    current_user: Dict[str, Any] = Depends(get_current_user_dependency),
    pool: asyncpg.Pool = Depends(get_db_pool)
):
    """Get all assignments for a specific project with company access check."""
    try:
        # Verify company access unless root admin
        if not is_root_admin(current_user):
            user_company_id = str(current_user.get('companyId') or current_user.get('company_id'))
            async with pool.acquire() as conn:
                project = await conn.fetchrow(
                    "SELECT company_id FROM projects WHERE id = $1",
                    project_id
                )
                if not project or str(project['company_id']) != user_company_id:
                    raise HTTPException(status_code=403, detail="Access denied to this project's assignments")
        
        assignments = await repo.get_by_project(project_id)
        return assignments
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))