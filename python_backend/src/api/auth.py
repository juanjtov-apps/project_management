"""
Authentication API endpoints for Proesphere.
Handles login, logout, and session management with company-filtered access.
"""

from fastapi import APIRouter, HTTPException, status, Depends, Request, Response
from pydantic import BaseModel, EmailStr
from typing import Optional, Dict, Any
import bcrypt
import uuid
from datetime import datetime, timedelta, timezone
import asyncpg
import logging
from ..database.connection import get_db_pool
from ..models.user import User
from ..core.config import settings
from ..middleware.security import clear_csrf_tokens
import os
import json

logger = logging.getLogger(__name__)


def ensure_timezone_aware(dt: Optional[datetime]) -> Optional[datetime]:
    """Ensure datetime is timezone-aware (UTC).

    PostgreSQL returns timezone-naive datetimes from timestamp columns.
    This function normalizes them to timezone-aware for comparison with
    datetime.now(timezone.utc).
    """
    if dt is not None and dt.tzinfo is None:
        return dt.replace(tzinfo=timezone.utc)
    return dt


def to_naive_utc(dt: datetime) -> datetime:
    """Convert timezone-aware datetime to timezone-naive UTC.

    PostgreSQL 'timestamp without time zone' columns cannot accept
    timezone-aware datetimes. This function converts to naive UTC
    for database insertion while preserving the UTC time value.
    """
    if dt.tzinfo is not None:
        # Convert to UTC and remove timezone info
        utc_dt = dt.astimezone(timezone.utc)
        return utc_dt.replace(tzinfo=None)
    return dt


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

def get_session_secret() -> str:
    """Get session secret from environment variable.
    
    Raises ValueError in production if SESSION_SECRET is not set.
    In development, falls back to a default (not recommended).
    """
    secret = os.getenv("SESSION_SECRET")
    if secret:
        return secret
    
    # Check if we're in production
    node_env = os.getenv("NODE_ENV", "")
    replit_deployment = os.getenv("REPLIT_DEPLOYMENT", "")
    
    is_prod = node_env == "production" or bool(replit_deployment)
    
    if is_prod:
        raise ValueError(
            "SESSION_SECRET environment variable is required in production. "
            "Generate a secure secret with: openssl rand -hex 32"
        )
    
    # Development fallback (with warning)
    logger.warning("⚠️ SESSION_SECRET not set - using insecure default. Set SESSION_SECRET in production!")
    return "dev-only-insecure-default-change-in-production"

SESSION_SECRET = get_session_secret()

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

# Maximum number of sessions to keep in memory (LRU-style eviction)
MAX_SESSION_STORE_SIZE = 10000


def _cleanup_expired_sessions() -> int:
    """Remove expired sessions from the in-memory store. Returns count removed."""
    now = datetime.now(timezone.utc)
    expired_keys = [
        sid for sid, data in session_store.items()
        if now >= ensure_timezone_aware(data["expires_at"])
    ]
    for sid in expired_keys:
        del session_store[sid]
    return len(expired_keys)


async def start_session_cleanup_task():
    """Start a background task that periodically cleans up expired sessions."""
    import asyncio
    while True:
        await asyncio.sleep(300)  # Run every 5 minutes
        try:
            removed = _cleanup_expired_sessions()
            if removed > 0:
                logger.info(f"Session cleanup: removed {removed} expired sessions, {len(session_store)} remaining")
        except Exception as e:
            logger.error(f"Session cleanup error: {e}")

# Cache for roles table column info to avoid repeated schema queries
_roles_column_cache: Dict[str, Any] = {}

async def get_role_column_name(conn) -> str:
    """Get the correct column name for role name in the roles table.
    
    Handles schema variations between 'role_name' and 'name' columns.
    Returns the column name to use in queries, or None if roles table doesn't exist.
    """
    if 'role_col' in _roles_column_cache:
        return _roles_column_cache['role_col']
    
    try:
        columns = await conn.fetch("""
            SELECT column_name
            FROM information_schema.columns
            WHERE table_name = 'roles'
        """)
        column_names = [col['column_name'] for col in columns] if columns else []
        
        if 'role_name' in column_names:
            _roles_column_cache['role_col'] = 'role_name'
        elif 'name' in column_names:
            _roles_column_cache['role_col'] = 'name'
        else:
            _roles_column_cache['role_col'] = None
        
        return _roles_column_cache['role_col']
    except Exception as e:
        logger.warning(f"Error detecting role column: {e}")
        return None

