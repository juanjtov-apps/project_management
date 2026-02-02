"""
Companies API endpoints for v1 API with validation.
"""
from typing import List, Optional, Dict, Any
from fastapi import APIRouter, HTTPException, status, Depends
from pydantic import BaseModel, Field, field_validator, EmailStr
from ...database.auth_repositories import company_repo
from ...database.connection import get_db_pool
from ...api.auth import get_current_user_dependency, is_root_admin
from ...validators import (
    validate_company_name,
    validate_phone,
    validate_url,
    validate_email_format,
    sanitize_string,
)
import asyncpg
import json
import logging

# Define allowed modules that can be toggled
ALLOWED_MODULES = [
    "dashboard",
    "projects",
    "projectHealth",
    "schedule",
    "photos",
    "logs",
    "clientPortal",
    "rbacAdmin"
]

# Default module settings (all enabled)
DEFAULT_MODULE_SETTINGS = {module: True for module in ALLOWED_MODULES}

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/companies", tags=["companies"])

class CompanyCreate(BaseModel):
    """Request model for creating company."""
    name: str = Field(..., min_length=1, description="Company name")
    industry: Optional[str] = Field(default="construction", description="Industry")
    address: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[EmailStr] = None
    website: Optional[str] = None
    
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
    
    @field_validator('website')
    @classmethod
    def validate_website(cls, v):
        """Validate website URL"""
        if v is None:
            return v
        return validate_url(v)
    
    @field_validator('address', 'industry')
    @classmethod
    def validate_text_fields(cls, v):
        """Validate text fields"""
        if v is None:
            return v
        v = sanitize_string(v)
        if len(v) > 500:
            raise ValueError("Field must be 500 characters or less")
        return v.strip()

class CompanyUpdate(BaseModel):
    """Request model for updating company."""
    name: Optional[str] = Field(None, min_length=1)
    industry: Optional[str] = None
    address: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[EmailStr] = None
    website: Optional[str] = None
    
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
    
    @field_validator('website')
    @classmethod
    def validate_website(cls, v):
        """Validate website URL"""
        if v is None:
            return v
        return validate_url(v)
    
    @field_validator('address', 'industry')
    @classmethod
    def validate_text_fields(cls, v):
        """Validate text fields"""
        if v is None:
            return v
        v = sanitize_string(v)
        if len(v) > 500:
            raise ValueError("Field must be 500 characters or less")
        return v.strip()

@router.get("", summary="Get all companies")
async def get_companies(
    current_user: Dict[str, Any] = Depends(get_current_user_dependency)
):
    """Get companies with company filtering."""
    try:
        if is_root_admin(current_user):
            companies = await company_repo.get_companies()
        else:
            # Check both snake_case and camelCase for compatibility
            user_company_id = current_user.get('companyId') or current_user.get('company_id')
            logger.debug(f"[GET /companies] user_company_id: {user_company_id}")
            companies = await company_repo.get_companies()
            # Use string comparison to handle type mismatches
            companies = [c for c in companies if str(c.get('id')) == str(user_company_id)]
            logger.debug(f"[GET /companies] Filtered to {len(companies)} companies for user company {user_company_id}")

        return companies
    except Exception as e:
        logger.error(f"Error fetching companies: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to fetch companies"
        )

@router.post("", status_code=status.HTTP_201_CREATED, summary="Create company")
async def create_company(
    company: CompanyCreate,
    current_user: Dict[str, Any] = Depends(get_current_user_dependency)
):
    """Create a new company (root admin only)."""
    try:
        if not is_root_admin(current_user):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Root admin access required to create companies"
            )
        
        company_data = company.dict()
        new_company = await company_repo.create_company(company_data)
        return new_company
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error creating company: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create company"
        )

@router.patch("/{company_id}", summary="Update company")
async def update_company(
    company_id: str,
    company_update: CompanyUpdate,
    current_user: Dict[str, Any] = Depends(get_current_user_dependency)
):
    """Update a company (root admin can update any, company admin can update their own)."""
    try:
        # Root admin can update any company
        if not is_root_admin(current_user):
            # Company admins can only update their own company
            if current_user.get('role') != 'admin':
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Admin access required"
                )
            # Verify admin is updating their own company
            user_company_id = str(current_user.get('companyId', ''))
            if user_company_id != str(company_id):
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="You can only update your own company"
                )

        updated_company = await company_repo.update_company(
            company_id,
            company_update.dict(exclude_unset=True)
        )
        if not updated_company:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Company not found"
            )
        return updated_company
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating company: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update company"
        )

@router.delete("/{company_id}", status_code=status.HTTP_204_NO_CONTENT, summary="Delete company")
async def delete_company(
    company_id: str,
    current_user: Dict[str, Any] = Depends(get_current_user_dependency)
):
    """Delete a company (root admin only)."""
    try:
        if not is_root_admin(current_user):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Root admin access required"
            )

        success = await company_repo.delete_company(company_id)
        if not success:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Company not found"
            )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting company: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to delete company"
        )


class CompanyStatusUpdate(BaseModel):
    """Request model for updating company status."""
    is_active: bool = Field(..., description="Whether the company is active")


@router.patch("/{company_id}/status", summary="Activate or deactivate company")
async def update_company_status(
    company_id: str,
    status_update: CompanyStatusUpdate,
    current_user: Dict[str, Any] = Depends(get_current_user_dependency)
):
    """Activate or deactivate a company (root admin only)."""
    try:
        if not is_root_admin(current_user):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Root admin access required"
            )

        updated = await company_repo.update_company(
            company_id,
            {"is_active": status_update.is_active}
        )
        if not updated:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Company not found"
            )

        action = "activated" if status_update.is_active else "deactivated"
        logger.info(f"Company {company_id} {action} by root user {current_user.get('email')}")
        return updated
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating company status: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update company status"
        )


