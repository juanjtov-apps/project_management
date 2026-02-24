"""
Security middleware for Python FastAPI backend
Implements comprehensive security measures for Proesphere
"""
from fastapi import Request, HTTPException, status
from starlette.middleware.base import BaseHTTPMiddleware
from fastapi.responses import JSONResponse
import time
import re
import secrets
import hmac
import hashlib
from typing import Dict, Any, Optional
from collections import defaultdict
import ipaddress
import logging
import os

# Rate limiting storage
rate_limit_storage: Dict[str, Dict[str, Any]] = defaultdict(dict)

# CSRF token storage (in-memory, should use Redis in production)
csrf_tokens: Dict[str, Dict[str, Any]] = defaultdict(dict)

class SecurityMiddleware(BaseHTTPMiddleware):
    """Security middleware for FastAPI"""
    
    def __init__(self, app, rate_limit: int = 100, window_seconds: int = 900):
        super().__init__(app)
        self.rate_limit = rate_limit
        self.window_seconds = window_seconds
        self.logger = logging.getLogger(__name__)
    
    async def dispatch(self, request: Request, call_next):
        # Apply security headers
        response = await call_next(request)
        
        # Skip CSP for docs endpoints to allow Swagger UI to work
        if request.url.path in ["/docs", "/redoc", "/openapi.json"]:
            # Minimal security headers for docs
            response.headers["X-Content-Type-Options"] = "nosniff"
            return response
        
        # Security headers
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY" 
        response.headers["X-XSS-Protection"] = "1; mode=block"
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
        response.headers["Content-Security-Policy"] = (
            "default-src 'self'; "
            "script-src 'self' 'unsafe-inline' 'unsafe-eval'; "
            "style-src 'self' 'unsafe-inline'; "
            "img-src 'self' data: https:; "
            "font-src 'self' data:; "
            "connect-src 'self' http://localhost:8000 http://localhost:5000 http://127.0.0.1:8000 http://127.0.0.1:5000 https://*.replit.app https://*.replit.dev https://*.repl.co; "
            "frame-ancestors 'none';"
        )
        
        return response

class RateLimitMiddleware(BaseHTTPMiddleware):
    """Rate limiting middleware"""
    
    def __init__(self, app, rate_limit: int = 100, window_seconds: int = 900):
        super().__init__(app)
        self.rate_limit = rate_limit
        self.window_seconds = window_seconds
    
    async def dispatch(self, request: Request, call_next):
        client_ip = self._get_client_ip(request)
        current_time = time.time()
        
        # Bypass rate limiting for localhost/127.0.0.1 (development/testing)
        if client_ip in ["127.0.0.1", "localhost", "::1", "0.0.0.0"]:
            return await call_next(request)
        
        # Clean old entries
        self._clean_old_entries(current_time)
        
        # Check rate limit
        if self._is_rate_limited(client_ip, current_time):
            return JSONResponse(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                content={"detail": "Rate limit exceeded. Please try again later."}
            )
        
        # Record request
        self._record_request(client_ip, current_time)
        
        return await call_next(request)
    
    def _get_client_ip(self, request: Request) -> str:
        """Extract client IP address"""
        # Check for forwarded headers
        forwarded = request.headers.get("X-Forwarded-For")
        if forwarded:
            return forwarded.split(",")[0].strip()
        
        real_ip = request.headers.get("X-Real-IP")
        if real_ip:
            return real_ip
        
        # Fallback to request client
        return str(request.client.host) if request.client else "unknown"
    
    def _clean_old_entries(self, current_time: float):
        """Clean expired rate limit entries"""
        cutoff_time = current_time - self.window_seconds
        expired_ips = []
        
        for ip, data in rate_limit_storage.items():
            if data.get("last_request", 0) < cutoff_time:
                expired_ips.append(ip)
        
        for ip in expired_ips:
            del rate_limit_storage[ip]
    
    def _is_rate_limited(self, client_ip: str, current_time: float) -> bool:
        """Check if client is rate limited"""
        if client_ip not in rate_limit_storage:
            return False
        
        data = rate_limit_storage[client_ip]
        window_start = current_time - self.window_seconds
        
        # Count requests in current window
        requests = [req_time for req_time in data.get("requests", []) if req_time > window_start]
        
        return len(requests) >= self.rate_limit
    
    def _record_request(self, client_ip: str, current_time: float):
        """Record a request for rate limiting"""
        if client_ip not in rate_limit_storage:
            rate_limit_storage[client_ip] = {"requests": [], "last_request": current_time}
        
        data = rate_limit_storage[client_ip]
        data["requests"].append(current_time)
        data["last_request"] = current_time
        
        # Keep only requests within the window
        window_start = current_time - self.window_seconds
        data["requests"] = [req_time for req_time in data["requests"] if req_time > window_start]

def generate_csrf_token() -> str:
    """Generate a secure CSRF token."""
    return secrets.token_urlsafe(32)

def verify_csrf_token(token: str, session_id: str) -> bool:
    """Verify CSRF token is valid for the given session."""
    if not token or not session_id:
        return False
    
    # Check if token exists for this session
    session_tokens = csrf_tokens.get(session_id, {})
    if token not in session_tokens:
        return False
    
    token_data = session_tokens[token]
    current_time = time.time()
    
    # Check if token has expired (15 minutes)
    if current_time - token_data["created_at"] > 900:
        del session_tokens[token]
        return False
    
    return True

