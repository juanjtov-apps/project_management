"""
Project API endpoints for v1 API with validation.
"""
from typing import List, Dict, Any
from fastapi import APIRouter, HTTPException, status, Depends
from ...models import Project, ProjectCreate, ProjectUpdate
from ...database.repositories import ProjectRepository
from ...api.auth import get_current_user_dependency, is_root_admin, get_effective_company_id
import logging

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/projects", tags=["projects"])
project_repo = ProjectRepository()


@router.get("", response_model=List[Project], summary="Get all projects")
async def get_projects(current_user: Dict[str, Any] = Depends(get_current_user_dependency)):
    """Get all projects with company filtering.

    - Root admin with org context: projects from that org
    - Root admin without context: ALL projects
    - Client user: ONLY their assigned project
    - Company user: only their company projects
    """
    try:
        # Check if user is a client - they only see their assigned project
        user_role = str(current_user.get('role', '')).lower()
        assigned_project_id = current_user.get('assignedProjectId') or current_user.get('assigned_project_id')

        if user_role == 'client':
            if assigned_project_id:
                # Client with assigned project - return only that project
                project = await project_repo.get_by_id(assigned_project_id)
                projects = [project] if project else []
                logger.debug(f"Client user {current_user.get('email')} - returning assigned project {assigned_project_id}")
            else:
                # Client without assigned project - return empty list
                projects = []
                logger.debug(f"Client user {current_user.get('email')} has no assigned project")
            return projects

        # Use effective company ID (respects org context for root users)
        effective_company_id = get_effective_company_id(current_user)
        logger.debug(f"User {current_user.get('email')} - effective_company_id: {effective_company_id}")

        if effective_company_id:
            # Filter by selected organization (or user's company for non-root)
            projects = await project_repo.get_by_company(str(effective_company_id))
            logger.debug(f"Retrieved {len(projects)} projects for company {effective_company_id}")
        else:
            # Root admin with no org selected - show all
            projects = await project_repo.get_all()
            logger.debug(f"Root admin (no org context) retrieved {len(projects)} projects (all)")

        return projects
    except Exception as e:
        logger.error(f"Error fetching projects: {e}", exc_info=True)
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
        # Check if user is a client - they can only access their assigned project
        user_role = str(current_user.get('role', '')).lower()
        if user_role == 'client':
            assigned_project_id = current_user.get('assignedProjectId') or current_user.get('assigned_project_id')
            if project_id != assigned_project_id:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Access denied: You can only access your assigned project"
                )

        project = await project_repo.get_by_id(project_id)
        if not project:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Project not found"
            )

        # Verify company access (unless root admin or client - client already checked above)
        if not is_root_admin(current_user) and user_role != 'client':
            user_company_id = str(current_user.get('companyId') or current_user.get('company_id'))
            project_company_id = str(getattr(project, 'company_id', None) or getattr(project, 'companyId', '') or '')
            if project_company_id != user_company_id:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Access denied: Project belongs to different company"
                )

        return project
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching project {project_id}: {e}", exc_info=True)
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
        # Try both camelCase and snake_case for compatibility
        user_company_id = current_user.get('companyId') or current_user.get('company_id')
        if not user_company_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="User must be assigned to a company to create projects"
            )
        
        # Assign project to user's company
        # Create the project model first, then set company_id directly in the repository
        logger.info(f"Creating project for user {current_user.get('email')} (company {user_company_id})")
        # Pass company_id as a separate parameter to ensure it's set
        created_project = await project_repo.create(project, company_id=str(user_company_id))
        return created_project
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error creating project: {e}", exc_info=True)
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
            user_company_id = str(current_user.get('companyId') or current_user.get('company_id'))
            # existing_project is a Pydantic model, access attribute directly
            project_company_id = str(existing_project.company_id) if hasattr(existing_project, 'company_id') else ""
            if project_company_id != user_company_id:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Access denied: Project belongs to different company"
                )
        
        return await project_repo.update(project_id, project_update)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating project {project_id}: {e}", exc_info=True)
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
            user_company_id = str(current_user.get('companyId') or current_user.get('company_id'))
            # existing_project is a Project model, access attribute directly or via dict
            if hasattr(existing_project, 'company_id'):
                project_company_id = str(getattr(existing_project, 'company_id', None) or '')
            else:
                project_dict = existing_project.model_dump(by_alias=False) if hasattr(existing_project, 'model_dump') else {}
                project_company_id = str(project_dict.get('company_id', ''))
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
        logger.error(f"Error deleting project {project_id}: {error_msg}", exc_info=True)
        
        if "foreign key constraint" in error_msg.lower():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Cannot delete project because it has associated data (tasks, photos, client portal data, etc.). Please remove all related data first."
            )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to delete project: {error_msg}"
        )