def get_navigation_permissions(role: str, is_root_admin: bool) -> Dict[str, bool]:
    """Get navigation permissions for the user matching frontend sidebar expectations."""
    # Normalize role to lowercase for case-insensitive comparison
    # (Database may store "Client", "Company Administrator", etc.)
    role = (role or '').strip().lower()

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
        "clientPortalPayments": False,
        "subPortal": False  # Subcontractor portal access
    }
    
    # Client Portal access for managers, project_managers, office_managers and admins
    # They get all tabs EXCEPT payments (which is admin-only, except office_manager)
    if role in ['admin', 'manager', 'project_manager', 'office_manager']:
        permissions.update({
            "crew": True,
            "subs": True,
            "clientPortal": True
        })

    # Office managers get payments access (they need to upload invoices)
    if role == 'office_manager':
        permissions["clientPortalPayments"] = True

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
        # Client users only see the client portal - all other modules are hidden
        permissions.update({
            "dashboard": False,       # No dashboard access
            "projects": False,        # No project list access
            "tasks": False,           # No tasks access
            "photos": False,          # Access photos via portal only
            "schedule": False,        # No schedule access
            "logs": False,            # No logs access
            "projectHealth": False,   # No project health access
            "crew": False,            # No crew management
            "subs": False,            # No subcontractor management
            "rbacAdmin": False,       # No RBAC admin
            "clientPortal": True,     # ONLY client portal is accessible
            "clientPortalPayments": True   # Clients can access payments to upload proofs
        })

    if role in ('subcontractor', 'contractor'):
        # Subcontractor users ONLY see the sub portal - all other modules are hidden
        permissions.update({
            "dashboard": False,
            "projects": False,
            "tasks": False,
            "photos": False,
            "schedule": False,
            "logs": False,
            "projectHealth": False,
            "crew": False,
            "subs": False,
            "rbacAdmin": False,
            "clientPortal": False,
            "clientPortalPayments": False,
            "subPortal": True,        # ONLY sub portal is accessible
        })

    return permissions


async def filter_permissions_by_company_modules(
    permissions: Dict[str, bool],
    company_id: str,
    is_root: bool,
    pool: asyncpg.Pool
) -> Dict[str, bool]:
    """
    Filter navigation permissions based on company's enabled modules.
    Root users bypass this filter and see all modules.
    """
    # Root users see everything
    if is_root:
        return permissions

    if not company_id:
        return permissions

    try:
        async with pool.acquire() as conn:
            row = await conn.fetchrow(
                "SELECT settings FROM companies WHERE id = $1",
                str(company_id)
            )

            if not row or not row['settings']:
                return permissions

            settings = row['settings']
            if isinstance(settings, str):
                settings = json.loads(settings)

            enabled_modules = settings.get('enabledModules', {})

            # Filter permissions - if a module is disabled, set permission to False
            for module_key, is_enabled in enabled_modules.items():
                if module_key in permissions and not is_enabled:
                    permissions[module_key] = False

            return permissions

    except Exception as e:
        logger.warning(f"Error filtering permissions by company modules: {e}")
        return permissions


