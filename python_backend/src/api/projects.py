"""
Project API endpoints.
"""
from typing import List
from fastapi import APIRouter, HTTPException, status
from src.models import Project, ProjectCreate, ProjectUpdate
from src.database.repositories import ProjectRepository

router = APIRouter(prefix="/projects", tags=["projects"])
project_repo = ProjectRepository()


@router.get("", response_model=List[Project])
async def get_projects():
    """Get all projects."""
    try:
        return await project_repo.get_all()
    except Exception as e:
        print(f"Error fetching projects: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to fetch projects"
        )


@router.get("/{project_id}", response_model=Project)
async def get_project(project_id: str):
    """Get project by ID."""
    try:
        project = await project_repo.get_by_id(project_id)
        if not project:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Project not found"
            )
        return project
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error fetching project {project_id}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to fetch project"
        )


@router.post("", response_model=Project, status_code=status.HTTP_201_CREATED)
async def create_project(project: ProjectCreate):
    """Create a new project."""
    try:
        return await project_repo.create(project)
    except Exception as e:
        print(f"Error creating project: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create project"
        )


@router.patch("/{project_id}", response_model=Project)
async def update_project(project_id: str, project_update: ProjectUpdate):
    """Update an existing project."""
    try:
        project = await project_repo.update(project_id, project_update)
        if not project:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Project not found"
            )
        return project
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error updating project {project_id}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update project"
        )


@router.delete("/{project_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_project(project_id: str):
    """Delete a project."""
    try:
        success = await project_repo.delete(project_id)
        if not success:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Project not found"
            )
    except HTTPException:
        raise
    except Exception as e:
        error_msg = str(e)
        print(f"Error deleting project {project_id}: {error_msg}")
        
        # Check for foreign key constraint violation
        if "foreign key constraint" in error_msg.lower():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Cannot delete project because it has associated data (tasks, photos, etc.). Please remove all related data first."
            )
        
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to delete project: {error_msg}"
        )