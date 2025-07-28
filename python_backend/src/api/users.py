"""Users API endpoints for ContractorPro"""

from fastapi import APIRouter, HTTPException
from typing import List
from ..database.repositories import UserRepository
from ..models.user import User

router = APIRouter(prefix="/users", tags=["users"])
user_repo = UserRepository()

@router.get("/", response_model=List[User])
async def get_users():
    """Get all users"""
    try:
        users = await user_repo.get_all()
        return users
    except Exception as e:
        print(f"Error getting users: {e}")
        raise HTTPException(status_code=500, detail="Failed to get users")

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