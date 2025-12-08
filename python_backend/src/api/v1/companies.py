"""
Companies API endpoints for v1 API with validation.
"""
from typing import List, Optional, Dict, Any
from fastapi import APIRouter, HTTPException, status, Depends
from pydantic import BaseModel, Field, field_validator, EmailStr
from ...database.auth_repositories import company_repo
from ...api.auth import get_current_user_dependency, is_root_admin
from ...validators import (
    validate_company_name,
    validate_phone,
    validate_url,
    validate_email_format,
    sanitize_string,
)
import logging

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
            user_company_id = current_user.get('companyId')
            companies = await company_repo.get_companies()
            companies = [c for c in companies if c.get('id') == user_company_id]
        
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
    """Create a new company (admin only)."""
    try:
        if not is_root_admin(current_user) and current_user.get('role') != 'admin':
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Admin access required"
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
    """Update a company (admin only)."""
    try:
        if not is_root_admin(current_user) and current_user.get('role') != 'admin':
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Admin access required"
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

