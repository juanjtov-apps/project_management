"""
RBAC API Endpoints
Provides comprehensive Role-Based Access Control endpoints for the Tower Flow application.
"""

from fastapi import APIRouter, HTTPException, Depends, Query, Request
from typing import List, Optional, Dict, Any
from datetime import datetime, timedelta
import asyncpg
from ..database.connection import get_db_pool
from ..models.rbac_models import *

router = APIRouter(prefix="/rbac", tags=["rbac"])

# Helper function to get current user from session (placeholder for now)
async def get_current_user(request: Request) -> str:
    """Get current user ID from session/auth context"""
    # TODO: Integrate with actual auth system
    return "current-user-id"

# Helper function to set company context for RLS
async def set_company_context(pool: asyncpg.Pool, company_id: int):
    """Set the company context for Row Level Security"""
    async with pool.acquire() as conn:
        await conn.execute(f"SELECT set_config('app.current_company', '{company_id}', false)")
        return conn

# COMPANY MANAGEMENT ENDPOINTS

@router.get("/companies", response_model=List[Company])
async def list_companies(
    pool: asyncpg.Pool = Depends(get_db_pool),
    current_user: str = Depends(get_current_user)
):
    """List all companies (platform admin only)"""
    async with pool.acquire() as conn:
        # Check if user is platform admin
        is_platform = await conn.fetchval("""
            SELECT EXISTS(
                SELECT 1 FROM company_users cu 
                JOIN roles r ON cu.role_id = r.id 
                WHERE cu.user_id = $1 AND cu.company_id = 0 AND cu.is_active = true
            )
        """, current_user)
        
        if not is_platform:
            raise HTTPException(status_code=403, detail="Platform admin access required")
        
        companies = await conn.fetch("SELECT * FROM companies ORDER BY name")
        return [dict(company) for company in companies]

@router.post("/companies", response_model=Company)
async def create_company(
    company_data: CompanyCreate,
    pool: asyncpg.Pool = Depends(get_db_pool),
    current_user: str = Depends(get_current_user)
):
    """Create a new company (platform admin only)"""
    async with pool.acquire() as conn:
        # Check platform admin permission
        is_platform = await conn.fetchval("""
            SELECT EXISTS(
                SELECT 1 FROM company_users cu 
                JOIN roles r ON cu.role_id = r.id 
                WHERE cu.user_id = $1 AND cu.company_id = 0 AND cu.is_active = true
            )
        """, current_user)
        
        if not is_platform:
            raise HTTPException(status_code=403, detail="Platform admin access required")
        
        try:
            company = await conn.fetchrow("""
                INSERT INTO companies (name, domain, status, settings)
                VALUES ($1, $2, $3, $4)
                RETURNING *
            """, company_data.name, company_data.domain, company_data.status, company_data.settings)
        except asyncpg.exceptions.UniqueViolationError as e:
            if "companies_domain_key" in str(e):
                raise HTTPException(status_code=400, detail=f"Company with domain '{company_data.domain}' already exists")
            else:
                raise HTTPException(status_code=400, detail="Company with this information already exists")
        
        # Log audit event
        await conn.execute("""
            INSERT INTO audit_logs (company_id, user_id, action, resource, resource_id, new_values)
            VALUES ($1, $2, $3, $4, $5, $6)
        """, company['id'], current_user, AuditAction.DATA_MODIFIED, 'company', str(company['id']), 
             dict(company_data))
        
        return dict(company)

@router.get("/companies/{company_id}", response_model=Company)
async def get_company(
    company_id: int,
    pool: asyncpg.Pool = Depends(get_db_pool),
    current_user: str = Depends(get_current_user)
):
    """Get company details"""
    async with pool.acquire() as conn:
        # Check if user has access to this company
        has_access = await conn.fetchval("""
            SELECT EXISTS(
                SELECT 1 FROM company_users 
                WHERE user_id = $1 AND company_id = $2 AND is_active = true
            )
        """, current_user, company_id)
        
        if not has_access:
            raise HTTPException(status_code=403, detail="Access denied to this company")
        
        company = await conn.fetchrow("SELECT * FROM companies WHERE id = $1", company_id)
        if not company:
            raise HTTPException(status_code=404, detail="Company not found")
        
        return dict(company)

# USER MANAGEMENT ENDPOINTS

