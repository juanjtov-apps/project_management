"""Users API endpoints for ContractorPro"""

from fastapi import APIRouter, HTTPException
from typing import List
from ..database.repositories import UserRepository
from ..models.user import User

router = APIRouter()
user_repo = UserRepository()

# Add route without trailing slash to handle both /api/users and /api/users/
@router.get("", response_model=List[User])
async def get_users_no_slash():
    """Get all users (without trailing slash)"""
    return await get_users()

@router.get("/", response_model=List[User])
async def get_users():
    """Get all users"""
    print("🔍 DEBUG: /api/users endpoint called")
    try:
        print("🔍 DEBUG: Attempting to get users from repository")
        users = await user_repo.get_all()
        print(f"🔍 DEBUG: Retrieved {len(users)} users successfully")
        return users
    except Exception as e:
        print(f"❌ ERROR in get_users: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Failed to get users: {str(e)}")

@router.get("/managers", response_model=List[User])
async def get_managers():
    """Get all managers"""
    try:
        managers = await user_repo.get_by_role("manager")
        return managers
    except Exception as e:
        print(f"Error getting managers: {e}")
        raise HTTPException(status_code=500, detail="Failed to get managers")

@router.get("/{user_id}", response_model=User)
async def get_user(user_id: str):
    """Get a specific user by ID"""
    try:
        user = await user_repo.get_by_id(user_id)
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        return user
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error getting user {user_id}: {e}")
        raise HTTPException(status_code=500, detail="Failed to get user")