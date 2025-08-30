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
import os

router = APIRouter(prefix="/auth", tags=["auth"])

# Session configuration
SESSION_TTL = 7 * 24 * 60 * 60  # 1 week in seconds
SESSION_SECRET = os.getenv("SESSION_SECRET", "default-secret-key")

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
    """Get navigation permissions for the user."""
    permissions = {
        "canAccessDashboard": True,
        "canAccessProjects": True,
        "canAccessTasks": True,
        "canAccessPhotos": True,
        "canAccessSchedule": True,
        "canAccessUsers": False,
        "canAccessRBAC": False,
        "canAccessReports": False,
        "canAccessSettings": False
    }
    
    if is_root_admin or role in ['admin', 'manager']:
        permissions.update({
            "canAccessUsers": True,
            "canAccessRBAC": True,
            "canAccessReports": True,
            "canAccessSettings": True
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
        session_data = json.dumps(serializable_data)
        await conn.execute("""
            INSERT INTO sessions (sid, sess, expire)
            VALUES ($1, $2, $3)
            ON CONFLICT (sid) DO UPDATE SET
                sess = EXCLUDED.sess,
                expire = EXCLUDED.expire
        """, session_id, session_data, expires_at)
    
    # Store session data in memory for quick access
    session_store[session_id] = {
        "userId": user_id,
        "expires_at": expires_at,
        "user_data": user_data
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
    
    # Check database
    pool = await get_db_pool()
    async with pool.acquire() as conn:
        row = await conn.fetchrow("""
            SELECT data, expire FROM sessions 
            WHERE sess = $1 AND expire > NOW()
        """, session_id)
        
        if row:
            # Parse JSON data - it's stored as {"userId": "..."}
            import json
            try:
                data = json.loads(row["data"])
                user_id = data.get("userId")
                if user_id:
                    # Get fresh user data
                    user_row = await conn.fetchrow("""
                        SELECT * FROM users WHERE id = $1
                    """, user_id)
                    
                    if user_row:
                        user_data = dict(user_row)
                        session_data = {
                            "userId": user_id,
                            "expires_at": row["expire"],
                            "user_data": user_data
                        }
                        # Cache in memory
                        session_store[session_id] = session_data
                        return session_data
            except json.JSONDecodeError:
                pass
    
    return None

async def destroy_session(session_id: str):
    """Destroy a session."""
    # Remove from memory
    if session_id in session_store:
        del session_store[session_id]
    
    # Remove from database
    pool = await get_db_pool()
    async with pool.acquire() as conn:
        await conn.execute("DELETE FROM sessions WHERE sess = $1", session_id)

@router.post("/login", response_model=LoginResponse)
async def login(request: LoginRequest, response: Response):
    """User login endpoint."""
    try:
        pool = await get_db_pool()
        async with pool.acquire() as conn:
            # Get user by email
            user_row = await conn.fetchrow("""
                SELECT * FROM users WHERE email = $1
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
            
            # Set session cookie
            response.set_cookie(
                key="session_id",
                value=session_id,
                max_age=SESSION_TTL,
                httponly=True,
                secure=False,  # Set to True in production with HTTPS
                samesite="lax"
            )
            
            # Remove password from response
            user_data.pop("password", None)
            
            # Add navigation permissions
            is_root_admin = (user_data.get("id") == "0" or 
                           user_data.get("email") == "chacjjlegacy@proesphera.com" or
                           user_data.get("email") == "admin@proesphere.com")
            
            permissions = get_navigation_permissions(user_data.get("role", "user"), is_root_admin)
            user_data["permissions"] = permissions
            user_data["isRootAdmin"] = is_root_admin
            
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
        
        # Add navigation permissions
        is_root_admin = (user_data.get("id") == "0" or 
                        user_data.get("email") == "chacjjlegacy@proesphera.com" or
                        user_data.get("email") == "admin@proesphere.com")
        
        permissions = get_navigation_permissions(user_data.get("role", "user"), is_root_admin)
        user_data["permissions"] = permissions
        user_data["isRootAdmin"] = is_root_admin
        
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
            detail="Authentication required"
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
    
    return user_data

# Helper function to check if user is admin
def is_user_admin(user: Dict[str, Any]) -> bool:
    """Check if user has admin privileges."""
    return (user.get("role") == "admin" or 
            user.get("email") == "chacjjlegacy@proesphera.com" or
            user.get("email") == "admin@proesphere.com" or
            user.get("id") == "0")

def is_root_admin(user: Dict[str, Any]) -> bool:
    """Check if user is root admin."""
    return (user.get("id") == "0" or 
            user.get("email") == "chacjjlegacy@proesphera.com" or
            user.get("email") == "admin@proesphere.com")