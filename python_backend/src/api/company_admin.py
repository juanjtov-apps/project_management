"""
Company Admin API Endpoints
Provides company-level administration capabilities for company admins.
Includes user management, role assignment, and company settings.
"""

from fastapi import APIRouter, HTTPException, Depends, Query, Request
from typing import List, Optional, Dict, Any
from pydantic import BaseModel, EmailStr
import asyncpg
from ..database.connection import get_db_pool
from .auth import get_current_user_dependency
import bcrypt
import uuid

router = APIRouter(prefix="/company-admin", tags=["company-admin"])

# Pydantic models
class InviteUserRequest(BaseModel):
    email: EmailStr
    first_name: str
    last_name: str
    role: str  # admin, manager, crew, contractor, client

class AssignRoleRequest(BaseModel):
    user_id: str
    role: str

class UserResponse(BaseModel):
    id: str
    email: str
    name: str
    role: str
    company_id: str
    is_active: bool
    created_at: str
    last_login_at: Optional[str]

# Helper to verify company admin access
async def verify_company_admin(current_user: dict):
    """Verify the current user is a company admin or root admin."""
    is_root = (
        current_user.get("id") == "0" or 
        current_user.get("email") == "chacjjlegacy@proesphera.com" or
        current_user.get("email") == "admin@proesphere.com"
    )
    
    is_company_admin = current_user.get("role") == "admin"
    
    if not (is_root or is_company_admin):
        raise HTTPException(
            status_code=403,
            detail="Company admin access required. You must be a company administrator to perform this action."
        )
    
    return current_user

@router.get("/users", response_model=List[UserResponse])
async def list_company_users(
    skip: int = Query(0, ge=0, description="Number of records to skip"),
    limit: int = Query(50, ge=1, le=100, description="Maximum number of records to return"),
    pool: asyncpg.Pool = Depends(get_db_pool),
    current_user: dict = Depends(get_current_user_dependency)
):
    """
    List all users in the current user's company (company admin only).
    Returns: User ID, email, name, role, and activity status.
    """
    await verify_company_admin(current_user)
    
    # Root admin can see all companies, company admin sees only their company
    is_root = current_user.get("id") == "0" or current_user.get("email") in ["chacjjlegacy@proesphera.com", "admin@proesphere.com"]
    company_id = current_user.get("company_id")
    
    if not is_root and not company_id:
        raise HTTPException(status_code=400, detail="Company ID not found for user")
    
    async with pool.acquire() as conn:
        if is_root:
            # Root admin sees all users
            query = """
                SELECT 
                    id, email, name, role, company_id,
                    COALESCE(is_active, true) as is_active,
                    created_at, last_login_at
                FROM users
                ORDER BY created_at DESC
                OFFSET $1 LIMIT $2
            """
            params = [skip, limit]
        else:
            # Company admin sees only their company's users
            query = """
                SELECT 
                    id, email, name, role, company_id,
                    COALESCE(is_active, true) as is_active,
                    created_at, last_login_at
                FROM users
                WHERE company_id = $1
                ORDER BY created_at DESC
                OFFSET $2 LIMIT $3
            """
            params = [company_id, skip, limit]
        
        rows = await conn.fetch(query, *params)
        
        return [
            {
                "id": row["id"],
                "email": row["email"] or "",
                "name": row["name"] or "Unknown",
                "role": row["role"] or "user",
                "company_id": row["company_id"] or "",
                "is_active": row["is_active"],
                "created_at": row["created_at"].isoformat() if row["created_at"] else None,
                "last_login_at": row["last_login_at"].isoformat() if row["last_login_at"] else None
            }
            for row in rows
        ]

