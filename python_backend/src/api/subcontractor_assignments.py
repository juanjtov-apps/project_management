from fastapi import APIRouter, HTTPException
from typing import List
from pydantic import BaseModel
from datetime import datetime
from ..database.repositories import SubcontractorAssignmentRepository

router = APIRouter()
repo = SubcontractorAssignmentRepository()

class SubcontractorAssignmentCreate(BaseModel):
    subcontractor_id: str
    project_id: str
    assigned_by: str
    start_date: datetime | None = None
    end_date: datetime | None = None
    specialization: str | None = None
    status: str = "active"

class SubcontractorAssignmentResponse(BaseModel):
    id: str
    subcontractor_id: str
    project_id: str
    assigned_by: str
    start_date: datetime | None
    end_date: datetime | None
    specialization: str | None
    status: str
    created_at: datetime

@router.get("/", response_model=List[SubcontractorAssignmentResponse])
async def get_subcontractor_assignments():
    """Get all subcontractor assignments"""
    try:
        assignments = await repo.get_all()
        return assignments
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/{assignment_id}", response_model=SubcontractorAssignmentResponse)
async def get_subcontractor_assignment(assignment_id: str):
    """Get a specific subcontractor assignment"""
    try:
        assignment = await repo.get_by_id(assignment_id)
        if not assignment:
            raise HTTPException(status_code=404, detail="Subcontractor assignment not found")
        return assignment
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/", response_model=SubcontractorAssignmentResponse, status_code=201)
async def create_subcontractor_assignment(assignment: SubcontractorAssignmentCreate):
    """Create a new subcontractor assignment"""
    try:
        assignment_data = assignment.model_dump()
        new_assignment = await repo.create(assignment_data)
        return new_assignment
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.put("/{assignment_id}", response_model=SubcontractorAssignmentResponse)
async def update_subcontractor_assignment(assignment_id: str, assignment: SubcontractorAssignmentCreate):
    """Update a subcontractor assignment"""
    try:
        assignment_data = assignment.model_dump()
        updated_assignment = await repo.update(assignment_id, assignment_data)
        if not updated_assignment:
            raise HTTPException(status_code=404, detail="Subcontractor assignment not found")
        return updated_assignment
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/{assignment_id}", status_code=204)
async def delete_subcontractor_assignment(assignment_id: str):
    """Delete a subcontractor assignment"""
    try:
        success = await repo.delete(assignment_id)
        if not success:
            raise HTTPException(status_code=404, detail="Subcontractor assignment not found")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/subcontractor/{subcontractor_id}", response_model=List[SubcontractorAssignmentResponse])
async def get_assignments_by_subcontractor(subcontractor_id: str):
    """Get all assignments for a specific subcontractor"""
    try:
        assignments = await repo.get_by_subcontractor(subcontractor_id)
        return assignments
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/project/{project_id}", response_model=List[SubcontractorAssignmentResponse])
async def get_assignments_by_project(project_id: str):
    """Get all assignments for a specific project"""
    try:
        assignments = await repo.get_by_project(project_id)
        return assignments
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))