@router.get("/companies/{company_id}/users", response_model=List[CompanyUserWithDetails])
async def list_company_users(
    company_id: int,
    pool: asyncpg.Pool = Depends(get_db_pool),
    current_user: str = Depends(get_current_user)
):
    """List all users in a company"""
    async with pool.acquire() as conn:
        # Check if user can manage users in this company
        can_manage = await conn.fetchval("""
            SELECT EXISTS(
                SELECT 1 FROM company_users cu
                JOIN roles r ON cu.role_id = r.id
                JOIN role_templates rt ON r.template_id = rt.id
                WHERE cu.user_id = $1 AND cu.company_id = $2 
                AND cu.is_active = true
                AND ($3 = ANY(rt.permission_set) OR $4 = ANY(r.custom_permissions))
            )
        """, current_user, company_id, Permissions.MANAGE_USERS, Permissions.MANAGE_USERS)
        
        if not can_manage:
            raise HTTPException(status_code=403, detail="Insufficient permissions to manage users")
        
        users = await conn.fetch("""
            SELECT 
                cu.*,
                u.id as user_id, u.email, u.first_name, u.last_name, u.profile_image_url,
                u.is_active as user_active, u.last_login_at, u.mfa_enabled,
                r.id as role_id, r.name as role_name, r.description as role_description
            FROM company_users cu
            JOIN users u ON cu.user_id = u.id
            JOIN roles r ON cu.role_id = r.id
            WHERE cu.company_id = $1 AND cu.is_active = true
            ORDER BY u.last_name, u.first_name
        """, company_id)
        
        result = []
        for user in users:
            result.append({
                "id": user["id"],
                "company_id": user["company_id"],
                "user_id": user["user_id"],
                "role_id": user["role_id"],
                "granted_by_user_id": user["granted_by_user_id"],
                "granted_at": user["granted_at"],
                "expires_at": user["expires_at"],
                "is_active": user["is_active"],
                "created_at": user["created_at"],
                "user": {
                    "id": user["user_id"],
                    "email": user["email"],
                    "first_name": user["first_name"],
                    "last_name": user["last_name"],
                    "profile_image_url": user["profile_image_url"],
                    "is_active": user["user_active"],
                    "last_login_at": user["last_login_at"],
                    "mfa_enabled": user["mfa_enabled"]
                },
                "role": {
                    "id": user["role_id"],
                    "name": user["role_name"],
                    "description": user["role_description"],
                    "company_id": company_id
                }
            })
        
        return result

@router.post("/companies/{company_id}/users", response_model=RoleAssignmentResponse)
async def assign_user_to_company(
    company_id: int,
    assignment: CompanyUserCreate,
    pool: asyncpg.Pool = Depends(get_db_pool),
    current_user: str = Depends(get_current_user)
):
    """Assign a user to a company with a specific role"""
    async with pool.acquire() as conn:
        # Verify the assignment company_id matches path parameter
        if assignment.company_id != company_id:
            raise HTTPException(status_code=400, detail="Company ID mismatch")
        
        # Check if user can manage users in this company
        can_manage = await conn.fetchval("""
            SELECT EXISTS(
                SELECT 1 FROM company_users cu
                JOIN roles r ON cu.role_id = r.id
                JOIN role_templates rt ON r.template_id = rt.id
                WHERE cu.user_id = $1 AND cu.company_id = $2 
                AND cu.is_active = true
                AND ($3 = ANY(rt.permission_set) OR $4 = ANY(r.custom_permissions))
            )
        """, current_user, company_id, Permissions.MANAGE_USERS, Permissions.MANAGE_USERS)
        
        if not can_manage:
            raise HTTPException(status_code=403, detail="Insufficient permissions to manage users")
        
        # Check if user exists
        user_exists = await conn.fetchval("SELECT EXISTS(SELECT 1 FROM users WHERE id = $1)", assignment.user_id)
        if not user_exists:
            raise HTTPException(status_code=404, detail="User not found")
        
        # Check if role exists and belongs to company
        role_exists = await conn.fetchval("""
            SELECT EXISTS(SELECT 1 FROM roles WHERE id = $1 AND company_id = $2 AND is_active = true)
        """, assignment.role_id, company_id)
        if not role_exists:
            raise HTTPException(status_code=404, detail="Role not found in this company")
        
        # Create the assignment
        try:
            assignment_id = await conn.fetchval("""
                INSERT INTO company_users (company_id, user_id, role_id, granted_by_user_id, expires_at)
                VALUES ($1, $2, $3, $4, $5)
                RETURNING id
            """, assignment.company_id, assignment.user_id, assignment.role_id, 
                 current_user, assignment.expires_at)
            
            # Log audit event
            await conn.execute("""
                INSERT INTO audit_logs (company_id, user_id, action, resource, resource_id, new_values)
                VALUES ($1, $2, $3, $4, $5, $6)
            """, company_id, current_user, AuditAction.ROLE_ASSIGNED, 'user', assignment.user_id,
                 {"role_id": assignment.role_id, "company_id": company_id})
            
            return {"success": True, "message": "User assigned successfully", "assignment_id": assignment_id}
            
        except asyncpg.UniqueViolationError:
            raise HTTPException(status_code=400, detail="User already has this role in the company")