# ============================================================================
# MODULE MANAGEMENT ENDPOINTS (ROOT ADMIN ONLY)
# ============================================================================

class ModuleSettings(BaseModel):
    """Request model for updating company module settings."""
    enabledModules: Dict[str, bool] = Field(..., description="Module enabled/disabled states")

    @field_validator('enabledModules')
    @classmethod
    def validate_modules(cls, v):
        """Validate that all module keys are allowed."""
        invalid_keys = set(v.keys()) - set(ALLOWED_MODULES)
        if invalid_keys:
            raise ValueError(f"Invalid module keys: {invalid_keys}. Allowed: {ALLOWED_MODULES}")
        return v


class BulkModuleUpdate(BaseModel):
    """Request model for bulk module update."""
    module: str = Field(..., description="Module key to update")
    enabled: bool = Field(..., description="Whether to enable or disable the module")

    @field_validator('module')
    @classmethod
    def validate_module(cls, v):
        """Validate that module key is allowed."""
        if v not in ALLOWED_MODULES:
            raise ValueError(f"Invalid module: {v}. Allowed: {ALLOWED_MODULES}")
        return v


@router.get("/{company_id}/modules", summary="Get company module settings")
async def get_company_modules(
    company_id: str,
    current_user: Dict[str, Any] = Depends(get_current_user_dependency),
    pool: asyncpg.Pool = Depends(get_db_pool)
):
    """Get module settings for a company (root admin only)."""
    if not is_root_admin(current_user):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Root admin access required"
        )

    async with pool.acquire() as conn:
        row = await conn.fetchrow(
            "SELECT id, name, settings FROM companies WHERE id = $1",
            company_id
        )
        if not row:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Company not found"
            )

        settings = row['settings'] or {}
        if isinstance(settings, str):
            settings = json.loads(settings)

        enabled_modules = settings.get('enabledModules', DEFAULT_MODULE_SETTINGS.copy())

        return {
            "companyId": row['id'],
            "companyName": row['name'],
            "enabledModules": enabled_modules,
            "availableModules": ALLOWED_MODULES
        }


@router.patch("/{company_id}/modules", summary="Update company module settings")
async def update_company_modules(
    company_id: str,
    module_settings: ModuleSettings,
    current_user: Dict[str, Any] = Depends(get_current_user_dependency),
    pool: asyncpg.Pool = Depends(get_db_pool)
):
    """Update module settings for a company (root admin only)."""
    if not is_root_admin(current_user):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Root admin access required"
        )

    async with pool.acquire() as conn:
        # Get current settings
        row = await conn.fetchrow(
            "SELECT settings FROM companies WHERE id = $1",
            company_id
        )
        if not row:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Company not found"
            )

        current_settings = row['settings'] or {}
        if isinstance(current_settings, str):
            current_settings = json.loads(current_settings)

        # Merge new module settings
        current_settings['enabledModules'] = module_settings.enabledModules

        # Update the company
        await conn.execute(
            "UPDATE companies SET settings = $1 WHERE id = $2",
            json.dumps(current_settings),
            company_id
        )

        logger.info(f"Company {company_id} modules updated by root user {current_user.get('email')}")

        return {
            "success": True,
            "companyId": company_id,
            "enabledModules": module_settings.enabledModules
        }


@router.get("/modules/all", summary="Get all companies module settings")
async def get_all_companies_modules(
    current_user: Dict[str, Any] = Depends(get_current_user_dependency),
    pool: asyncpg.Pool = Depends(get_db_pool)
):
    """Get module settings for all companies (root admin only)."""
    if not is_root_admin(current_user):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Root admin access required"
        )

    async with pool.acquire() as conn:
        rows = await conn.fetch(
            "SELECT id, name, settings FROM companies ORDER BY name"
        )

        companies = []
        for row in rows:
            settings = row['settings'] or {}
            if isinstance(settings, str):
                settings = json.loads(settings)

            enabled_modules = settings.get('enabledModules', DEFAULT_MODULE_SETTINGS.copy())

            companies.append({
                "companyId": row['id'],
                "companyName": row['name'],
                "enabledModules": enabled_modules
            })

        return {
            "companies": companies,
            "availableModules": ALLOWED_MODULES
        }


@router.patch("/modules/bulk", summary="Bulk update module across all companies")
async def bulk_update_module(
    bulk_update: BulkModuleUpdate,
    current_user: Dict[str, Any] = Depends(get_current_user_dependency),
    pool: asyncpg.Pool = Depends(get_db_pool)
):
    """Enable or disable a module for ALL companies (root admin only)."""
    if not is_root_admin(current_user):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Root admin access required"
        )

    async with pool.acquire() as conn:
        # Get all companies
        rows = await conn.fetch("SELECT id, settings FROM companies")

        updated_count = 0
        for row in rows:
            settings = row['settings'] or {}
            if isinstance(settings, str):
                settings = json.loads(settings)

            # Initialize enabledModules if not present
            if 'enabledModules' not in settings:
                settings['enabledModules'] = DEFAULT_MODULE_SETTINGS.copy()

            # Update the specific module
            settings['enabledModules'][bulk_update.module] = bulk_update.enabled

            await conn.execute(
                "UPDATE companies SET settings = $1 WHERE id = $2",
                json.dumps(settings),
                row['id']
            )
            updated_count += 1

        action = "enabled" if bulk_update.enabled else "disabled"
        logger.info(f"Module '{bulk_update.module}' {action} for {updated_count} companies by root user {current_user.get('email')}")

        return {
            "success": True,
            "module": bulk_update.module,
            "enabled": bulk_update.enabled,
            "companiesUpdated": updated_count
        }
