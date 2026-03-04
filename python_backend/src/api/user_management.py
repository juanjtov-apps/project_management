"""
User management API endpoints with RBAC and company filtering.
Replaces Node.js backend user management functionality.
"""

from fastapi import APIRouter, HTTPException, status, Depends, Request
from typing import List, Optional, Dict, Any
from pydantic import BaseModel, EmailStr, field_validator, ConfigDict
from ..database.auth_repositories import auth_repo, company_repo, role_repo
from .auth import get_current_user_dependency, is_user_admin, is_root_admin
from ..validators import (
    validate_name,
    validate_password_strength,
    validate_email_format,
    validate_company_name,
    validate_phone,
    sanitize_string,
)
import logging

logger = logging.getLogger(__name__)
router = APIRouter()

class UserCreateRequest(BaseModel):
    first_name: str
    last_name: str
    email: EmailStr
    password: Optional[str] = None  # Optional for client role (magic link auth)
    role_id: int  # Changed from role: str - must be a valid role ID
    company_id: Optional[str] = None  # Required for non-root users, validated in endpoint
    is_active: bool = True
    assigned_project_id: Optional[str] = None  # For client role users only
    welcome_note: Optional[str] = None  # For client invite email

    @field_validator('first_name', 'last_name')
    @classmethod
    def validate_names(cls, v):
        """Validate name fields"""
        if v is None:
            return v
        return validate_name(v, "name")

    @field_validator('email')
    @classmethod
    def validate_email(cls, v):
        """Validate email format"""
        return validate_email_format(v)

    @field_validator('password')
    @classmethod
    def validate_password(cls, v):
        """Validate password strength — skip for None (client role)"""
        if v is None:
            return v
        return validate_password_strength(v)

class UserUpdateRequest(BaseModel):
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    email: Optional[EmailStr] = None
    password: Optional[str] = None
    role: Optional[str] = None
    role_id: Optional[int] = None  # Add this
    company_id: Optional[str] = None  # Add this
    is_active: Optional[bool] = None
    assigned_project_id: Optional[str] = None  # For client role users only

    model_config = ConfigDict(extra="forbid")  # Explicitly forbid extra fields like "name"
    
    @field_validator('first_name', 'last_name')
    @classmethod
    def validate_names(cls, v):
        """Validate name fields"""
        if v is None:
            return v
        return validate_name(v, "name")
    
    @field_validator('email')
    @classmethod
    def validate_email(cls, v):
        """Validate email format"""
        if v is None:
            return v
        return validate_email_format(v)
    
    @field_validator('password')
    @classmethod
    def validate_password(cls, v):
        """Validate password strength when updating"""
        if v is None:
            return v
        return validate_password_strength(v)

class CompanyCreateRequest(BaseModel):
    name: str
    domain: Optional[str] = None
    industry: Optional[str] = None
    address: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[EmailStr] = None
    
    @field_validator('name')
    @classmethod
    def validate_name(cls, v):
        """Validate company name"""
        return validate_company_name(v)
    
    @field_validator('phone')
    @classmethod
    def validate_phone_field(cls, v):
        """Validate phone number"""
        if v is None:
            return v
        return validate_phone(v)
    
    @field_validator('email')
    @classmethod
    def validate_email(cls, v):
        """Validate email format"""
        if v is None:
            return v
        return validate_email_format(v)
    
    @field_validator('domain', 'industry', 'address')
    @classmethod
    def validate_text_fields(cls, v):
        """Validate text fields"""
        if v is None:
            return v
        v = sanitize_string(v)
        if len(v) > 500:
            raise ValueError("Field must be 500 characters or less")
        return v.strip()

class CompanyUpdateRequest(BaseModel):
    name: Optional[str] = None
    domain: Optional[str] = None
    industry: Optional[str] = None
    address: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[EmailStr] = None
    
    @field_validator('name')
    @classmethod
    def validate_name(cls, v):
        """Validate company name"""
        if v is None:
            return v
        return validate_company_name(v)
    
    @field_validator('phone')
    @classmethod
    def validate_phone_field(cls, v):
        """Validate phone number"""
        if v is None:
            return v
        return validate_phone(v)
    
    @field_validator('email')
    @classmethod
    def validate_email(cls, v):
        """Validate email format"""
        if v is None:
            return v
        return validate_email_format(v)
    
    @field_validator('domain', 'industry', 'address')
    @classmethod
    def validate_text_fields(cls, v):
        """Validate text fields"""
        if v is None:
            return v
        v = sanitize_string(v)
        if len(v) > 500:
            raise ValueError("Field must be 500 characters or less")
        return v.strip()