# ROLE MANAGEMENT ENDPOINTS

@router.get("/companies/{company_id}/roles", response_model=List[Role])
async def list_company_roles(
    company_id: int,
    pool: asyncpg.Pool = Depends(get_db_pool),
    current_user: str = Depends(get_current_user)
):
    """List all roles in a company"""
    async with pool.acquire() as conn:
        # Check access to company
        has_access = await conn.fetchval("""
            SELECT EXISTS(
                SELECT 1 FROM company_users 
                WHERE user_id = $1 AND company_id = $2 AND is_active = true
            )
        """, current_user, company_id)
        
        if not has_access:
            raise HTTPException(status_code=403, detail="Access denied to this company")
        
        roles = await conn.fetch("""
            SELECT * FROM roles 
            WHERE company_id = $1 AND is_active = true 
            ORDER BY name
        """, company_id)
        
        return [dict(role) for role in roles]

@router.post("/companies/{company_id}/roles", response_model=Role)
async def create_company_role(
    company_id: int,
    role_data: RoleCreate,
    pool: asyncpg.Pool = Depends(get_db_pool),
    current_user: str = Depends(get_current_user)
):
    """Create a new role in a company"""
    async with pool.acquire() as conn:
        # Verify the role company_id matches path parameter
        if role_data.company_id != company_id:
            raise HTTPException(status_code=400, detail="Company ID mismatch")
        
        # Check if user can manage roles
        can_manage = await conn.fetchval("""
            SELECT EXISTS(
                SELECT 1 FROM company_users cu
                JOIN roles r ON cu.role_id = r.id
                JOIN role_templates rt ON r.template_id = rt.id
                WHERE cu.user_id = $1 AND cu.company_id = $2 
                AND cu.is_active = true
                AND ($3 = ANY(rt.permission_set) OR $4 = ANY(r.custom_permissions))
            )
        """, current_user, company_id, Permissions.CLONE_ROLES, Permissions.CLONE_ROLES)
        
        if not can_manage:
            raise HTTPException(status_code=403, detail="Insufficient permissions to manage roles")
        
        # Create the role
        role = await conn.fetchrow("""
            INSERT INTO roles (company_id, name, description, template_id, custom_permissions, is_template)
            VALUES ($1, $2, $3, $4, $5, $6)
            RETURNING *
        """, role_data.company_id, role_data.name, role_data.description, 
             role_data.template_id, role_data.custom_permissions, role_data.is_template)
        
        # Log audit event
        await conn.execute("""
            INSERT INTO audit_logs (company_id, user_id, action, resource, resource_id, new_values)
            VALUES ($1, $2, $3, $4, $5, $6)
        """, company_id, current_user, AuditAction.ROLE_CREATED, 'role', str(role['id']), dict(role_data))
        
        return dict(role)

# PERMISSION CHECKING ENDPOINTS