@router.post("/users/invite", response_model=UserResponse)
async def invite_user(
    request: InviteUserRequest,
    pool: asyncpg.Pool = Depends(get_db_pool),
    current_user: dict = Depends(get_current_user_dependency)
):
    """
    Invite a new user to the company (company admin only).
    Creates a user account with a temporary password.
    """
    await verify_company_admin(current_user)
    
    company_id = current_user.get("company_id")
    if not company_id:
        raise HTTPException(status_code=400, detail="Company ID not found for admin user")
    
    # Validate role - unified role set across Node.js and Python backends
    # Includes both current Node.js roles and legacy database roles
    valid_roles = [
        "admin",           # Admin role
        "project_manager", # Project Manager role (Node.js)
        "office_manager",  # Office Manager role (Node.js)
        "manager",         # Legacy Manager role (may be migrated to project_manager)
        "crew",            # Legacy Crew role (may be migrated to subcontractor)
        "subcontractor",   # Subcontractor role (Node.js)
        "contractor",      # Legacy Contractor role
        "client"           # Client role
    ]
    if request.role not in valid_roles:
        raise HTTPException(status_code=400, detail=f"Invalid role. Must be one of: {', '.join(valid_roles)}")
    
    async with pool.acquire() as conn:
        # Check if user already exists
        existing_user = await conn.fetchrow(
            "SELECT id FROM users WHERE email = $1",
            request.email
        )
        
        if existing_user:
            raise HTTPException(status_code=400, detail="User with this email already exists")
        
        # Generate temporary password
        temp_password = str(uuid.uuid4())[:12]
        hashed_password = bcrypt.hashpw(temp_password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
        
        # Create user
        user_id = str(uuid.uuid4())
        name = f"{request.first_name} {request.last_name}".strip()
        
        await conn.execute("""
            INSERT INTO users (id, email, name, first_name, last_name, password, role, company_id, is_active, created_at, updated_at)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, true, NOW(), NOW())
        """, user_id, request.email, name, request.first_name, request.last_name, hashed_password, request.role, company_id)
        
        # Fetch the created user
        user = await conn.fetchrow(
            "SELECT id, email, name, role, company_id, is_active, created_at, last_login_at FROM users WHERE id = $1",
            user_id
        )
        
        # TODO: Implement secure invite email delivery with one-time token
        # SECURITY: Never log passwords - implement email/SMS delivery or one-time link system
        
        return {
            "id": user["id"],
            "email": user["email"],
            "name": user["name"],
            "role": user["role"],
            "company_id": user["company_id"],
            "is_active": user["is_active"],
            "created_at": user["created_at"].isoformat() if user["created_at"] else None,
            "last_login_at": user["last_login_at"].isoformat() if user["last_login_at"] else None
        }

@router.put("/users/{user_id}/role", response_model=UserResponse)
async def assign_user_role(
    user_id: str,
    request: AssignRoleRequest,
    pool: asyncpg.Pool = Depends(get_db_pool),
    current_user: dict = Depends(get_current_user_dependency)
):
    """
    Assign a role to a user (company admin only).
    Cannot modify root admin or users from other companies.
    """
    await verify_company_admin(current_user)
    
    company_id = current_user.get("company_id")
    is_root = current_user.get("id") == "0" or current_user.get("email") in ["chacjjlegacy@proesphera.com", "admin@proesphere.com"]
    
    # Validate role - unified role set across Node.js and Python backends
    # Includes both current Node.js roles and legacy database roles
    valid_roles = [
        "admin",           # Admin role
        "project_manager", # Project Manager role (Node.js)
        "office_manager",  # Office Manager role (Node.js)
        "manager",         # Legacy Manager role (may be migrated to project_manager)
        "crew",            # Legacy Crew role (may be migrated to subcontractor)
        "subcontractor",   # Subcontractor role (Node.js)
        "contractor",      # Legacy Contractor role
        "client"           # Client role
    ]
    if request.role not in valid_roles:
        raise HTTPException(status_code=400, detail=f"Invalid role. Must be one of: {', '.join(valid_roles)}")
    
    async with pool.acquire() as conn:
        # Get target user
        target_user = await conn.fetchrow(
            "SELECT id, company_id, email FROM users WHERE id = $1",
            user_id
        )
        
        if not target_user:
            raise HTTPException(status_code=404, detail="User not found")
        
        # Prevent modifying root admin
        if target_user["id"] == "0" or target_user["email"] in ["chacjjlegacy@proesphera.com", "admin@proesphere.com"]:
            raise HTTPException(status_code=403, detail="Cannot modify root administrator")
        
        # Company admin can only modify users in their company
        if not is_root and target_user["company_id"] != company_id:
            raise HTTPException(status_code=403, detail="Cannot modify users from other companies")
        
        # Update user role
        await conn.execute(
            "UPDATE users SET role = $1, updated_at = NOW() WHERE id = $2",
            request.role, user_id
        )
        
        # Fetch updated user
        user = await conn.fetchrow(
            "SELECT id, email, name, role, company_id, is_active, created_at FROM users WHERE id = $1",
            user_id
        )
        
        return {
            "id": user["id"],
            "email": user["email"],
            "name": user["name"],
            "role": user["role"],
            "company_id": user["company_id"],
            "is_active": user["is_active"],
            "created_at": user["created_at"].isoformat() if user["created_at"] else None,
            "last_login_at": None  # This field doesn't exist in the database
        }

@router.put("/users/{user_id}/suspend")
async def suspend_user(
    user_id: str,
    pool: asyncpg.Pool = Depends(get_db_pool),
    current_user: dict = Depends(get_current_user_dependency)
):
    """
    Suspend a user account (company admin only).
    Cannot suspend root admin or users from other companies.
    """
    await verify_company_admin(current_user)
    
    company_id = current_user.get("company_id")
    is_root = current_user.get("id") == "0" or current_user.get("email") in ["chacjjlegacy@proesphera.com", "admin@proesphere.com"]
    
    async with pool.acquire() as conn:
        # Get target user
        target_user = await conn.fetchrow(
            "SELECT id, company_id, email FROM users WHERE id = $1",
            user_id
        )
        
        if not target_user:
            raise HTTPException(status_code=404, detail="User not found")
        
        # Prevent suspending root admin
        if target_user["id"] == "0" or target_user["email"] in ["chacjjlegacy@proesphera.com", "admin@proesphere.com"]:
            raise HTTPException(status_code=403, detail="Cannot suspend root administrator")
        
        # Company admin can only suspend users in their company
        if not is_root and target_user["company_id"] != company_id:
            raise HTTPException(status_code=403, detail="Cannot suspend users from other companies")
        
        # Suspend user
        await conn.execute(
            "UPDATE users SET is_active = false, updated_at = NOW() WHERE id = $1",
            user_id
        )
        
        return {"success": True, "message": f"User {user_id} has been suspended"}

@router.put("/users/{user_id}/activate")
async def activate_user(
    user_id: str,
    pool: asyncpg.Pool = Depends(get_db_pool),
    current_user: dict = Depends(get_current_user_dependency)
):
    """
    Activate a suspended user account (company admin only).
    """
    await verify_company_admin(current_user)
    
    company_id = current_user.get("company_id")
    is_root = current_user.get("id") == "0" or current_user.get("email") in ["chacjjlegacy@proesphera.com", "admin@proesphere.com"]
    
    async with pool.acquire() as conn:
        # Get target user
        target_user = await conn.fetchrow(
            "SELECT id, company_id FROM users WHERE id = $1",
            user_id
        )
        
        if not target_user:
            raise HTTPException(status_code=404, detail="User not found")
        
        # Company admin can only activate users in their company
        if not is_root and target_user["company_id"] != company_id:
            raise HTTPException(status_code=403, detail="Cannot activate users from other companies")
        
        # Activate user
        await conn.execute(
            "UPDATE users SET is_active = true, updated_at = NOW() WHERE id = $1",
            user_id
        )
        
        return {"success": True, "message": f"User {user_id} has been activated"}
