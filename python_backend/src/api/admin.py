"""
Root Admin API Endpoints
Provides platform-wide administration capabilities for the root user only.
All endpoints are read-only to ensure data safety.
"""

from fastapi import APIRouter, HTTPException, Depends, Query
from typing import List, Optional, Dict, Any
from pydantic import BaseModel
import asyncpg
from ..database.connection import get_db_pool
from .auth import get_current_user_dependency

router = APIRouter(prefix="/admin", tags=["admin"])

# Pydantic models for responses
class CompanySummary(BaseModel):
    id: str
    name: str
    status: str
    created_at: str
    user_count: int
    project_count: int

class UserSummary(BaseModel):
    id: str
    email: str
    name: str
    role: str
    company_id: str
    company_name: str
    last_login_at: Optional[str]
    created_at: str

class ProjectSummary(BaseModel):
    id: str
    name: str
    status: str
    company_id: str
    company_name: str
    manager_name: Optional[str]
    task_count: int
    photo_count: int
    created_at: str

# Helper to verify root admin access
async def verify_root_admin(current_user: dict):
    """Verify the current user is root admin."""
    is_root = (
        current_user.get("id") == "0" or 
        current_user.get("email") == "chacjjlegacy@proesphera.com" or
        current_user.get("email") == "admin@proesphere.com"
    )
    
    if not is_root:
        raise HTTPException(
            status_code=403,
            detail="Root admin access required. This endpoint is restricted to platform administrators."
        )
    
    return current_user

@router.get("/companies", response_model=List[CompanySummary])
async def list_companies(
    status: Optional[str] = Query(None, description="Filter by is_active (true/false)"),
    skip: int = Query(0, ge=0, description="Number of records to skip"),
    limit: int = Query(50, ge=1, le=100, description="Maximum number of records to return"),
    pool: asyncpg.Pool = Depends(get_db_pool),
    current_user: dict = Depends(get_current_user_dependency)
):
    """
    List all companies with summary statistics (root admin only).
    Returns: Company ID, name, status, creation date, user count, and project count.
    """
    await verify_root_admin(current_user)
    
    async with pool.acquire() as conn:
        # Build query with optional status filter
        query = """
            SELECT 
                c.id,
                c.name,
                CASE WHEN c.is_active THEN 'active' ELSE 'inactive' END as status,
                c.created_at,
                COUNT(DISTINCT u.id) as user_count,
                COUNT(DISTINCT p.id) as project_count
            FROM companies c
            LEFT JOIN users u ON u.company_id = c.id
            LEFT JOIN projects p ON p.company_id = c.id
        """
        
        params = []
        if status:
            is_active = status.lower() == 'active'
            query += " WHERE c.is_active = $1"
            params.append(is_active)
        
        query += """
            GROUP BY c.id, c.name, c.is_active, c.created_at
            ORDER BY c.created_at DESC
            OFFSET ${} LIMIT ${}
        """.format(len(params) + 1, len(params) + 2)
        
        params.extend([skip, limit])
        
        rows = await conn.fetch(query, *params)
        
        return [
            {
                "id": str(row["id"]),
                "name": row["name"],
                "status": row["status"],
                "created_at": row["created_at"].isoformat() if row["created_at"] else None,
                "user_count": row["user_count"] or 0,
                "project_count": row["project_count"] or 0
            }
            for row in rows
        ]

@router.get("/users", response_model=List[UserSummary])
async def list_users(
    company_id: Optional[str] = Query(None, description="Filter by company ID"),
    role: Optional[str] = Query(None, description="Filter by role"),
    skip: int = Query(0, ge=0, description="Number of records to skip"),
    limit: int = Query(50, ge=1, le=100, description="Maximum number of records to return"),
    pool: asyncpg.Pool = Depends(get_db_pool),
    current_user: dict = Depends(get_current_user_dependency)
):
    """
    List all users across all companies (root admin only).
    Returns: User ID, email, name, role, company, and login information.
    """
    await verify_root_admin(current_user)
    
    async with pool.acquire() as conn:
        # Build query with optional filters
        query = """
            SELECT 
                u.id,
                u.email,
                u.name,
                COALESCE(u.role, 'user') as role,
                u.company_id,
                c.name as company_name,
                u.last_login_at,
                u.created_at
            FROM users u
            LEFT JOIN companies c ON u.company_id = c.id
            WHERE 1=1
        """
        
        params = []
        param_index = 1
        
        if company_id is not None:
            query += f" AND u.company_id = ${param_index}"
            params.append(company_id)
            param_index += 1
        
        if role:
            query += f" AND u.role = ${param_index}"
            params.append(role)
            param_index += 1
        
        query += f"""
            ORDER BY u.created_at DESC
            OFFSET ${param_index} LIMIT ${param_index + 1}
        """
        params.extend([skip, limit])
        
        rows = await conn.fetch(query, *params)
        
        return [
            {
                "id": row["id"],
                "email": row["email"] or "",
                "name": row["name"] or "Unknown",
                "role": row["role"],
                "company_id": row["company_id"] or "",
                "company_name": row["company_name"] or "Unknown",
                "last_login_at": row["last_login_at"].isoformat() if row["last_login_at"] else None,
                "created_at": row["created_at"].isoformat() if row["created_at"] else None
            }
            for row in rows
        ]

