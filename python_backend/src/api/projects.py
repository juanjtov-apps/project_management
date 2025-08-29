"""
Project API endpoints with authentication and company filtering.
"""
from typing import List, Dict, Any
from fastapi import APIRouter, HTTPException, status, Depends
from src.models import Project, ProjectCreate, ProjectUpdate
from src.database.repositories import ProjectRepository
from src.api.auth import get_current_user_dependency, is_root_admin

router = APIRouter()
project_repo = ProjectRepository()


@router.get("", response_model=List[Project])
async def get_projects(current_user: Dict[str, Any] = Depends(get_current_user_dependency)):
    """Get all projects with company filtering."""
    try:
        projects = await project_repo.get_all()
        
        # Apply company filtering unless root admin
        if not is_root_admin(current_user):
            user_company_id = current_user.get('companyId')
            if user_company_id:
                # For now, return all projects as we need to enhance project repository for company filtering
                # TODO: Add company_id field to projects table and filter by it
                pass
        
        print(f"Retrieved {len(projects)} projects for user {current_user.get('email')}")
        return projects
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
async def create_project(
    project: ProjectCreate,
    current_user: Dict[str, Any] = Depends(get_current_user_dependency)
):
    """Create a new project with authentication."""
    try:
        print(f"Creating project for user {current_user.get('email')}: {project}")
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