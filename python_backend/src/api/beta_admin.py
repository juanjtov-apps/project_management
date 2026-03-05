"""
Beta Admin Invitation API endpoints.
Handles inviting new company admins during the beta period,
token verification, account setup, and password reset.
"""

import uuid
import json
import logging
import hashlib
from datetime import datetime, timedelta, timezone
from typing import Optional, Dict, Any

import bcrypt
from fastapi import APIRouter, HTTPException, Request, Response, status, Depends
from pydantic import BaseModel, EmailStr

from ..database.connection import get_db_pool
from ..core.config import settings
from ..services.magic_link_service import generate_token, hash_token
from ..services.email_service import EmailService
from ..validators.password_validator import validate_password_strength

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/beta", tags=["beta-admin"])

# Token expiry configuration
INVITE_EXPIRY_DAYS = 7
RESET_EXPIRY_HOURS = 1


# --- Request/Response Models ---

class BetaInviteRequest(BaseModel):
    email: EmailStr


class BetaCompleteSetupRequest(BaseModel):
    token: str
    first_name: str
    last_name: str
    company_name: str
    password: str


class BetaResetPasswordRequest(BaseModel):
    email: EmailStr


class BetaCompleteResetRequest(BaseModel):
    token: str
    password: str


# --- Helper: get current user from session ---

async def _get_session_user(request: Request) -> Dict[str, Any]:
    """Extract authenticated user from session cookie. Raises 401 if not authenticated."""
    from .auth import get_session

    session_id = request.cookies.get("session_id")
    if not session_id:
        auth_header = request.headers.get("authorization")
        if auth_header and auth_header.startswith("Bearer "):
            session_id = auth_header[7:]

    if not session_id:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Not authenticated")

    session_data = await get_session(session_id)
    if not session_data:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Session expired or invalid")

    return session_data["user_data"]


def _require_root_admin(user_data: Dict[str, Any]):
    """Raise 403 if user is not a root admin."""
    from .auth import is_root_admin
    if not is_root_admin(user_data):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only root administrators can perform this action",
        )


# --- Endpoints ---

@router.post("/invite")
async def invite_company_admin(body: BetaInviteRequest, request: Request):
    """Send a beta invitation to a prospective company admin.

    Root admin only. Generates a secure token and sends a Proesphere-branded
    invitation email. The invitee clicks the link, sets up their company and
    account, and is automatically logged in.
    """
    user_data = await _get_session_user(request)
    _require_root_admin(user_data)

    inviter_id = str(user_data.get("id") or user_data.get("userId") or "")
    pool = await get_db_pool()

    async with pool.acquire() as conn:
        # Check if email is already registered
        existing = await conn.fetchrow("SELECT id FROM users WHERE email = $1", body.email)
        if existing:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="A user with this email already exists",
            )

        # Invalidate any pending invitations for this email
        await conn.execute(
            """
            UPDATE public.beta_invitations
            SET used_at = NOW()
            WHERE email = $1 AND used_at IS NULL AND purpose = 'invite'
            """,
            body.email,
        )

        # Generate token
        raw_token, token_hash_value = generate_token()
        expires_at = datetime.now(timezone.utc) + timedelta(days=INVITE_EXPIRY_DAYS)

        # Store invitation
        await conn.execute(
            """
            INSERT INTO public.beta_invitations
            (email, token_hash, purpose, invited_by, expires_at)
            VALUES ($1, $2, 'invite', $3, $4)
            """,
            body.email,
            token_hash_value,
            inviter_id,
            expires_at,
        )

    # Build invitation URL
    invite_url = f"{settings.magic_link_base_url}/onboard/company?token={raw_token}"
    logger.info(f"Beta invite URL for {body.email}: {invite_url}")

    # Send email
    email_svc = EmailService()
    email_sent = await email_svc.send_beta_admin_invite_email(
        to_email=body.email,
        invite_url=invite_url,
    )

    return {
        "success": True,
        "email": body.email,
        "emailSent": email_sent,
    }


@router.get("/verify-token")
async def verify_beta_token(token: str):
    """Verify a beta invitation or reset token without consuming it.

    Public endpoint. Returns validity status and the associated email.
    """
    if not token:
        return {"valid": False}

    token_hash_value = hash_token(token)
    pool = await get_db_pool()

    async with pool.acquire() as conn:
        row = await conn.fetchrow(
            """
            SELECT email, purpose
            FROM public.beta_invitations
            WHERE token_hash = $1 AND used_at IS NULL AND expires_at > NOW()
            """,
            token_hash_value,
        )

    if row:
        return {"valid": True, "email": row["email"], "purpose": row["purpose"]}

    return {"valid": False}


