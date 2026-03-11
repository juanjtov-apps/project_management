"""
Users API endpoints for v1 API - imports from existing user management router.
"""
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from typing import Dict, Any
import json
import logging
from ...api.auth import get_current_user_dependency, is_user_admin, is_root_admin
from ...database.auth_repositories import auth_repo
from ...database.connection import get_db_pool

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/users", tags=["users"])

@router.get("")
@router.get("/")
async def get_users(current_user: Dict[str, Any] = Depends(get_current_user_dependency)):
    """Get users with proper authorization and company filtering."""
    try:
        if not is_user_admin(current_user):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Admin privileges required"
            )
        
        if is_root_admin(current_user):
            # Root admin sees all users
            users = await auth_repo.get_users()
            print(f"Root admin retrieved {len(users)} users")
            return users
        else:
            # Company admin sees only their company users
            # Handle both camelCase and snake_case
            user_company_id = current_user.get('companyId') or current_user.get('company_id')
            if user_company_id:
                # Ensure it's a string
                user_company_id = str(user_company_id)
                print(f"Company admin fetching users for company_id: {user_company_id}")
                users = await auth_repo.get_company_users(user_company_id)
                print(f"Company admin retrieved {len(users)} users for company {user_company_id}")
                if len(users) == 0:
                    print(f"WARNING: No users found for company_id {user_company_id}")
                return users
        
        print(f"WARNING: No company_id found for user {current_user.get('email')}")
        return []
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error fetching users: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to fetch users"
        )

@router.get("/managers")
async def get_managers(current_user: Dict[str, Any] = Depends(get_current_user_dependency)):
    """Get users/managers for task assignment with company filtering."""
    try:
        print(f"Fetching managers for task assignment - user: {current_user.get('email')}")
        
        # Get users filtered by company unless root admin
        if is_root_admin(current_user):
            # Root admin sees all users
            users = await auth_repo.get_users()
        else:
            # Company users see only their company users
            user_company_id = current_user.get('companyId') or current_user.get('company_id')
            if user_company_id:
                users = await auth_repo.get_company_users(str(user_company_id))
            else:
                users = []
                print(f"Warning: User {current_user.get('email')} has no company_id")
        
        print(f"Retrieved {len(users)} managers for task assignment")
        return users
        
    except Exception as e:
        print(f"Error fetching managers: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to fetch managers"
        )

class UpdatePreferencesRequest(BaseModel):
    preferences: Dict[str, Any]


@router.patch("/me/preferences")
async def update_my_preferences(
    body: UpdatePreferencesRequest,
    current_user: Dict[str, Any] = Depends(get_current_user_dependency),
):
    """Merge incoming preferences into the user's preferences JSONB column."""
    user_id = current_user.get("id")
    if not user_id:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found")

    try:
        pool = await get_db_pool()
        async with pool.acquire() as conn:
            # Merge new preferences with existing using jsonb || operator
            await conn.execute(
                """
                UPDATE users
                SET preferences = COALESCE(preferences, '{}'::jsonb) || $1::jsonb
                WHERE id = $2
                """,
                json.dumps(body.preferences),
                str(user_id),
            )

        return {"success": True, "preferences": body.preferences}

    except Exception as e:
        logger.error(f"Error updating preferences: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update preferences",
        )


__all__ = ['router']

