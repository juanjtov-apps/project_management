"""
Enhanced email validation.
"""
import re
from typing import Any
from pydantic import EmailStr, validator


def validate_email_format(email: str) -> str:
    """
    Enhanced email validation beyond basic EmailStr.
    Checks for:
    - Valid format
    - Reasonable length
    - No dangerous patterns
    """
    if not isinstance(email, str):
        raise ValueError("Email must be a string")
    
    # Basic email pattern
    email_pattern = re.compile(
        r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
    )
    
    if not email_pattern.match(email):
        raise ValueError("Invalid email format")
    
    # Check length (RFC 5321 limit is 320 characters)
    if len(email) > 320:
        raise ValueError("Email address is too long")
    
    # Check for dangerous patterns
    dangerous_patterns = [
        r'<script',
        r'javascript:',
        r'on\w+\s*=',
    ]
    
    email_lower = email.lower()
    for pattern in dangerous_patterns:
        if re.search(pattern, email_lower):
            raise ValueError("Email contains potentially dangerous content")
    
    return email.lower().strip()