@router.post("/complete-setup")
async def complete_beta_setup(body: BetaCompleteSetupRequest, request: Request, response: Response):
    """Complete the beta admin setup: create company, user, and session.

    Public endpoint (no auth required — the token IS the auth).
    All operations are performed in a single database transaction.
    """
    # Validate password strength
    try:
        validate_password_strength(body.password)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))

    token_hash_value = hash_token(body.token)
    client_ip = request.client.host if request.client else None
    pool = await get_db_pool()

    async with pool.acquire() as conn:
        async with conn.transaction():
            # Atomically consume the token
            invitation = await conn.fetchrow(
                """
                UPDATE public.beta_invitations
                SET used_at = NOW(), ip_address = $2
                WHERE token_hash = $1 AND used_at IS NULL AND expires_at > NOW() AND purpose = 'invite'
                RETURNING id, email
                """,
                token_hash_value,
                client_ip,
            )

            if not invitation:
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Invalid, expired, or already used invitation link.",
                )

            email = invitation["email"]
            invitation_id = invitation["id"]

            # Double-check email isn't already registered
            existing = await conn.fetchrow("SELECT id FROM users WHERE email = $1", email)
            if existing:
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail="An account with this email already exists. Please log in instead.",
                )

            # Create company
            company_id = str(uuid.uuid4())
            await conn.execute(
                """
                INSERT INTO companies (id, name, industry, is_active, created_at, updated_at)
                VALUES ($1, $2, 'construction', true, NOW(), NOW())
                """,
                company_id,
                body.company_name,
            )

            # Look up admin role_id
            from .auth import get_role_column_name
            role_col = await get_role_column_name(conn)
            if role_col:
                role_row = await conn.fetchrow(
                    f"SELECT id FROM roles WHERE LOWER({role_col}) = 'admin' LIMIT 1"
                )
            else:
                role_row = await conn.fetchrow("SELECT id FROM roles WHERE id = 1 LIMIT 1")
            admin_role_id = role_row["id"] if role_row else 1

            # Hash password
            password_hash = bcrypt.hashpw(
                body.password.encode("utf-8"), bcrypt.gensalt()
            ).decode("utf-8")

            # Create admin user
            user_id = str(uuid.uuid4())
            await conn.execute(
                """
                INSERT INTO users (id, email, username, first_name, last_name, password,
                                   role_id, company_id, is_active, is_root, created_at, updated_at)
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, true, false, NOW(), NOW())
                """,
                user_id,
                email,
                email,
                body.first_name,
                body.last_name,
                password_hash,
                admin_role_id,
                company_id,
            )

            # Update invitation with created IDs
            await conn.execute(
                """
                UPDATE public.beta_invitations
                SET created_user_id = $1, created_company_id = $2
                WHERE id = $3
                """,
                user_id,
                company_id,
                invitation_id,
            )

    # Fetch the created user with role info for session
    async with pool.acquire() as conn:
        from .auth import get_role_column_name
        role_col = await get_role_column_name(conn)
        if role_col:
            user_row = await conn.fetchrow(
                f"SELECT u.*, r.{role_col} as role_name FROM users u LEFT JOIN roles r ON u.role_id = r.id WHERE u.id = $1",
                user_id,
            )
        else:
            user_row = await conn.fetchrow(
                "SELECT u.*, NULL as role_name FROM users u WHERE u.id = $1",
                user_id,
            )

    user_data = dict(user_row)

    # Create session
    from .auth import (
        create_session,
        get_navigation_permissions,
        is_root_admin,
        filter_permissions_by_company_modules,
        SESSION_TTL,
        get_cookie_secure,
    )
    from ..middleware.security import generate_csrf_token, store_csrf_token

    session_id = await create_session(user_data["id"], user_data)

    csrf_token = generate_csrf_token()
    store_csrf_token(session_id, csrf_token)

    response.set_cookie(
        key="session_id",
        value=session_id,
        max_age=SESSION_TTL,
        httponly=True,
        secure=get_cookie_secure(),
        samesite="lax",
    )

    response.headers["X-CSRF-Token"] = csrf_token

    # Build user response
    user_data.pop("password", None)

    if "company_id" in user_data:
        user_data["companyId"] = user_data["company_id"]
    if "is_root" in user_data:
        user_data["isRoot"] = user_data["is_root"]

    role_name = user_data.get("role_name") or user_data.get("role", "admin")
    user_data["role"] = role_name

    is_root = is_root_admin(user_data)
    permissions = get_navigation_permissions(role_name, is_root)
    permissions = await filter_permissions_by_company_modules(permissions, company_id, is_root, pool)

    user_data["permissions"] = permissions
    user_data["isRootAdmin"] = is_root

    return {
        "user": user_data,
        "sessionId": session_id,
    }


