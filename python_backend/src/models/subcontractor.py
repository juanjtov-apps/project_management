"""Pydantic models for subcontractor company profiles and invitations."""

from pydantic import BaseModel, Field, ConfigDict
from typing import Optional
from datetime import datetime, date


class SubcontractorCreate(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    name: str
    trade: Optional[str] = None
    contact_email: Optional[str] = Field(None, alias="contactEmail")
    contact_phone: Optional[str] = Field(None, alias="contactPhone")
    address: Optional[str] = None
    license_number: Optional[str] = Field(None, alias="licenseNumber")
    license_expiry: Optional[date] = Field(None, alias="licenseExpiry")
    insurance_provider: Optional[str] = Field(None, alias="insuranceProvider")
    insurance_policy_number: Optional[str] = Field(None, alias="insurancePolicyNumber")
    insurance_expiry: Optional[date] = Field(None, alias="insuranceExpiry")
    notes: Optional[str] = None


class SubcontractorUpdate(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    name: Optional[str] = None
    trade: Optional[str] = None
    contact_email: Optional[str] = Field(None, alias="contactEmail")
    contact_phone: Optional[str] = Field(None, alias="contactPhone")
    address: Optional[str] = None
    license_number: Optional[str] = Field(None, alias="licenseNumber")
    license_expiry: Optional[date] = Field(None, alias="licenseExpiry")
    insurance_provider: Optional[str] = Field(None, alias="insuranceProvider")
    insurance_policy_number: Optional[str] = Field(None, alias="insurancePolicyNumber")
    insurance_expiry: Optional[date] = Field(None, alias="insuranceExpiry")
    status: Optional[str] = None
    notes: Optional[str] = None


class SubcontractorResponse(BaseModel):
    model_config = ConfigDict(populate_by_name=True, from_attributes=True)

    id: str
    company_id: str = Field(alias="companyId")
    name: str
    trade: Optional[str] = None
    contact_email: Optional[str] = Field(None, alias="contactEmail")
    contact_phone: Optional[str] = Field(None, alias="contactPhone")
    address: Optional[str] = None
    license_number: Optional[str] = Field(None, alias="licenseNumber")
    license_expiry: Optional[date] = Field(None, alias="licenseExpiry")
    insurance_provider: Optional[str] = Field(None, alias="insuranceProvider")
    insurance_policy_number: Optional[str] = Field(None, alias="insurancePolicyNumber")
    insurance_expiry: Optional[date] = Field(None, alias="insuranceExpiry")
    overall_performance_score: Optional[float] = Field(None, alias="overallPerformanceScore")
    status: str
    notes: Optional[str] = None
    created_at: datetime = Field(alias="createdAt")
    updated_at: datetime = Field(alias="updatedAt")


class InviteSubRequest(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    # Sub user fields
    first_name: str = Field(alias="firstName")
    last_name: str = Field(alias="lastName")
    email: str
    phone: Optional[str] = None

    # Sub company fields (create new or link to existing)
    subcontractor_id: Optional[str] = Field(None, alias="subcontractorId")
    company_name: Optional[str] = Field(None, alias="companyName")
    trade: Optional[str] = None

    # Assignment fields
    project_id: str = Field(alias="projectId")
    specialization: Optional[str] = None
    contract_value: Optional[float] = Field(None, alias="contractValue")
    start_date: Optional[datetime] = Field(None, alias="startDate")
    end_date: Optional[datetime] = Field(None, alias="endDate")

    welcome_note: Optional[str] = Field(None, alias="welcomeNote")
