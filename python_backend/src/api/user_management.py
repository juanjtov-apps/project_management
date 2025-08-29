"""
User management API endpoints with RBAC and company filtering.
Replaces Node.js backend user management functionality.
"""

from fastapi import APIRouter, HTTPException, status, Depends, Request
from typing import List, Optional, Dict, Any
from pydantic import BaseModel, EmailStr
from ..database.auth_repositories import auth_repo, company_repo, role_repo
from .auth import get_current_user_dependency, is_user_admin, is_root_admin

router = APIRouter()

class UserCreateRequest(BaseModel):
    first_name: str
    last_name: str
    email: EmailStr
    password: str
    role: str = "user"
    company_id: str
    is_active: bool = True

class UserUpdateRequest(BaseModel):
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    email: Optional[EmailStr] = None
    password: Optional[str] = None
    role: Optional[str] = None
    is_active: Optional[bool] = None

class CompanyCreateRequest(BaseModel):
    name: str
    domain: Optional[str] = None
    industry: Optional[str] = None
    address: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[EmailStr] = None

class CompanyUpdateRequest(BaseModel):
    name: Optional[str] = None
    domain: Optional[str] = None
    industry: Optional[str] = None
    address: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[EmailStr] = None

class RoleCreateRequest(BaseModel):
    name: str
    description: Optional[str] = None
    permissions: List[str] = []
    company_id: Optional[str] = None

class RoleUpdateRequest(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    permissions: Optional[List[str]] = None

# User Management Endpoints

@router.get("/managers")
async def get_managers(current_user: Dict[str, Any] = Depends(get_current_user_dependency)):
    """Get users/managers for task assignment with company filtering."""
    try:
        print(f"Fetching managers for task assignment - user: {current_user.get('email')}")
        
        # Get all users
        users = await auth_repo.get_users()
        
        # Filter by current user's company unless root admin
        if not is_root_admin(current_user):
            user_company_id = current_user.get('companyId')
            if user_company_id:
                users = [user for user in users if user.get('companyId') == user_company_id]
        
        print(f"Retrieved {len(users)} managers for task assignment")
        return users
        
    except Exception as e:
        print(f"Error fetching managers: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to fetch managers"
        )

# RBAC Endpoints

@router.get("/rbac/companies")
async def get_companies(current_user: Dict[str, Any] = Depends(get_current_user_dependency)):
    """Get companies with proper authorization."""
    try:
        print(f"Fetching companies - user: {current_user.get('email')}, is_root: {is_root_admin(current_user)}")
        
        if is_root_admin(current_user):
            # Root admin sees all companies
            companies = await company_repo.get_companies()
            print(f"Root admin retrieved {len(companies)} companies")
            return companies
        elif is_user_admin(current_user):
            # Company admin sees only their company
            user_company_id = current_user.get('companyId')
            if user_company_id:
                company = await company_repo.get_company(user_company_id)
                companies = [company] if company else []
                print(f"Company admin retrieved {len(companies)} companies (filtered)")
                return companies
        
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Insufficient permissions"
        )
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error fetching companies: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to fetch companies"
        )

@router.post("/rbac/companies", status_code=status.HTTP_201_CREATED)
async def create_company(
    company_data: CompanyCreateRequest,
    current_user: Dict[str, Any] = Depends(get_current_user_dependency)
):
    """Create a new company (admin only)."""
    try:
        if not is_user_admin(current_user):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Admin privileges required"
            )
        
        print(f"Creating company - user: {current_user.get('email')}")
        company = await company_repo.create_company(company_data.dict())
        print(f"Company created: {company}")
        return company
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error creating company: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create company"
        )

@router.patch("/rbac/companies/{company_id}")
async def update_company(
    company_id: str,
    company_data: CompanyUpdateRequest,
    current_user: Dict[str, Any] = Depends(get_current_user_dependency)
):
    """Update a company."""
    try:
        if not is_user_admin(current_user):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Admin privileges required"
            )
        
        # Company admin can only update their own company
        if not is_root_admin(current_user):
            user_company_id = current_user.get('companyId')
            if user_company_id != company_id:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Can only update own company"
                )
        
        company = await company_repo.update_company(company_id, company_data.dict(exclude_unset=True))
        if not company:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Company not found"
            )
        return company
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error updating company: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update company"
        )

@router.delete("/rbac/companies/{company_id}")
async def delete_company(
    company_id: str,
    current_user: Dict[str, Any] = Depends(get_current_user_dependency)
):
    """Delete a company (root admin only)."""
    try:
        if not is_root_admin(current_user):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Root admin privileges required"
            )
        
        success = await company_repo.delete_company(company_id)
        if not success:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Company not found"
            )
        return {"message": "Company deleted successfully"}
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error deleting company: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to delete company"
        )

@router.get("/rbac/companies/{company_id}/users")
async def get_company_users(
    company_id: str,
    current_user: Dict[str, Any] = Depends(get_current_user_dependency)
):
    """Get users for a specific company."""
    try:
        # Check access to this company
        if not is_root_admin(current_user):
            user_company_id = current_user.get('companyId')
            if user_company_id != company_id:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Access denied to this company"
                )
        
        users = await auth_repo.get_company_users(company_id)
        print(f"Retrieved {len(users)} users for company {company_id}")
        return users
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error fetching company users: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to fetch company users"
        )

@router.get("/rbac/users")
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
            user_company_id = current_user.get('companyId')
            if user_company_id:
                users = await auth_repo.get_company_users(user_company_id)
                print(f"Company admin retrieved {len(users)} users for company {user_company_id}")
                return users
        
        return []
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error fetching users: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to fetch users"
        )

