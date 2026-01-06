"""
RBAC API endpoints for v1 API - imports from existing user management router.
"""
from fastapi import APIRouter, Depends, HTTPException, status
from typing import Dict, Any
from ...api.auth import get_current_user_dependency, is_user_admin, is_root_admin
from ...database.auth_repositories import role_repo, auth_repo

router = APIRouter(prefix="/rbac", tags=["rbac"])

@router.get("/roles")
async def get_roles(current_user: Dict[str, Any] = Depends(get_current_user_dependency)):
    """Get all roles."""
    try:
        roles = await role_repo.get_roles()
        print(f"Retrieved {len(roles)} roles")
        return roles
        
    except Exception as e:
        error_msg = str(e)
        print(f"Error fetching roles: {error_msg}")
        import traceback
        traceback.print_exc()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch roles: {error_msg}"
        )

@router.get("/users")
async def get_users(current_user: Dict[str, Any] = Depends(get_current_user_dependency)):
    """Get users with proper authorization and company filtering."""
    try:
        print(f"[RBAC /users] Request from user: {current_user.get('email')}")
        
        if not is_user_admin(current_user):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Admin privileges required"
            )
        
        if is_root_admin(current_user):
            # Root admin sees all users
            print(f"[RBAC /users] Root admin - fetching all users")
            users = await auth_repo.get_users()
            print(f"[RBAC /users] Root admin retrieved {len(users)} users")
            
            # Debug: Log sample user data
            if users and len(users) > 0:
                sample = users[0]
                print(f"[RBAC /users] Sample user response: role={sample.get('role')}, roleName={sample.get('roleName')}, role_name={sample.get('role_name')}")
            
            return users
        else:
            # Company admin sees only their company users
            # Handle both camelCase and snake_case
            user_company_id = current_user.get('companyId') or current_user.get('company_id')
            if user_company_id:
                # Ensure it's a string
                user_company_id = str(user_company_id)
                print(f"[RBAC /users] Company admin fetching users for company_id: {user_company_id}")
                users = await auth_repo.get_company_users(user_company_id)
                print(f"[RBAC /users] Company admin retrieved {len(users)} users for company {user_company_id}")
                
                # Debug: Log sample user data
                if users and len(users) > 0:
                    sample = users[0]
                    print(f"[RBAC /users] Sample user response: role={sample.get('role')}, roleName={sample.get('roleName')}, role_name={sample.get('role_name')}")
                
                if len(users) == 0:
                    print(f"[RBAC /users] WARNING: No users found for company_id {user_company_id}")
                return users
        
        print(f"[RBAC /users] WARNING: No company_id found for user {current_user.get('email')}")
        return []
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"[RBAC /users] Error fetching users: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to fetch users"
        )

@router.get("/permissions")
async def get_permissions(current_user: Dict[str, Any] = Depends(get_current_user_dependency)):
    """Get all available permissions."""
    try:
        permissions = await role_repo.get_permissions()
        print(f"Retrieved {len(permissions)} permissions")
        return permissions
        
    except Exception as e:
        error_msg = str(e)
        print(f"Error fetching permissions: {error_msg}")
        import traceback
        traceback.print_exc()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch permissions: {error_msg}"
        )

__all__ = ['router']