@router.get("/projects", response_model=List[ProjectSummary])
async def list_projects(
    company_id: Optional[str] = Query(None, description="Filter by company ID"),
    status: Optional[str] = Query(None, description="Filter by status"),
    skip: int = Query(0, ge=0, description="Number of records to skip"),
    limit: int = Query(50, ge=1, le=100, description="Maximum number of records to return"),
    pool: asyncpg.Pool = Depends(get_db_pool),
    current_user: dict = Depends(get_current_user_dependency)
):
    """
    List all projects across all companies (root admin only).
    Returns: Project ID, name, status, company, manager, task count, and photo count.
    """
    await verify_root_admin(current_user)
    
    async with pool.acquire() as conn:
        # Build query with optional filters
        query = """
            SELECT 
                p.id,
                p.name,
                COALESCE(p.status, 'active') as status,
                p.company_id,
                c.name as company_name,
                pm.name as manager_name,
                COUNT(DISTINCT t.id) as task_count,
                COUNT(DISTINCT ph.id) as photo_count,
                p.created_at
            FROM projects p
            LEFT JOIN companies c ON p.company_id = c.id
            LEFT JOIN users pm ON p.manager = pm.id
            LEFT JOIN tasks t ON t.project_id = p.id
            LEFT JOIN photos ph ON ph.project_id = p.id
            WHERE 1=1
        """
        
        params = []
        param_index = 1
        
        if company_id is not None:
            query += f" AND p.company_id = ${param_index}"
            params.append(company_id)
            param_index += 1
        
        if status:
            query += f" AND p.status = ${param_index}"
            params.append(status)
            param_index += 1
        
        query += f"""
            GROUP BY p.id, p.name, p.status, p.company_id, c.name, pm.name, p.created_at
            ORDER BY p.created_at DESC
            OFFSET ${param_index} LIMIT ${param_index + 1}
        """
        params.extend([skip, limit])
        
        rows = await conn.fetch(query, *params)
        
        return [
            {
                "id": str(row["id"]),
                "name": row["name"] or "Unnamed Project",
                "status": row["status"],
                "company_id": str(row["company_id"]) if row["company_id"] else "",
                "company_name": row["company_name"] or "Unknown",
                "manager_name": row["manager_name"],
                "task_count": row["task_count"] or 0,
                "photo_count": row["photo_count"] or 0,
                "created_at": row["created_at"].isoformat() if row["created_at"] else None
            }
            for row in rows
        ]

@router.get("/stats")
async def get_platform_stats(
    pool: asyncpg.Pool = Depends(get_db_pool),
    current_user: dict = Depends(get_current_user_dependency)
):
    """
    Get platform-wide statistics (root admin only).
    Returns: Total companies, users, projects, tasks, and photos.
    """
    await verify_root_admin(current_user)
    
    async with pool.acquire() as conn:
        stats = await conn.fetchrow("""
            SELECT 
                COUNT(DISTINCT c.id) as total_companies,
                COUNT(DISTINCT u.id) as total_users,
                COUNT(DISTINCT p.id) as total_projects,
                COUNT(DISTINCT t.id) as total_tasks,
                COUNT(DISTINCT ph.id) as total_photos
            FROM companies c
            LEFT JOIN users u ON u.company_id = c.id
            LEFT JOIN projects p ON p.company_id = c.id
            LEFT JOIN tasks t ON t.project_id = p.id
            LEFT JOIN photos ph ON ph.project_id = p.id
        """)
        
        return {
            "total_companies": stats["total_companies"] or 0,
            "total_users": stats["total_users"] or 0,
            "total_projects": stats["total_projects"] or 0,
            "total_tasks": stats["total_tasks"] or 0,
            "total_photos": stats["total_photos"] or 0
        }