class RoleCreateRequest(BaseModel):
    name: str
    description: Optional[str] = None
    permissions: List[str] = []
    company_id: Optional[str] = None
    
    @field_validator('name')
    @classmethod
    def validate_role_name(cls, v):
        """Validate role name"""
        v = sanitize_string(v)
        if len(v) < 1 or len(v) > 100:
            raise ValueError("Role name must be between 1 and 100 characters")
        return v.strip()
    
    @field_validator('description')
    @classmethod
    def validate_description(cls, v):
        """Validate role description"""
        if v is None:
            return v
        v = sanitize_string(v)
        if len(v) > 500:
            raise ValueError("Description must be 500 characters or less")
        return v.strip()

class RoleUpdateRequest(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    permissions: Optional[List[str]] = None
    
    @field_validator('name')
    @classmethod
    def validate_role_name(cls, v):
        """Validate role name"""
        if v is None:
            return v
        v = sanitize_string(v)
        if len(v) < 1 or len(v) > 100:
            raise ValueError("Role name must be between 1 and 100 characters")
        return v.strip()
    
    @field_validator('description')
    @classmethod
    def validate_description(cls, v):
        """Validate role description"""
        if v is None:
            return v
        v = sanitize_string(v)
        if len(v) > 500:
            raise ValueError("Description must be 500 characters or less")
        return v.strip()

# User Management Endpoints

@router.get("/managers")
async def get_managers(current_user: Dict[str, Any] = Depends(get_current_user_dependency)):
    """Get users/managers for task assignment with company filtering."""
    try:
        logger.debug(f"Fetching managers for task assignment - user: {current_user.get('email')}")
        
        # Get all users
        users = await auth_repo.get_users()
        
        # Filter by current user's company unless root admin
        if not is_root_admin(current_user):
            user_company_id = current_user.get('companyId')
            if user_company_id:
                users = [user for user in users if user.get('companyId') == user_company_id]
        
        logger.debug(f"Retrieved {len(users)} managers for task assignment")
        return users
    
    except Exception as e:
        logger.error(f"Error fetching managers: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to fetch managers"
        )

# RBAC Endpoints

@router.get("/rbac/companies")
async def get_companies(current_user: Dict[str, Any] = Depends(get_current_user_dependency)):
    """Get companies with proper authorization."""
    try:
        logger.debug(f"Fetching companies - user: {current_user.get('email')}, is_root: {is_root_admin(current_user)}")
        
        if is_root_admin(current_user):
            # Root admin sees all companies
            companies = await company_repo.get_companies()
            logger.debug(f"Root admin retrieved {len(companies)} companies")
            return companies
        elif is_user_admin(current_user):
            # Company admin sees only their company
            user_company_id = current_user.get('companyId')
            if user_company_id:
                company = await company_repo.get_company(user_company_id)
                companies = [company] if company else []
                logger.debug(f"Company admin retrieved {len(companies)} companies (filtered)")
                return companies
        
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Insufficient permissions"
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching companies: {e}", exc_info=True)
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
        
        logger.info(f"Creating company - user: {current_user.get('email')}")
        company = await company_repo.create_company(company_data.model_dump())
        logger.info(f"Company created successfully")
        return company
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error creating company: {e}", exc_info=True)
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
        
        company = await company_repo.update_company(company_id, company_data.model_dump(exclude_unset=True))
        if not company:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Company not found"
            )
        return company
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating company: {e}", exc_info=True)
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
        logger.error(f"Error deleting company: {e}", exc_info=True)
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
        logger.debug(f"Retrieved {len(users)} users for company {company_id}")
        return users
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching company users: {e}", exc_info=True)
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
            logger.debug(f"Root admin retrieved {len(users)} users")
            return users
        else:
            # Company admin sees only their company users
            # Handle both camelCase and snake_case
            user_company_id = current_user.get('companyId') or current_user.get('company_id')
            if user_company_id:
                # Ensure it's a string
                user_company_id = str(user_company_id)
                logger.debug(f"Company admin fetching users for company_id: {user_company_id}")
                users = await auth_repo.get_company_users(user_company_id)
                logger.debug(f"Company admin retrieved {len(users)} users for company {user_company_id}")
                if len(users) == 0:
                    logger.warning(f"No users found for company_id {user_company_id}")
                return users
        
        logger.warning(f"No company_id found for user {current_user.get('email')}")
        return []
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching users: {e}", exc_info=True)
        import traceback
        traceback.print_exc()
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
        logger.info(f"[Create User] Received data: {user_data.model_dump()}")
        logger.info(f"[Create User] Current user: {current_user.get('email')}")

        if not is_user_admin(current_user):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Admin privileges required"
            )

        # company_id is required for user creation (root users cannot be created via API)
        if not user_data.company_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="company_id is required for user creation"
            )

        # Company admin can only create users in their own company
        if not is_root_admin(current_user):
            user_company_id = str(current_user.get('companyId') or current_user.get('company_id') or '')
            logger.info(f"[Create User] Company check: user_data.company_id={user_data.company_id}, user_company_id={user_company_id}")
            if str(user_data.company_id) != user_company_id:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Company admins can only create users within their own company"
                )

        user = await auth_repo.create_rbac_user(user_data.model_dump())
        logger.info(f"User created with company restrictions enforced")

        # For client role (4): trigger onboarding invite (magic link + email)
        email_sent = False
        if user_data.role_id == 4:
            try:
                from ..database.connection import get_db_pool
                from ..services.magic_link_service import MagicLinkService
                from ..services.email_service import EmailService
                from ..core.config import settings
                import uuid as uuid_mod

                pool = await get_db_pool()
                magic_link_svc = MagicLinkService(pool)
                email_svc = EmailService()

                created_user_id = user.get("id") or user.get("userId")

                async with pool.acquire() as conn:
                    # Create invitation record
                    caller_id = str(current_user.get("id") or current_user.get("userId") or "")
                    await conn.execute(
                        """
                        INSERT INTO client_portal.client_invitations
                        (id, user_id, project_id, company_id, invited_by, welcome_note, status)
                        VALUES ($1, $2, $3, $4, $5, $6, 'pending')
                        """,
                        str(uuid_mod.uuid4()),
                        str(created_user_id),
                        user_data.assigned_project_id or "",
                        str(user_data.company_id),
                        caller_id,
                        user_data.welcome_note,
                    )

                    # Invalidate any previous tokens and generate new one
                    await magic_link_svc.invalidate_user_tokens(str(created_user_id), purpose="invite")
                    raw_token = await magic_link_svc.create_magic_link(str(created_user_id), purpose="invite")
                    magic_link_url = f"{settings.magic_link_base_url}/auth/magic-link?token={raw_token}"

                    # Fetch company branding
                    company_row = await conn.fetchrow(
                        "SELECT name, COALESCE(logo_url, logo) as logo_url, brand_color, sender_name FROM companies WHERE id = $1",
                        str(user_data.company_id),
                    )
                    company_name = company_row["name"] if company_row else "Your Contractor"
                    company_logo_path = company_row["logo_url"] if company_row else None
                    brand_color = (company_row["brand_color"] if company_row else None) or "#2563eb"
                    sender_name = company_row["sender_name"] if company_row else None

                    # Fetch project name
                    project_name = "Your Project"
                    if user_data.assigned_project_id:
                        project_row = await conn.fetchrow(
                            "SELECT name FROM projects WHERE id = $1", user_data.assigned_project_id
                        )
                        project_name = project_row["name"] if project_row else "Your Project"

                # Get caller's name
                caller_name = f"{current_user.get('first_name', '')} {current_user.get('last_name', '')}".strip()
                if not caller_name:
                    caller_name = current_user.get("name", "Your Project Manager")

                # Resolve GCS object path to a signed URL for the email
                from .onboarding import _resolve_logo_url
                company_logo_url = await _resolve_logo_url(company_logo_path)

                # Send invitation email
                email_sent = await email_svc.send_client_invite_email(
                    to_email=user_data.email,
                    client_first_name=user_data.first_name,
                    company_name=company_name,
                    company_logo_url=company_logo_url,
                    brand_color=brand_color,
                    pm_name=caller_name,
                    project_name=project_name,
                    magic_link_url=magic_link_url,
                    welcome_note=user_data.welcome_note,
                    sender_name=sender_name,
                )

                if email_sent:
                    from datetime import datetime, timezone
                    async with pool.acquire() as conn:
                        await conn.execute(
                            """
                            UPDATE client_portal.client_invitations
                            SET email_sent_at = $1
                            WHERE id = (
                                SELECT id FROM client_portal.client_invitations
                                WHERE user_id = $2 AND status = 'pending'
                                ORDER BY created_at DESC LIMIT 1
                            )
                            """,
                            datetime.now(timezone.utc),
                            str(created_user_id),
                        )

                logger.info(f"Client onboarding invite sent: email={email_sent}")
            except Exception as invite_err:
                logger.error(f"Failed to send client invite (user was still created): {invite_err}", exc_info=True)

        # Include invite status in response for client role
        if user_data.role_id == 4:
            user["emailSent"] = email_sent

        return user
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error creating user: {e}", exc_info=True)
        import traceback
        traceback.print_exc()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create user: {str(e)}"
        )

