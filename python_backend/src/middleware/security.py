"""
Security middleware for Python FastAPI backend
Implements comprehensive security measures for Proesphere
"""
from fastapi import Request, HTTPException, status
from fastapi.middleware.base import BaseHTTPMiddleware
from fastapi.responses import JSONResponse
import time
import re
from typing import Dict, Any
from collections import defaultdict
import ipaddress
import logging

# Rate limiting storage
rate_limit_storage: Dict[str, Dict[str, Any]] = defaultdict(dict)

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
            "connect-src 'self'; "
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

def validate_input_data(data: Any) -> Any:
    """Sanitize input data to prevent XSS and injection attacks"""
    if isinstance(data, str):
        # Remove potential XSS patterns
        data = re.sub(r'<script[^>]*>.*?</script>', '', data, flags=re.IGNORECASE | re.DOTALL)
        data = re.sub(r'<iframe[^>]*>.*?</iframe>', '', data, flags=re.IGNORECASE | re.DOTALL)
        data = re.sub(r'<object[^>]*>.*?</object>', '', data, flags=re.IGNORECASE | re.DOTALL)
        data = re.sub(r'<embed[^>]*>', '', data, flags=re.IGNORECASE)
        data = re.sub(r'javascript:', '', data, flags=re.IGNORECASE)
        data = re.sub(r'on\w+\s*=', '', data, flags=re.IGNORECASE)
        
        # Basic SQL injection prevention (additional to parameterized queries)
        suspicious_patterns = [
            r'union\s+select', r'insert\s+into', r'delete\s+from',
            r'drop\s+table', r'alter\s+table', r'exec\s*\(',
            r'execute\s*\(', r'sp_executesql'
        ]
        
        for pattern in suspicious_patterns:
            if re.search(pattern, data, re.IGNORECASE):
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Invalid input detected"
                )
    
    elif isinstance(data, dict):
        return {key: validate_input_data(value) for key, value in data.items()}
    
    elif isinstance(data, list):
        return [validate_input_data(item) for item in data]
    
    return data

async def validate_origin(request: Request):
    """Validate request origin for CSRF protection"""
    origin = request.headers.get("origin")
    referer = request.headers.get("referer")
    
    # Allow requests without origin/referer for API testing
    if not origin and not referer:
        return True
    
    # Define allowed origins
    allowed_origins = [
        "http://localhost:5000",
        "http://localhost:3000",
        "https://replit.com",
    ]
    
    # Add Replit domains from environment
    import os
    replit_domains = os.getenv("REPLIT_DOMAINS", "").split(",")
    for domain in replit_domains:
        if domain.strip():
            allowed_origins.append(f"https://{domain.strip()}")
    
    # Check origin
    source = origin or referer
    if source:
        for allowed in allowed_origins:
            if source.startswith(allowed):
                return True
    
    raise HTTPException(
        status_code=status.HTTP_403_FORBIDDEN,
        detail="Invalid origin"
    )

def setup_security_middleware(app):
    """Setup all security middleware for the FastAPI app"""
    # Add security headers middleware
    app.add_middleware(SecurityMiddleware)
    
    # Add rate limiting middleware
    app.add_middleware(RateLimitMiddleware, rate_limit=100, window_seconds=900)
    
    # Add stricter rate limiting for auth endpoints
    # This would need to be implemented at the route level for specific endpoints