@router.get("/users/{user_id}/permissions", response_model=EffectivePermissions)
async def get_user_permissions(
    user_id: str,
    company_id: int = Query(..., description="Company ID for permission context"),
    pool: asyncpg.Pool = Depends(get_db_pool),
    current_user: str = Depends(get_current_user)
):
    """Get effective permissions for a user in a company"""
    async with pool.acquire() as conn:
        # Check if current user can view this information
        can_view = (current_user == user_id) or await conn.fetchval("""
            SELECT EXISTS(
                SELECT 1 FROM company_users cu
                JOIN roles r ON cu.role_id = r.id
                JOIN role_templates rt ON r.template_id = rt.id
                WHERE cu.user_id = $1 AND cu.company_id = $2 
                AND cu.is_active = true
                AND ($3 = ANY(rt.permission_set) OR $4 = ANY(r.custom_permissions))
            )
        """, current_user, company_id, Permissions.MANAGE_USERS, Permissions.MANAGE_USERS)
        
        if not can_view:
            raise HTTPException(status_code=403, detail="Insufficient permissions")
        
        # Get cached permissions first
        cached = await conn.fetchrow("""
            SELECT permissions, role_ids, computed_at, expires_at
            FROM user_effective_permissions
            WHERE user_id = $1 AND company_id = $2 AND expires_at > NOW()
        """, user_id, company_id)
        
        if cached:
            # Get role details
            roles = await conn.fetch("""
                SELECT id, name, company_id FROM roles 
                WHERE id = ANY($1) AND is_active = true
            """, cached['role_ids'])
            
            return {
                "user_id": user_id,
                "company_id": company_id,
                "permissions": cached['permissions'],
                "roles": [{"id": r["id"], "name": r["name"], "company_id": r["company_id"], "scope": "company"} for r in roles],
                "computed_at": cached['computed_at'],
                "expires_at": cached['expires_at']
            }
        
        # Compute permissions if not cached
        permissions = await compute_user_permissions(conn, user_id, company_id)
        return permissions

@router.post("/users/{user_id}/check-permission", response_model=PermissionCheckResponse)
async def check_user_permission(
    user_id: str,
    permission_ids: List[int],
    company_id: int = Query(..., description="Company ID for permission context"),
    require_all: bool = Query(True, description="Require all permissions (AND) vs any (OR)"),
    pool: asyncpg.Pool = Depends(get_db_pool),
    current_user: str = Depends(get_current_user)
):
    """Check if a user has specific permissions"""
    async with pool.acquire() as conn:
        # Get user's effective permissions
        permissions = await get_user_effective_permissions(conn, user_id, company_id)
        
        if require_all:
            has_permission = all(pid in permissions for pid in permission_ids)
        else:
            has_permission = any(pid in permissions for pid in permission_ids)
        
        return {
            "has_permission": has_permission,
            "user_permissions": permissions,
            "required_permissions": permission_ids
        }

# ROLE TEMPLATES ENDPOINTS

@router.get("/role-templates", response_model=List[RoleTemplate])
async def list_role_templates(
    category: Optional[PermissionCategory] = Query(None, description="Filter by category"),
    pool: asyncpg.Pool = Depends(get_db_pool)
):
    """List available role templates"""
    async with pool.acquire() as conn:
        if category:
            templates = await conn.fetch("""
                SELECT * FROM role_templates 
                WHERE category = $1 
                ORDER BY name
            """, category)
        else:
            templates = await conn.fetch("SELECT * FROM role_templates ORDER BY category, name")
        
        return [dict(template) for template in templates]

@router.get("/permissions", response_model=List[Permission])
async def list_permissions(
    category: Optional[PermissionCategory] = Query(None, description="Filter by category"),
    pool: asyncpg.Pool = Depends(get_db_pool)
):
    """List all available permissions"""
    async with pool.acquire() as conn:
        if category:
            permissions = await conn.fetch("""
                SELECT * FROM permissions 
                WHERE category = $1 
                ORDER BY id
            """, category)
        else:
            permissions = await conn.fetch("SELECT * FROM permissions ORDER BY category, id")
        
        return [dict(permission) for permission in permissions]

# AUDIT LOG ENDPOINTS