async def create_session(user_id: str, user_data: Dict[str, Any]) -> str:
    """Create a new session and store it in PostgreSQL."""
    session_id = str(uuid.uuid4())
    expires_at = datetime.now(timezone.utc) + timedelta(seconds=SESSION_TTL)

    # Ensure role is set from role_name for compatibility
    if 'role_name' in user_data and 'role' not in user_data:
        user_data['role'] = user_data['role_name']

    # Ensure both company_id and companyId are set
    if 'company_id' in user_data and 'companyId' not in user_data:
        user_data['companyId'] = user_data['company_id']
    elif 'companyId' in user_data and 'company_id' not in user_data:
        user_data['company_id'] = user_data['companyId']

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
        # Convert to naive UTC for 'timestamp without time zone' column
        expires_at_naive = to_naive_utc(expires_at)
        await conn.execute("""
            INSERT INTO sessions (sid, sess, expire)
            VALUES ($1, $2, $3)
            ON CONFLICT (sid) DO UPDATE SET
                sess = EXCLUDED.sess,
                expire = EXCLUDED.expire
        """, session_id, session_data, expires_at_naive)
    
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
        # Use ensure_timezone_aware for safe comparison (handles both tz-aware and tz-naive)
        if datetime.now(timezone.utc) < ensure_timezone_aware(session_data["expires_at"]):
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
                    # Dynamically detect role column name (handles both 'role_name' and 'name')
                    role_col = await get_role_column_name(conn)
                    if role_col:
                        query = f"""SELECT u.*, r.{role_col} as role_name
                           FROM users u
                           LEFT JOIN roles r ON u.role_id = r.id
                           WHERE u.id = $1"""
                    else:
                        query = """SELECT u.*, NULL as role_name
                           FROM users u
                           WHERE u.id = $1"""
                    
                    user_row = await conn.fetchrow(query, user_id)
                    if user_row:
                        user_data = dict(user_row)
                        # Ensure role is set from role_name for compatibility
                        if 'role_name' in user_data and 'role' not in user_data:
                            user_data['role'] = user_data['role_name']
                        # Initialize current_organization_id if not in session
                        current_org_id = data.get("current_organization_id")
                        if current_org_id is None:
                            # For non-root users, set to their company_id
                            if not is_root_admin(user_data):
                                current_org_id = str(user_data.get("company_id") or user_data.get("companyId") or "")
                        
                        session_data = {
                            "userId": user_id,
                            "expires_at": ensure_timezone_aware(row["expire"]),
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

    # Clear CSRF tokens for this session
    clear_csrf_tokens(session_id)

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
            # Dynamically detect role column name (handles both 'role_name' and 'name')
            role_col = await get_role_column_name(conn)
            if role_col:
                user_row = await conn.fetchrow(f"""
                    SELECT u.*, r.{role_col} as role_name
                    FROM users u
                    LEFT JOIN roles r ON u.role_id = r.id
                    WHERE u.email = $1
                """, request.email)
            else:
                user_row = await conn.fetchrow("""
                    SELECT u.*, NULL as role_name
                    FROM users u
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

            # Check if user is active
            if not user_data.get("is_active", True):
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Your account has been deactivated. Please contact your administrator."
                )

            # Create session
            session_id = await create_session(user_data["id"], user_data)
            
            # Generate CSRF token for this session
            from ..middleware.security import generate_csrf_token, store_csrf_token
            csrf_token = generate_csrf_token()
            store_csrf_token(session_id, csrf_token)
            
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
            
            # Add CSRF token to response headers for frontend
            response.headers["X-CSRF-Token"] = csrf_token
            
            # Remove password from response
            user_data.pop("password", None)
            
            # Convert company_id to companyId for frontend compatibility
            if 'company_id' in user_data:
                user_data['companyId'] = user_data['company_id']
            
            # Convert is_root to isRoot for frontend compatibility
            if 'is_root' in user_data:
                user_data['isRoot'] = user_data['is_root']

            # Convert assigned_project_id to assignedProjectId for frontend compatibility
            if 'assigned_project_id' in user_data:
                user_data['assignedProjectId'] = user_data['assigned_project_id']

            # Use role_name from roles table, fallback to text role for backward compatibility
            role_name = user_data.get("role_name") or user_data.get("role", "user")
            user_data["role"] = role_name  # Set role for backward compatibility

            # Add navigation permissions
            is_root = is_root_admin(user_data)

            permissions = get_navigation_permissions(role_name, is_root)

            # Filter permissions by company module settings
            company_id = user_data.get('company_id') or user_data.get('companyId')
            permissions = await filter_permissions_by_company_modules(
                permissions, company_id, is_root, pool
            )

            user_data["permissions"] = permissions
            user_data["isRootAdmin"] = is_root

            return LoginResponse(user=user_data, session_id=session_id)
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Login error: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Internal server error"
        )

@router.get("/user")
async def get_current_user(request: Request):
    """Get current authenticated user."""
    try:
        # Get session ID from cookie (unified session management)
        session_id = request.cookies.get("session_id")
        if not session_id:
            # Try header as fallback for API clients
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

        # Check if user is still active
        if not user_data.get("is_active", True):
            await destroy_session(session_id)
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Your account has been deactivated"
            )

        # Convert company_id to companyId for frontend compatibility
        if 'company_id' in user_data:
            user_data['companyId'] = user_data['company_id']

        # Convert is_root to isRoot for frontend compatibility
        if 'is_root' in user_data:
            user_data['isRoot'] = user_data['is_root']

        # Convert assigned_project_id to assignedProjectId for frontend compatibility
        if 'assigned_project_id' in user_data:
            user_data['assignedProjectId'] = user_data['assigned_project_id']

        # Use role_name from roles table, fallback to text role for backward compatibility
        role_name = user_data.get("role_name") or user_data.get("role", "user")
        user_data["role"] = role_name  # Set role for backward compatibility
        
        # Add navigation permissions
        is_root = is_root_admin(user_data)

        permissions = get_navigation_permissions(role_name, is_root)
        user_data["isRootAdmin"] = is_root

        # Add current_organization_id from session if available (already have session_data)
        if "current_organization_id" in session_data:
            current_org_id = session_data.get("current_organization_id")
            if current_org_id:
                user_data["currentOrganizationId"] = current_org_id
                user_data["current_organization_id"] = current_org_id

        # Fetch and add organization/company name, and filter permissions by company modules
        company_id = user_data.get('company_id') or user_data.get('companyId')
        if company_id:
            try:
                pool = await get_db_pool()

                # Filter permissions by company module settings
                permissions = await filter_permissions_by_company_modules(
                    permissions, company_id, is_root, pool
                )

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
                logger.warning(f"Error fetching company name: {e}")

        user_data["permissions"] = permissions
        
        return user_data
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Get user error: {e}", exc_info=True)
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
        logger.error(f"Logout error: {e}", exc_info=True)
        return LogoutResponse(success=False, message="Could not log out")

# Dependency for protected routes
async def get_current_user_dependency(request: Request) -> Dict[str, Any]:
    """Dependency to get current authenticated user for protected routes.
    
    Uses unified session management - only FastAPI session_id cookie is supported.
    """
    from urllib.parse import unquote
    
    # Get session ID from cookie (unified session management - only session_id)
    session_id = request.cookies.get("session_id")
    
    if not session_id:
        # Try header as fallback for API clients
        auth_header = request.headers.get("authorization")
        if auth_header and auth_header.startswith("Bearer "):
            session_id = auth_header[7:]
    
    if not session_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required"
        )
    
    # URL-decode the cookie value if needed
    session_id = unquote(session_id)
    
    # Get session data
    session_data = await get_session(session_id)
    if not session_data:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Session expired or invalid"
        )
    
    user_data = session_data["user_data"].copy()
    user_data.pop("password", None)

    # Check if user is still active
    if not user_data.get("is_active", True):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Your account has been deactivated"
        )

    # Ensure both snake_case and camelCase versions are present for compatibility
    if 'company_id' in user_data:
        user_data['companyId'] = user_data['company_id']
    elif 'companyId' in user_data:
        user_data['company_id'] = user_data['companyId']

    if 'is_root' in user_data:
        user_data['isRoot'] = user_data['is_root']

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
        logger.error(f"Set organization context error: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to set organization context"
        )

# Helper function to check if user is admin
def is_user_admin(user: Dict[str, Any]) -> bool:
    """Check if user has admin privileges."""
    # Check role - try both 'role' and 'role_name' for compatibility
    # Normalize to lowercase for case-insensitive comparison
    role = (user.get("role") or user.get("role_name") or "").lower()
    if role == "admin":
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
    # Check both snake_case and camelCase versions
    is_root_value = user.get("is_root") or user.get("isRoot")
    if is_root_value is True:
        return True

    # Backward compatibility: check id
    user_id = user.get("id")
    if user_id == "0":
        return True

    # Check against root user emails from environment variable
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
        company_id = user.get("companyId") or user.get("company_id")
        return str(company_id) if company_id else None