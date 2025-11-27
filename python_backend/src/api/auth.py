"""
Authentication API endpoints for Proesphere.
Handles login, logout, and session management with company-filtered access.
"""

from fastapi import APIRouter, HTTPException, status, Depends, Request, Response
from pydantic import BaseModel, EmailStr
from typing import Optional, Dict, Any
import bcrypt
import uuid
from datetime import datetime, timedelta
import asyncpg
from ..database.connection import get_db_pool
from ..models.user import User
from ..core.config import settings
import os

router = APIRouter(prefix="/auth", tags=["auth"])

# Add explicit OPTIONS handler for CORS preflight
@router.options("/user")
async def user_options():
    """Handle CORS preflight for /auth/user endpoint"""
    return {"message": "OK"}

@router.options("/login") 
async def login_options():
    """Handle CORS preflight for /auth/login endpoint"""
    return {"message": "OK"}

@router.options("/logout")
async def logout_options():
    """Handle CORS preflight for /auth/logout endpoint"""
    return {"message": "OK"}

# Session configuration
SESSION_TTL = 7 * 24 * 60 * 60  # 1 week in seconds
SESSION_SECRET = os.getenv("SESSION_SECRET", "default-secret-key")

def is_production() -> bool:
    """Check if running in production environment.
    
    Checks multiple indicators:
    - NODE_ENV not set to 'development'
    - REPLIT_DEPLOYMENT environment variable is set (Replit production)
    - REPL_SLUG is set (running on Replit)
    """
    node_env = os.getenv("NODE_ENV", "")
    replit_deployment = os.getenv("REPLIT_DEPLOYMENT", "")
    repl_slug = os.getenv("REPL_SLUG", "")
    
    # If explicitly set to development, we're not in production
    if node_env == "development":
        return False
    
    # If REPLIT_DEPLOYMENT is set, we're in Replit production
    if replit_deployment:
        return True
    
    # If REPL_SLUG is set but not development mode, we're on Replit (could be dev preview or production)
    # Default to secure cookies on Replit since it uses HTTPS
    if repl_slug:
        return True
    
    # If NODE_ENV is set to production, we're in production
    if node_env == "production":
        return True
    
    return False

def get_cookie_secure() -> bool:
    """Get secure flag for cookies based on environment.
    
    Returns True if running in production (HTTPS required).
    """
    return is_production()

class LoginRequest(BaseModel):
    email: EmailStr
    password: str

class LoginResponse(BaseModel):
    user: Dict[str, Any]
    session_id: str

class LogoutResponse(BaseModel):
    success: bool
    message: str

# In-memory session store (replace with Redis in production)
session_store: Dict[str, Dict[str, Any]] = {}

def get_navigation_permissions(role: str, is_root_admin: bool) -> Dict[str, bool]:
    """Get navigation permissions for the user matching frontend sidebar expectations."""
    # Base permissions for all users
    permissions = {
        "dashboard": True,
        "projects": True,
        "tasks": True,
        "photos": True,
        "schedule": True,
        "logs": True,
        "projectHealth": True,
        "crew": False,
        "subs": False,
        "rbacAdmin": False,
        "clientPortal": False,
        "clientPortalPayments": False  # New permission for payments tab
    }
    
    # Client Portal access for managers, project_managers, office_managers and admins
    # They get all tabs EXCEPT payments (which is admin-only)
    if role in ['admin', 'manager', 'project_manager', 'office_manager']:
        permissions.update({
            "crew": True,
            "subs": True,
            "clientPortal": True
        })
    
    # RBAC Admin and Payments access only for admins and root
    if is_root_admin or role == 'admin':
        permissions.update({
            "rbacAdmin": True,
            "crew": True,
            "subs": True,
            "clientPortal": True,
            "clientPortalPayments": True  # Only admins can access payments
        })
    
    # Contractor/Client limited access
    if role == 'contractor':
        permissions.update({
            "tasks": True,
            "photos": True,
            "projects": False,  # Only assigned projects
            "schedule": False,
            "logs": False,
            "projectHealth": False,
            "crew": False,
            "subs": False,
            "clientPortal": False,
            "clientPortalPayments": False
        })
    
    if role == 'client':
        permissions.update({
            "clientPortal": True,
            "tasks": False,
            "photos": True,
            "projects": True,
            "schedule": False,
            "logs": False,
            "projectHealth": False,
            "crew": False,
            "subs": False,
            "clientPortalPayments": False  # Clients can't access payments
        })
    
    return permissions