@router.post("/rbac/users", status_code=status.HTTP_201_CREATED)
async def create_user(
    user_data: UserCreateRequest,
    current_user: Dict[str, Any] = Depends(get_current_user_dependency)
):
    """Create a new user with company restrictions."""
    try:
        if not is_user_admin(current_user):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Admin privileges required"
            )
        
        # Company admin can only create users in their own company
        if not is_root_admin(current_user):
            user_company_id = current_user.get('companyId')
            if user_data.company_id != user_company_id:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Company admins can only create users within their own company"
                )
        
        user = await auth_repo.create_rbac_user(user_data.dict())
        print(f"User created with company restrictions enforced: {user}")
        return user
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error creating user: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create user"
        )

@router.patch("/rbac/users/{user_id}")
async def update_user(
    user_id: str,
    user_data: UserUpdateRequest,
    current_user: Dict[str, Any] = Depends(get_current_user_dependency)
):
    """Update a user."""
    try:
        if not is_user_admin(current_user):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Admin privileges required"
            )
        
        user = await auth_repo.update_user(user_id, user_data.dict(exclude_unset=True))
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found"
            )
        return user
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error updating user: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update user"
        )

@router.delete("/rbac/users/{user_id}")
async def delete_user(
    user_id: str,
    current_user: Dict[str, Any] = Depends(get_current_user_dependency)
):
    """Delete a user with authorization checks."""
    try:
        if not is_user_admin(current_user):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Admin privileges required"
            )
        
        # Get the user to be deleted to check company restrictions
        user_to_delete = await auth_repo.get_user(user_id)
        if not user_to_delete:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found"
            )
        
        # Company admin can only delete users in their own company
        if not is_root_admin(current_user):
            user_company_id = current_user.get('companyId')
            target_user_company_id = user_to_delete.get('companyId')
            
            if target_user_company_id != user_company_id:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Company admins can only delete users within their own company"
                )
        
        success = await auth_repo.delete_user(user_id)
        if not success:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found"
            )
        
        admin_type = "root admin" if is_root_admin(current_user) else "company admin"
        print(f"User deleted by {current_user.get('email')} ({admin_type})")
        return {"message": "User deleted successfully"}
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error deleting user: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to delete user"
        )

# Role Management Endpoints

@router.get("/rbac/roles")
async def get_roles(current_user: Dict[str, Any] = Depends(get_current_user_dependency)):
    """Get all roles."""
    try:
        roles = await role_repo.get_roles()
        print(f"Retrieved {len(roles)} roles")
        return roles
        
    except Exception as e:
        print(f"Error fetching roles: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to fetch roles"
        )

@router.post("/rbac/roles", status_code=status.HTTP_201_CREATED)
async def create_role(
    role_data: RoleCreateRequest,
    current_user: Dict[str, Any] = Depends(get_current_user_dependency)
):
    """Create a new role."""
    try:
        if not is_user_admin(current_user):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Admin privileges required"
            )
        
        role = await role_repo.create_role(role_data.dict())
        print(f"Role created: {role}")
        return role
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error creating role: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create role"
        )

@router.patch("/rbac/roles/{role_id}")
async def update_role(
    role_id: str,
    role_data: RoleUpdateRequest,
    current_user: Dict[str, Any] = Depends(get_current_user_dependency)
):
    """Update a role."""
    try:
        if not is_user_admin(current_user):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Admin privileges required"
            )
        
        role = await role_repo.update_role(role_id, role_data.dict(exclude_unset=True))
        if not role:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Role not found"
            )
        return role
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error updating role: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update role"
        )

@router.delete("/rbac/roles/{role_id}")
async def delete_role(
    role_id: str,
    current_user: Dict[str, Any] = Depends(get_current_user_dependency)
):
    """Delete a role."""
    try:
        if not is_user_admin(current_user):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Admin privileges required"
            )
        
        success = await role_repo.delete_role(role_id)
        if not success:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Role not found"
            )
        return {"message": "Role deleted successfully"}
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error deleting role: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to delete role"
        )

@router.get("/rbac/permissions")
async def get_permissions(current_user: Dict[str, Any] = Depends(get_current_user_dependency)):
    """Get all available permissions."""
    try:
        permissions = await role_repo.get_permissions()
        print(f"Retrieved {len(permissions)} permissions")
        return permissions
        
    except Exception as e:
        print(f"Error fetching permissions: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to fetch permissions"
        )

# Legacy endpoints for backward compatibility

@router.get("/companies")
async def get_companies_legacy(current_user: Dict[str, Any] = Depends(get_current_user_dependency)):
    """Legacy companies endpoint."""
    return await get_companies(current_user)

@router.post("/companies", status_code=status.HTTP_201_CREATED)
async def create_company_legacy(
    company_data: CompanyCreateRequest,
    current_user: Dict[str, Any] = Depends(get_current_user_dependency)
):
    """Legacy create company endpoint."""
    return await create_company(company_data, current_user)

@router.patch("/companies/{company_id}")
async def update_company_legacy(
    company_id: str,
    company_data: CompanyUpdateRequest,
    current_user: Dict[str, Any] = Depends(get_current_user_dependency)
):
    """Legacy update company endpoint."""
    return await update_company(company_id, company_data, current_user)

@router.delete("/companies/{company_id}")
async def delete_company_legacy(
    company_id: str,
    current_user: Dict[str, Any] = Depends(get_current_user_dependency)
):
    """Legacy delete company endpoint."""
    return await delete_company(company_id, current_user)