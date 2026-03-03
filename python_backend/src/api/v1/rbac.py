"""
RBAC API endpoints for v1 API - imports from existing user management router.
"""
import logging
from fastapi import APIRouter, Depends, HTTPException, status
from typing import Dict, Any

logger = logging.getLogger(__name__)
from ...api.auth import get_current_user_dependency, is_user_admin, is_root_admin, get_effective_company_id
from ...database.auth_repositories import role_repo, auth_repo

router = APIRouter(prefix="/rbac", tags=["rbac"])

@router.get("/roles")
async def get_roles(current_user: Dict[str, Any] = Depends(get_current_user_dependency)):
    """Get all roles."""
    try:
        roles = await role_repo.get_roles()
        logger.debug(f"Retrieved {len(roles)} roles")
        return roles

    except Exception as e:
        error_msg = str(e)
        logger.error(f"Error fetching roles: {error_msg}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch roles: {error_msg}"
        )

@router.get("/users")
async def get_users(current_user: Dict[str, Any] = Depends(get_current_user_dependency)):
    """Get users with proper authorization and company filtering.

    - Root admin with org context: users from that org
    - Root admin without context: ALL users
    - Company admin: only their company users
    """
    try:
        logger.debug(f"[RBAC /users] Request from user: {current_user.get('email')}")

        if not is_user_admin(current_user):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Admin privileges required"
            )

        # Use effective company ID (respects org context for root users)
        effective_company_id = get_effective_company_id(current_user)
        logger.debug(f"[RBAC /users] Effective company_id: {effective_company_id}")

        if effective_company_id:
            # Filter by selected organization (or user's company for non-root)
            logger.debug(f"[RBAC /users] Fetching users for company_id: {effective_company_id}")
            users = await auth_repo.get_company_users(str(effective_company_id))
            logger.debug(f"[RBAC /users] Retrieved {len(users)} users for company {effective_company_id}")
        else:
            # Root admin with no org selected - show all users
            logger.debug(f"[RBAC /users] Root admin (no org context) - fetching ALL users")
            users = await auth_repo.get_users()
            logger.debug(f"[RBAC /users] Retrieved {len(users)} users (all)")

        return users

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"[RBAC /users] Error fetching users: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to fetch users"
        )

@router.get("/permissions")
async def get_permissions(current_user: Dict[str, Any] = Depends(get_current_user_dependency)):
    """Get all available permissions."""
    try:
        permissions = await role_repo.get_permissions()
        logger.debug(f"Retrieved {len(permissions)} permissions")
        return permissions

    except Exception as e:
        error_msg = str(e)
        logger.error(f"Error fetching permissions: {error_msg}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch permissions: {error_msg}"
        )

__all__ = ['router']