async def create_session(user_id: str, user_data: Dict[str, Any]) -> str:
    """Create a new session and store it in PostgreSQL."""
    session_id = str(uuid.uuid4())
    expires_at = datetime.utcnow() + timedelta(seconds=SESSION_TTL)
    
    pool = await get_db_pool()
    async with pool.acquire() as conn:
        # Store session in database (match existing schema: sid, sess, expire)
        import json
        # Convert user_data to JSON-serializable format
        serializable_data = {}
        for key, value in user_data.items():
            if isinstance(value, datetime):
                serializable_data[key] = value.isoformat()
            else:
                serializable_data[key] = value
        
        # Add current_organization_id to session data
        current_org_id = None
        if not is_root_admin(user_data):
            current_org_id = str(user_data.get("company_id") or user_data.get("companyId") or "")
        serializable_data["current_organization_id"] = current_org_id
        
        session_data = json.dumps(serializable_data)
        await conn.execute("""
            INSERT INTO sessions (sid, sess, expire)
            VALUES ($1, $2, $3)
            ON CONFLICT (sid) DO UPDATE SET
                sess = EXCLUDED.sess,
                expire = EXCLUDED.expire
        """, session_id, session_data, expires_at)
    
    # Store session data in memory for quick access
    # Initialize current_organization_id to user's company_id for non-root users
    # Root users start with None (can switch context)
    current_org_id = None
    if not is_root_admin(user_data):
        current_org_id = str(user_data.get("company_id") or user_data.get("companyId") or "")
    
    session_store[session_id] = {
        "userId": user_id,
        "expires_at": expires_at,
        "user_data": user_data,
        "current_organization_id": current_org_id
    }
    
    return session_id

async def get_session(session_id: str) -> Optional[Dict[str, Any]]:
    """Get session data from store."""
    # Check memory first
    if session_id in session_store:
        session_data = session_store[session_id]
        if datetime.utcnow() < session_data["expires_at"]:
            return session_data
        else:
            # Session expired, remove it
            del session_store[session_id]
    
    # Check database if not found in memory
    pool = await get_db_pool()
    async with pool.acquire() as conn:
        row = await conn.fetchrow(
            """
            SELECT sess, expire FROM sessions
            WHERE sid = $1 AND expire > NOW()
            """,
            session_id,
        )

        if row:
            data = row["sess"]
            if isinstance(data, str):
                import json
                try:
                    data = json.loads(data)
                except json.JSONDecodeError:
                    data = None

            if isinstance(data, dict):
                user_id = data.get("userId") or data.get("id")
                if user_id:
                    # Use role_name column (from migration fix_roles_table.py)
                    user_row = await conn.fetchrow(
                        """SELECT u.*, r.role_name
                           FROM users u
                           LEFT JOIN roles r ON u.role_id = r.id
                           WHERE u.id = $1""",
                        user_id,
                    )
                    if user_row:
                        user_data = dict(user_row)
                        # Initialize current_organization_id if not in session
                        current_org_id = data.get("current_organization_id")
                        if current_org_id is None:
                            # For non-root users, set to their company_id
                            if not is_root_admin(user_data):
                                current_org_id = str(user_data.get("company_id") or user_data.get("companyId") or "")
                        
                        session_data = {
                            "userId": user_id,
                            "expires_at": row["expire"],
                            "user_data": user_data,
                            "current_organization_id": current_org_id
                        }
                        # Cache in memory
                        session_store[session_id] = session_data
                        return session_data
    
    return None

async def destroy_session(session_id: str):
    """Destroy a session."""
    # Remove from memory
    if session_id in session_store:
        del session_store[session_id]
    
    # Remove from database
    pool = await get_db_pool()
    async with pool.acquire() as conn:
        await conn.execute("DELETE FROM sessions WHERE sid = $1", session_id)