def store_csrf_token(session_id: str, token: str):
    """Store CSRF token for a session."""
    if session_id not in csrf_tokens:
        csrf_tokens[session_id] = {}
    
    current_time = time.time()
    csrf_tokens[session_id][token] = {
        "created_at": current_time,
        "token": token
    }
    
    # Clean old tokens (keep only last 10 per session)
    tokens = list(csrf_tokens[session_id].items())
    if len(tokens) > 10:
        tokens.sort(key=lambda x: x[1]["created_at"])
        for old_token, _ in tokens[:-10]:
            del csrf_tokens[session_id][old_token]

def clear_csrf_tokens(session_id: str):
    """Clear all CSRF tokens for a session (called on logout)."""
    if session_id in csrf_tokens:
        del csrf_tokens[session_id]

async def validate_origin(request: Request) -> bool:
    """Validate request origin for CSRF protection."""
    # Skip validation for safe methods
    if request.method in ["GET", "HEAD", "OPTIONS"]:
        return True
    
    # Skip validation for public endpoints
    public_paths = ["/api/v1/auth/login", "/api/v1/auth/logout", "/api/waitlist", "/api/v1/onboarding/verify-magic-link", "/api/v1/onboarding/request-magic-link", "/health", "/docs", "/redoc", "/openapi.json"]
    if any(request.url.path.startswith(path) for path in public_paths):
        return True
    
    # Get origin and referer
    origin = request.headers.get("origin")
    referer = request.headers.get("referer")
    host = request.headers.get("host")
    
    # In development, allow localhost origins
    is_production = os.getenv("NODE_ENV") == "production" or os.getenv("REPLIT_DEPLOYMENT")
    
    if not is_production:
        # Development: allow localhost and 127.0.0.1
        allowed_origins = [
            "http://localhost:5000",
            "http://localhost:8000",
            "http://127.0.0.1:5000",
            "http://127.0.0.1:8000",
        ]
        if origin in allowed_origins:
            return True
        if referer and any(allowed in referer for allowed in allowed_origins):
            return True
    else:
        # Production: validate origin matches allowed domains
        # These are the allowed production domains for CSRF validation
        allowed_domains = [
            "proesphere.com",
            "www.proesphere.com",
        ]

        # Also check X-Forwarded-Host header (set by proxy/load balancer)
        forwarded_host = request.headers.get("x-forwarded-host", "")

        if origin:
            try:
                from urllib.parse import urlparse
                origin_host = urlparse(origin).netloc
                # Check against allowed domains list
                if origin_host in allowed_domains or any(origin_host.endswith(f".{d}") for d in allowed_domains):
                    return True
                # Check against X-Forwarded-Host (for proxy environments)
                if forwarded_host and origin_host == forwarded_host:
                    return True
            except Exception:
                pass

        if referer:
            try:
                from urllib.parse import urlparse
                referer_host = urlparse(referer).netloc
                # Check against allowed domains list
                if referer_host in allowed_domains or any(referer_host.endswith(f".{d}") for d in allowed_domains):
                    return True
                # Check against X-Forwarded-Host (for proxy environments)
                if forwarded_host and referer_host == forwarded_host:
                    return True
            except Exception:
                pass
    
    # CSRF token validation (preferred method)
    csrf_token = request.headers.get("X-CSRF-Token") or request.headers.get("X-CSRFToken")
    session_id = request.cookies.get("session_id")
    
    if csrf_token and session_id:
        if verify_csrf_token(csrf_token, session_id):
            return True
    
    # If no valid origin/referer and no valid CSRF token, reject
    return False

class CSRFProtectionMiddleware(BaseHTTPMiddleware):
    """CSRF protection middleware"""
    
    async def dispatch(self, request: Request, call_next):
        # Skip CSRF for safe methods and public endpoints
        if request.method in ["GET", "HEAD", "OPTIONS"]:
            return await call_next(request)
        
        # Public endpoints that don't need CSRF protection
        public_paths = [
            "/api/v1/auth/login",
            "/api/v1/auth/logout",
            "/api/auth/login",
            "/api/auth/logout",
            "/api/waitlist",
            "/api/v1/waitlist",
            "/api/v1/onboarding/verify-magic-link",
            "/api/v1/onboarding/request-magic-link",
            "/health",
            "/docs",
            "/redoc",
            "/openapi.json"
        ]
        if any(request.url.path.startswith(path) for path in public_paths):
            return await call_next(request)
        
        # Validate origin/CSRF token
        is_valid = await validate_origin(request)
        if not is_valid:
            return JSONResponse(
                status_code=status.HTTP_403_FORBIDDEN,
                content={"detail": "CSRF validation failed. Invalid origin or missing CSRF token."}
            )
        
        return await call_next(request)

def setup_security_middleware(app):
    """Setup all security middleware for the FastAPI app"""
    # Add CSRF protection middleware first (before other middleware)
    app.add_middleware(CSRFProtectionMiddleware)
    
    # Add security headers middleware
    app.add_middleware(SecurityMiddleware)
    
    # Add rate limiting middleware
    app.add_middleware(RateLimitMiddleware, rate_limit=100, window_seconds=900)
    
    # Add stricter rate limiting for auth endpoints
    # This would need to be implemented at the route level for specific endpoints