@router.get("/companies/{company_id}/audit-logs", response_model=List[AuditLog])
async def get_audit_logs(
    company_id: int,
    user_id: Optional[str] = Query(None, description="Filter by user ID"),
    action: Optional[AuditAction] = Query(None, description="Filter by action"),
    start_date: Optional[datetime] = Query(None, description="Start date filter"),
    end_date: Optional[datetime] = Query(None, description="End date filter"),
    limit: int = Query(100, description="Maximum number of records"),
    pool: asyncpg.Pool = Depends(get_db_pool),
    current_user: str = Depends(get_current_user)
):
    """Get audit logs for a company"""
    async with pool.acquire() as conn:
        # Check if user can view audit logs
        can_view = await conn.fetchval("""
            SELECT EXISTS(
                SELECT 1 FROM company_users cu
                JOIN roles r ON cu.role_id = r.id
                JOIN role_templates rt ON r.template_id = rt.id
                WHERE cu.user_id = $1 AND cu.company_id = $2 
                AND cu.is_active = true
                AND ($3 = ANY(rt.permission_set) OR $4 = ANY(r.custom_permissions))
            )
        """, current_user, company_id, Permissions.MANAGE_USERS, Permissions.MANAGE_USERS)
        
        if not can_view:
            raise HTTPException(status_code=403, detail="Insufficient permissions to view audit logs")
        
        # Build query conditions
        conditions = ["company_id = $1"]
        params = [company_id]
        param_count = 1
        
        if user_id:
            param_count += 1
            conditions.append(f"user_id = ${param_count}")
            params.append(user_id)
        
        if action:
            param_count += 1
            conditions.append(f"action = ${param_count}")
            params.append(action)
        
        if start_date:
            param_count += 1
            conditions.append(f"created_at >= ${param_count}")
            params.append(start_date)
        
        if end_date:
            param_count += 1
            conditions.append(f"created_at <= ${param_count}")
            params.append(end_date)
        
        query = f"""
            SELECT * FROM audit_logs 
            WHERE {' AND '.join(conditions)}
            ORDER BY created_at DESC 
            LIMIT {limit}
        """
        
        logs = await conn.fetch(query, *params)
        return [dict(log) for log in logs]

# HELPER FUNCTIONS

async def get_user_effective_permissions(conn: asyncpg.Connection, user_id: str, company_id: int) -> List[int]:
    """Get user's effective permissions, computing if not cached"""
    # Check cache first
    cached = await conn.fetchval("""
        SELECT permissions FROM user_effective_permissions
        WHERE user_id = $1 AND company_id = $2 AND expires_at > NOW()
    """, user_id, company_id)
    
    if cached:
        return cached
    
    # Compute permissions
    permissions = await compute_user_permissions(conn, user_id, company_id)
    return permissions.permissions

async def compute_user_permissions(conn: asyncpg.Connection, user_id: str, company_id: int) -> EffectivePermissions:
    """Compute effective permissions for a user"""
    # Get user's company roles
    user_roles = await conn.fetch("""
        SELECT cu.role_id, r.name, r.custom_permissions, rt.permission_set
        FROM company_users cu
        JOIN roles r ON cu.role_id = r.id
        LEFT JOIN role_templates rt ON r.template_id = rt.id
        WHERE cu.user_id = $1 AND cu.company_id = $2 
        AND cu.is_active = true
        AND (cu.expires_at IS NULL OR cu.expires_at > NOW())
    """, user_id, company_id)
    
    permission_set = set()
    roles = []
    
    for role in user_roles:
        roles.append({
            "id": role["role_id"],
            "name": role["name"],
            "company_id": company_id,
            "scope": "company"
        })
        
        # Add template permissions
        if role["permission_set"]:
            permission_set.update(role["permission_set"])
        
        # Add custom permissions
        if role["custom_permissions"]:
            permission_set.update(role["custom_permissions"])
    
    # Get project-specific permissions
    project_perms = await conn.fetch("""
        SELECT permissions FROM project_assignments
        WHERE user_id = $1 AND company_id = $2 AND is_active = true
        AND (expires_at IS NULL OR expires_at > NOW())
    """, user_id, company_id)
    
    for proj in project_perms:
        if proj["permissions"]:
            permission_set.update(proj["permissions"])
    
    permissions = list(permission_set)
    expires_at = datetime.utcnow() + timedelta(hours=1)
    computed_at = datetime.utcnow()
    
    # Cache the result
    await conn.execute("""
        INSERT INTO user_effective_permissions (company_id, user_id, permissions, role_ids, computed_at, expires_at)
        VALUES ($1, $2, $3, $4, $5, $6)
        ON CONFLICT (company_id, user_id) 
        DO UPDATE SET 
            permissions = EXCLUDED.permissions,
            role_ids = EXCLUDED.role_ids,
            computed_at = EXCLUDED.computed_at,
            expires_at = EXCLUDED.expires_at,
            updated_at = NOW()
    """, company_id, user_id, permissions, [r["id"] for r in roles], computed_at, expires_at)
    
    return EffectivePermissions(
        user_id=user_id,
        company_id=company_id,
        permissions=permissions,
        roles=roles,
        computed_at=computed_at,
        expires_at=expires_at
    )