@router.post("/login", response_model=LoginResponse)
async def login(request: LoginRequest, response: Response):
    """User login endpoint."""
    try:
        pool = await get_db_pool()
        async with pool.acquire() as conn:
            # Get user by email with role information
            # Use role_name column (from migration fix_roles_table.py)
            user_row = await conn.fetchrow("""
                SELECT u.*, r.role_name
                FROM users u
                LEFT JOIN roles r ON u.role_id = r.id
                WHERE u.email = $1
            """, request.email)
            
            if not user_row:
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Invalid credentials"
                )
            
            user_data = dict(user_row)
            
            # Verify password
            if not user_data.get("password"):
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Invalid credentials"
                )
            
            # Check password
            password_bytes = request.password.encode('utf-8')
            hashed_password = user_data["password"].encode('utf-8')
            
            if not bcrypt.checkpw(password_bytes, hashed_password):
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Invalid credentials"
                )
            
            # Create session
            session_id = await create_session(user_data["id"], user_data)
            
            # Set session cookie with environment-aware secure flag
            # Using samesite="lax" since frontend proxies to backend (same origin)
            response.set_cookie(
                key="session_id",
                value=session_id,
                max_age=SESSION_TTL,
                httponly=True,
                secure=get_cookie_secure(),  # True in production (HTTPS), False in development
                samesite="lax"  # Same-origin requests work with lax
            )
            
            # Remove password from response
            user_data.pop("password", None)
            
            # Convert company_id to companyId for frontend compatibility
            if 'company_id' in user_data:
                user_data['companyId'] = user_data['company_id']
            
            # Convert is_root to isRoot for frontend compatibility
            if 'is_root' in user_data:
                user_data['isRoot'] = user_data['is_root']
            
            # Use role_name from roles table, fallback to text role for backward compatibility
            role_name = user_data.get("role_name") or user_data.get("role", "user")
            user_data["role"] = role_name  # Set role for backward compatibility
            
            # Add navigation permissions
            is_root = is_root_admin(user_data)
            
            permissions = get_navigation_permissions(role_name, is_root)
            user_data["permissions"] = permissions
            user_data["isRootAdmin"] = is_root
            
            return LoginResponse(user=user_data, session_id=session_id)
            
    except HTTPException:
        raise
    except Exception as e:
        print(f"Login error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Internal server error"
        )

@router.get("/user")
async def get_current_user(request: Request):
    """Get current authenticated user."""
    try:
        # Get session ID from cookie or header
        session_id = request.cookies.get("session_id")
        if not session_id:
            # Try header as fallback
            auth_header = request.headers.get("authorization")
            if auth_header and auth_header.startswith("Bearer "):
                session_id = auth_header[7:]
        
        if not session_id:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Not authenticated"
            )
        
        # Get session data
        session_data = await get_session(session_id)
        if not session_data:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Session expired or invalid"
            )
        
        user_data = session_data["user_data"].copy()
        user_data.pop("password", None)
        
        # Convert company_id to companyId for frontend compatibility
        if 'company_id' in user_data:
            user_data['companyId'] = user_data['company_id']
        
        # Convert is_root to isRoot for frontend compatibility
        if 'is_root' in user_data:
            user_data['isRoot'] = user_data['is_root']
        
        # Use role_name from roles table, fallback to text role for backward compatibility
        role_name = user_data.get("role_name") or user_data.get("role", "user")
        user_data["role"] = role_name  # Set role for backward compatibility
        
        # Add navigation permissions
        is_root = is_root_admin(user_data)
        
        permissions = get_navigation_permissions(role_name, is_root)
        user_data["permissions"] = permissions
        user_data["isRootAdmin"] = is_root
        
        # Add current_organization_id from session if available (already have session_data)
        if "current_organization_id" in session_data:
            current_org_id = session_data.get("current_organization_id")
            if current_org_id:
                user_data["currentOrganizationId"] = current_org_id
                user_data["current_organization_id"] = current_org_id
        
        # Fetch and add organization/company name
        company_id = user_data.get('company_id') or user_data.get('companyId')
        if company_id:
            try:
                pool = await get_db_pool()
                async with pool.acquire() as conn:
                    company_row = await conn.fetchrow(
                        "SELECT id, name FROM companies WHERE id = $1",
                        str(company_id)
                    )
                    if company_row:
                        user_data["organization"] = {
                            "id": str(company_row["id"]),
                            "name": company_row["name"]
                        }
            except Exception as e:
                print(f"Error fetching company name: {e}")
        
        return user_data
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"Get user error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Internal server error"
        )

@router.post("/logout", response_model=LogoutResponse)
async def logout(request: Request, response: Response):
    """User logout endpoint."""
    try:
        # Get session ID from cookie
        session_id = request.cookies.get("session_id")
        
        if session_id:
            await destroy_session(session_id)
        
        # Clear session cookie
        response.delete_cookie(key="session_id")
        
        return LogoutResponse(success=True, message="Logged out successfully")
        
    except Exception as e:
        print(f"Logout error: {e}")
        return LogoutResponse(success=False, message="Could not log out")

