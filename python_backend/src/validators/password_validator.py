"""
Password validation and strength checking.
"""
import re
from typing import Any
from pydantic import validator


def validate_password_strength(password: str, min_length: int = 8) -> str:
    """
    Validate password strength.
    
    Requirements:
    - Minimum length (default 8)
    - At least one uppercase letter
    - At least one lowercase letter
    - At least one digit
    
    Returns the password if valid, raises ValueError otherwise.
    """
    if not isinstance(password, str):
        raise ValueError("Password must be a string")
    
    if len(password) < min_length:
        raise ValueError(f"Password must be at least {min_length} characters long")
    
    # Check for uppercase
    if not re.search(r'[A-Z]', password):
        raise ValueError("Password must contain at least one uppercase letter")
    
    # Check for lowercase
    if not re.search(r'[a-z]', password):
        raise ValueError("Password must contain at least one lowercase letter")
    
    # Check for digit
    if not re.search(r'\d', password):
        raise ValueError("Password must contain at least one digit")
    
    # Check for common weak passwords
    weak_passwords = [
        'password', 'password123', '12345678', 'qwerty', 'abc123',
        'letmein', 'welcome', 'admin', 'root'
    ]
    if password.lower() in weak_passwords:
        raise ValueError("Password is too common. Please choose a stronger password")
    
    return password


def password_validator(cls, v):
    """
    Pydantic validator for password fields.
    """
    if v is None:
        return v
    
    return validate_password_strength(v)