@router.patch("/rbac/users/{user_id}")
async def update_user(
    user_id: str,
    user_data: UserUpdateRequest,
    current_user: Dict[str, Any] = Depends(get_current_user_dependency)
):
    """Update a user with company restrictions."""
    try:
        if not is_user_admin(current_user):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Admin privileges required"
            )
        
        # Get the user to be updated to check company restrictions
        user_to_update = await auth_repo.get_user(user_id)
        if not user_to_update:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found"
            )
        
        # Company admin can only update users in their own company
        if not is_root_admin(current_user):
            user_company_id = current_user.get('companyId') or current_user.get('company_id')
            target_user_company_id = user_to_update.get('companyId') or user_to_update.get('company_id')
            
            if target_user_company_id != user_company_id:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Company admins can only update users within their own company"
                )
        
        # Prevent updating root admin
        if is_root_admin(user_to_update):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Cannot update root administrator"
            )
        
        user = await auth_repo.update_user(user_id, user_data.model_dump(exclude_unset=True))
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found"
            )
        return user
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating user: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update user"
        )

@router.delete("/rbac/users/{user_id}")
async def delete_user(
    user_id: str,
    force: bool = False,
    current_user: Dict[str, Any] = Depends(get_current_user_dependency)
):
    """Delete a user with authorization checks.

    Pass ?force=true to force-delete a user who has associated records.
    Force-delete is restricted to root administrators only.
    """
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

        # Prevent deleting root admin
        if is_root_admin(user_to_delete):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Cannot delete root administrator"
            )

        # Company admin can only delete users in their own company
        if not is_root_admin(current_user):
            user_company_id = current_user.get('companyId') or current_user.get('company_id')
            target_user_company_id = user_to_delete.get('companyId') or user_to_delete.get('company_id')

            if target_user_company_id != user_company_id:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Company admins can only delete users within their own company"
                )

        if force:
            if not is_root_admin(current_user):
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Only root administrators can force-delete users"
                )
            success = await auth_repo.force_delete_user(user_id)
        else:
            try:
                success = await auth_repo.delete_user(user_id)
            except ValueError as e:
                raise HTTPException(status_code=409, detail=str(e))

        if not success:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to delete user"
            )

        admin_type = "root admin" if is_root_admin(current_user) else "company admin"
        delete_type = "force-deleted" if force else "deleted"
        logger.info(f"User {delete_type} by {current_user.get('email')} ({admin_type})")
        return {"message": "User deleted successfully"}

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting user: {e}", exc_info=True)
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
        logger.debug(f"Retrieved {len(roles)} roles")
        return roles
        
    except Exception as e:
        logger.error(f"Error fetching roles: {e}", exc_info=True)
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
        
        # Pass current_user to create_role so it can get company_id if needed
        role = await role_repo.create_role(role_data.model_dump(), current_user=current_user)
        logger.info(f"Role created successfully")
        return role
        
    except HTTPException:
        raise
    except ValueError as e:
        # ValueError from create_role contains detailed error message
        logger.warning(f"Validation error creating role: {e}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except Exception as e:
        error_msg = str(e)
        logger.error(f"Error creating role: {error_msg}", exc_info=True)
        import traceback
        traceback.print_exc()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create role: {error_msg}"
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
        
        role = await role_repo.update_role(role_id, role_data.model_dump(exclude_unset=True))
        if not role:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Role not found"
            )
        return role
        
    except HTTPException:
        raise
    except ValueError as e:
        # ValueError from update_role contains detailed error message
        logger.warning(f"Validation error updating role: {e}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except Exception as e:
        error_msg = str(e)
        logger.error(f"Error updating role: {error_msg}", exc_info=True)
        import traceback
        traceback.print_exc()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to update role: {error_msg}"
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
        logger.error(f"Error deleting role: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to delete role"
        )

@router.get("/rbac/permissions")
async def get_permissions(current_user: Dict[str, Any] = Depends(get_current_user_dependency)):
    """Get all available permissions."""
    try:
        permissions = await role_repo.get_permissions()
        logger.debug(f"Retrieved {len(permissions)} permissions")
        return permissions
        
    except Exception as e:
        logger.error(f"Error fetching permissions: {e}", exc_info=True)
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