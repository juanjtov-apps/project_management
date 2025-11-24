"""
Project API endpoints for v1 API with validation.
"""
from typing import List, Dict, Any
from fastapi import APIRouter, HTTPException, status, Depends
from ...models import Project, ProjectCreate, ProjectUpdate
from ...database.repositories import ProjectRepository
from ...api.auth import get_current_user_dependency, is_root_admin

router = APIRouter(prefix="/projects", tags=["projects"])
project_repo = ProjectRepository()


@router.get("", response_model=List[Project], summary="Get all projects")
async def get_projects(current_user: Dict[str, Any] = Depends(get_current_user_dependency)):
    """Get all projects with company filtering."""
    try:
        # Apply company filtering unless root admin
        if is_root_admin(current_user):
            projects = await project_repo.get_all()
            print(f"Root admin retrieved {len(projects)} projects")
        else:
            # Try both camelCase and snake_case for compatibility
            user_company_id = current_user.get('companyId') or current_user.get('company_id')
            print(f"User {current_user.get('email')} - companyId: {user_company_id}, current_user keys: {list(current_user.keys())}")
            
            if user_company_id:
                projects = await project_repo.get_by_company(str(user_company_id))
                print(f"User {current_user.get('email')} (company {user_company_id}) retrieved {len(projects)} projects")
            else:
                projects = []
                print(f"User {current_user.get('email')} has no company assigned, returning empty project list")
        
        return projects
    except Exception as e:
        print(f"Error fetching projects: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to fetch projects"
        )


@router.get("/{project_id}", response_model=Project, summary="Get project by ID")
async def get_project(
    project_id: str,
    current_user: Dict[str, Any] = Depends(get_current_user_dependency)
):
    """Get project by ID with company scoping."""
    try:
        project = await project_repo.get_by_id(project_id)
        if not project:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Project not found"
            )
        
        # Verify company access (unless root admin)
        if not is_root_admin(current_user):
            user_company_id = str(current_user.get('companyId'))
            project_company_id = str(project.get('company_id'))
            if project_company_id != user_company_id:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Access denied: Project belongs to different company"
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


@router.post("", response_model=Project, status_code=status.HTTP_201_CREATED, summary="Create project")
async def create_project(
    project: ProjectCreate,
    current_user: Dict[str, Any] = Depends(get_current_user_dependency)
):
    """Create a new project with authentication and company assignment."""
    try:
        user_company_id = current_user.get('companyId')
        if not user_company_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="User must be assigned to a company to create projects"
            )
        
        # Assign project to user's company
        project_data = project.dict()
        project_data['company_id'] = str(user_company_id)
        
        return await project_repo.create(ProjectCreate(**project_data))
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error creating project: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create project"
        )


@router.patch("/{project_id}", response_model=Project, summary="Update project")
async def update_project(
    project_id: str,
    project_update: ProjectUpdate,
    current_user: Dict[str, Any] = Depends(get_current_user_dependency)
):
    """Update an existing project with company scoping."""
    try:
        existing_project = await project_repo.get_by_id(project_id)
        if not existing_project:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Project not found"
            )
        
        # Verify company access (unless root admin)
        if not is_root_admin(current_user):
            user_company_id = str(current_user.get('companyId'))
            project_company_id = str(existing_project.get('company_id'))
            if project_company_id != user_company_id:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Access denied: Project belongs to different company"
                )
        
        return await project_repo.update(project_id, project_update)
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error updating project {project_id}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update project"
        )


@router.delete("/{project_id}", status_code=status.HTTP_204_NO_CONTENT, summary="Delete project")
async def delete_project(
    project_id: str,
    current_user: Dict[str, Any] = Depends(get_current_user_dependency)
):
    """Delete a project with company scoping."""
    try:
        existing_project = await project_repo.get_by_id(project_id)
        if not existing_project:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Project not found"
            )
        
        # Verify company access (unless root admin)
        if not is_root_admin(current_user):
            user_company_id = str(current_user.get('companyId'))
            project_company_id = str(existing_project.get('company_id'))
            if project_company_id != user_company_id:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Access denied: Project belongs to different company"
                )
        
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
        if "foreign key constraint" in error_msg.lower():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Cannot delete project because it has associated data"
            )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to delete project: {error_msg}"
        )

