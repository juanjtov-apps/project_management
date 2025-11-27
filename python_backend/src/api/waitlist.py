"""
Waitlist API endpoints for collecting interested user signups
"""
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, EmailStr
from typing import Optional
from ..database.connection import get_db_pool
import logging

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/waitlist", tags=["waitlist"])


class WaitlistSignup(BaseModel):
    firstName: str
    lastName: str
    email: EmailStr
    company: Optional[str] = None
    role: Optional[str] = None
    phone: Optional[str] = None
    message: Optional[str] = None


class WaitlistResponse(BaseModel):
    success: bool
    message: str
    id: Optional[str] = None


@router.post("", response_model=WaitlistResponse)
async def join_waitlist(signup: WaitlistSignup):
    """Add a new user to the waitlist"""
    try:
        pool = await get_db_pool()
        async with pool.acquire() as conn:
            # Check if email already exists
            existing = await conn.fetchrow(
                "SELECT id FROM waitlist WHERE email = $1",
                signup.email
            )
            
            if existing:
                return WaitlistResponse(
                    success=True,
                    message="You're already on our waitlist! We'll be in touch soon.",
                    id=existing["id"]
                )
            
            # Insert new signup
            result = await conn.fetchrow(
                """
                INSERT INTO waitlist (first_name, last_name, email, company, role, phone, message)
                VALUES ($1, $2, $3, $4, $5, $6, $7)
                RETURNING id
                """,
                signup.firstName,
                signup.lastName,
                signup.email,
                signup.company,
                signup.role,
                signup.phone,
                signup.message
            )
            
            logger.info(f"New waitlist signup: {signup.email}")
            
            return WaitlistResponse(
                success=True,
                message="Thanks for joining! We'll notify you when Proesphere launches.",
                id=result["id"]
            )
            
    except Exception as e:
        logger.error(f"Waitlist signup error: {e}")
        raise HTTPException(status_code=500, detail="Failed to join waitlist. Please try again.")