@router.post("/reset-password")
async def reset_admin_password(body: BetaResetPasswordRequest, request: Request):
    """Send a password reset email to an existing admin user.

    Root admin only. Generates a 1-hour token and sends a reset email.
    """
    user_data = await _get_session_user(request)
    _require_root_admin(user_data)

    inviter_id = str(user_data.get("id") or user_data.get("userId") or "")
    pool = await get_db_pool()

    async with pool.acquire() as conn:
        # Find the target user
        target = await conn.fetchrow(
            "SELECT id, email, first_name FROM users WHERE email = $1",
            body.email,
        )
        if not target:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="No user found with this email",
            )

        target_user_id = str(target["id"])

        # Invalidate any pending reset tokens for this email
        await conn.execute(
            """
            UPDATE public.beta_invitations
            SET used_at = NOW()
            WHERE email = $1 AND used_at IS NULL AND purpose = 'reset'
            """,
            body.email,
        )

        # Generate token
        raw_token, token_hash_value = generate_token()
        expires_at = datetime.now(timezone.utc) + timedelta(hours=RESET_EXPIRY_HOURS)

        # Store reset invitation
        await conn.execute(
            """
            INSERT INTO public.beta_invitations
            (email, token_hash, purpose, invited_by, target_user_id, expires_at)
            VALUES ($1, $2, 'reset', $3, $4, $5)
            """,
            body.email,
            token_hash_value,
            inviter_id,
            target_user_id,
            expires_at,
        )

    # Build reset URL
    reset_url = f"{settings.magic_link_base_url}/onboard/company?token={raw_token}"
    logger.info(f"Password reset URL for {body.email}: {reset_url}")

    # Send email
    email_svc = EmailService()
    email_sent = await email_svc.send_beta_reset_email(
        to_email=body.email,
        reset_url=reset_url,
    )

    return {
        "success": True,
        "email": body.email,
        "emailSent": email_sent,
    }


@router.post("/complete-reset")
async def complete_password_reset(body: BetaCompleteResetRequest, request: Request, response: Response):
    """Complete a password reset: update password and create session.

    Public endpoint (no auth required — the token IS the auth).
    """
    # Validate password strength
    try:
        validate_password_strength(body.password)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))

    token_hash_value = hash_token(body.token)
    client_ip = request.client.host if request.client else None
    pool = await get_db_pool()

    async with pool.acquire() as conn:
        async with conn.transaction():
            # Atomically consume the token
            invitation = await conn.fetchrow(
                """
                UPDATE public.beta_invitations
                SET used_at = NOW(), ip_address = $2
                WHERE token_hash = $1 AND used_at IS NULL AND expires_at > NOW() AND purpose = 'reset'
                RETURNING id, email, target_user_id
                """,
                token_hash_value,
                client_ip,
            )

            if not invitation:
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Invalid, expired, or already used reset link.",
                )

            target_user_id = invitation["target_user_id"]
            if not target_user_id:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Invalid reset token — no target user.",
                )

            # Hash new password
            password_hash = bcrypt.hashpw(
                body.password.encode("utf-8"), bcrypt.gensalt()
            ).decode("utf-8")

            # Update user's password
            await conn.execute(
                "UPDATE users SET password = $1, updated_at = NOW() WHERE id = $2",
                password_hash,
                target_user_id,
            )

    # Fetch user data for session
    async with pool.acquire() as conn:
        from .auth import get_role_column_name
        role_col = await get_role_column_name(conn)
        if role_col:
            user_row = await conn.fetchrow(
                f"SELECT u.*, r.{role_col} as role_name FROM users u LEFT JOIN roles r ON u.role_id = r.id WHERE u.id = $1",
                target_user_id,
            )
        else:
            user_row = await conn.fetchrow(
                "SELECT u.*, NULL as role_name FROM users u WHERE u.id = $1",
                target_user_id,
            )

    if not user_row:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    user_data = dict(user_row)

    # Create session
    from .auth import (
        create_session,
        get_navigation_permissions,
        is_root_admin,
        filter_permissions_by_company_modules,
        SESSION_TTL,
        get_cookie_secure,
    )
    from ..middleware.security import generate_csrf_token, store_csrf_token

    session_id = await create_session(user_data["id"], user_data)

    csrf_token = generate_csrf_token()
    store_csrf_token(session_id, csrf_token)

    response.set_cookie(
        key="session_id",
        value=session_id,
        max_age=SESSION_TTL,
        httponly=True,
        secure=get_cookie_secure(),
        samesite="lax",
    )

    response.headers["X-CSRF-Token"] = csrf_token

    # Build user response
    user_data.pop("password", None)

    if "company_id" in user_data:
        user_data["companyId"] = user_data["company_id"]
    if "is_root" in user_data:
        user_data["isRoot"] = user_data["is_root"]

    role_name = user_data.get("role_name") or user_data.get("role", "admin")
    user_data["role"] = role_name

    is_root = is_root_admin(user_data)
    company_id = user_data.get("company_id") or user_data.get("companyId")
    permissions = get_navigation_permissions(role_name, is_root)
    permissions = await filter_permissions_by_company_modules(permissions, company_id, is_root, pool)

    user_data["permissions"] = permissions
    user_data["isRootAdmin"] = is_root

    return {
        "user": user_data,
        "sessionId": session_id,
    }