# Dependency for protected routes
async def get_current_user_dependency(request: Request) -> Dict[str, Any]:
    """Dependency to get current authenticated user for protected routes."""
    from urllib.parse import unquote
    
    # Get session ID from cookie or header
    # Node.js backend uses 'connect.sid' as the cookie name
    session_id = request.cookies.get("connect.sid") or request.cookies.get("session_id")
    
    if not session_id:
        # Try header as fallback
        auth_header = request.headers.get("authorization")
        if auth_header and auth_header.startswith("Bearer "):
            session_id = auth_header[7:]
    
    if not session_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required"
        )
    
    # URL-decode the cookie value (fixes %3A -> :)
    session_id = unquote(session_id)
    
    # Express-session signs cookies in the format "s:sessionId.signature"
    # We need to extract just the session ID part
    if session_id.startswith("s:"):
        session_id = session_id[2:].split(".")[0]
    
    # Get session data
    session_data = await get_session(session_id)
    if not session_data:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Session expired or invalid"
        )
    
    user_data = session_data["user_data"].copy()
    user_data.pop("password", None)
    
    # Add current_organization_id to user data for context switching
    current_org_id = session_data.get("current_organization_id")
    if current_org_id:
        user_data["currentOrganizationId"] = current_org_id
        user_data["current_organization_id"] = current_org_id
    
    return user_data

class SetOrganizationContextRequest(BaseModel):
    organization_id: Optional[str] = None  # None to clear context (show all)

@router.post("/set-organization-context")
async def set_organization_context(
    request_body: SetOrganizationContextRequest,
    request: Request,
    current_user: Dict[str, Any] = Depends(get_current_user_dependency)
):
    """Set organization context for root users (allows switching between organizations)."""
    try:
        # Only root users can switch organization context
        if not is_root_admin(current_user):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Only root administrators can switch organization context"
            )
        
        # Get session ID
        session_id = request.cookies.get("session_id")
        if not session_id:
            auth_header = request.headers.get("authorization")
            if auth_header and auth_header.startswith("Bearer "):
                session_id = auth_header[7:]
        
        if not session_id:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Session not found"
            )
        
        # Validate organization_id if provided
        org_id = request_body.organization_id
        if org_id:
            pool = await get_db_pool()
            async with pool.acquire() as conn:
                company = await conn.fetchrow(
                    "SELECT id, name FROM companies WHERE id = $1",
                    org_id
                )
                if not company:
                    raise HTTPException(
                        status_code=status.HTTP_404_NOT_FOUND,
                        detail="Organization not found"
                    )
        
        # Update session with new organization context
        session_data = await get_session(session_id)
        if not session_data:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Session expired or invalid"
            )
        
        # Update current_organization_id
        session_data["current_organization_id"] = org_id
        
        # Persist to database
        import json
        pool = await get_db_pool()
        async with pool.acquire() as conn:
            # Get existing session data
            row = await conn.fetchrow(
                "SELECT sess FROM sessions WHERE sid = $1",
                session_id
            )
            if row:
                existing_data = row["sess"]
                if isinstance(existing_data, str):
                    try:
                        existing_data = json.loads(existing_data)
                    except json.JSONDecodeError:
                        existing_data = {}
                
                # Update with new organization context
                existing_data["current_organization_id"] = org_id
                
                # Save back to database
                await conn.execute("""
                    UPDATE sessions 
                    SET sess = $1 
                    WHERE sid = $2
                """, json.dumps(existing_data), session_id)
        
        # Update memory cache
        session_store[session_id] = session_data
        
        return {
            "success": True,
            "message": f"Organization context {'set' if org_id else 'cleared'}",
            "current_organization_id": org_id
        }
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"Set organization context error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to set organization context"
        )

# Helper function to check if user is admin
def is_user_admin(user: Dict[str, Any]) -> bool:
    """Check if user has admin privileges."""
    # Check role first
    if user.get("role") == "admin":
        return True
    
    # Check if root user
    if is_root_admin(user):
        return True
    
    return False

def is_root_admin(user: Dict[str, Any]) -> bool:
    """Check if user is root admin.
    
    Checks in order:
    1. is_root field from database (preferred)
    2. id == "0" (backward compatibility)
    3. Root emails from environment variable (configurable)
    """
    # First check is_root field (preferred method)
    if user.get("is_root") is True:
        return True
    
    # Backward compatibility: check id
    if user.get("id") == "0":
        return True
    
    # Check against root user emails from environment variable
    # This will raise ValueError if ROOT_USER_EMAILS is not configured (fail-fast for security)
    user_email = user.get("email")
    if user_email:
        root_emails = settings.root_user_emails_list
        if user_email in root_emails:
            return True
    
    return False

def get_effective_company_id(user: Dict[str, Any]) -> Optional[str]:
    """Get the effective company_id for filtering queries.
    
    For root users with organization context set, returns current_organization_id.
    For root users without context, returns None (show all).
    For non-root users, returns their company_id.
    """
    if is_root_admin(user):
        # Root users can have organization context
        current_org_id = user.get("currentOrganizationId") or user.get("current_organization_id")
        return current_org_id  # None means show all
    else:
        # Non-root users are always scoped to their company
        return str(user.get("companyId") or user.get("company_id") or "")