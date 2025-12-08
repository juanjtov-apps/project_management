"""
String validation and sanitization validators.
Prevents XSS, SQL injection, and ensures data integrity.
"""
import re
from typing import Any
from pydantic import validator
from fastapi import HTTPException, status


def sanitize_string(value: str) -> str:
    """
    Sanitize string input to prevent XSS attacks.
    Removes potentially dangerous HTML/JavaScript patterns.
    """
    if not isinstance(value, str):
        return value
    
    # Remove script tags
    value = re.sub(r'<script[^>]*>.*?</script>', '', value, flags=re.IGNORECASE | re.DOTALL)
    
    # Remove iframe tags
    value = re.sub(r'<iframe[^>]*>.*?</iframe>', '', value, flags=re.IGNORECASE | re.DOTALL)
    
    # Remove object/embed tags
    value = re.sub(r'<object[^>]*>.*?</object>', '', value, flags=re.IGNORECASE | re.DOTALL)
    value = re.sub(r'<embed[^>]*>', '', value, flags=re.IGNORECASE)
    
    # Remove javascript: protocol
    value = re.sub(r'javascript:', '', value, flags=re.IGNORECASE)
    
    # Remove event handlers (onclick, onerror, etc.)
    value = re.sub(r'on\w+\s*=', '', value, flags=re.IGNORECASE)
    
    # Remove data: URLs that could be used for XSS
    value = re.sub(r'data:text/html[^,]*', '', value, flags=re.IGNORECASE)
    
    return value.strip()


def validate_no_xss(value: Any) -> str:
    """
    Validate that string doesn't contain XSS patterns.
    Raises validation error if dangerous patterns are found.
    """
    if not isinstance(value, str):
        return value
    
    # Check for dangerous patterns
    dangerous_patterns = [
        r'<script',
        r'javascript:',
        r'on\w+\s*=',
        r'<iframe',
        r'<object',
        r'<embed',
        r'data:text/html',
    ]
    
    value_lower = value.lower()
    for pattern in dangerous_patterns:
        if re.search(pattern, value_lower):
            raise ValueError(f"Input contains potentially dangerous content: {pattern}")
    
    return sanitize_string(value)


def validate_no_sql_injection(value: Any) -> str:
    """
    Validate that string doesn't contain SQL injection patterns.
    Note: This is a secondary check - parameterized queries are the primary defense.
    """
    if not isinstance(value, str):
        return value
    
    # SQL injection patterns to detect
    sql_patterns = [
        r"('|(\\')|(;)|(\\;)|(--)|(\\--)|(/\*)|(\\/\*)|(\*/)|(\\\*/))",
        r'\b(union|select|insert|update|delete|drop|alter|create|exec|execute)\b',
        r'(\bor\b\s*\d+\s*=\s*\d+)',  # OR 1=1
        r'(\band\b\s*\d+\s*=\s*\d+)',  # AND 1=1
    ]
    
    value_lower = value.lower()
    for pattern in sql_patterns:
        if re.search(pattern, value_lower, re.IGNORECASE):
            raise ValueError("Input contains potentially dangerous SQL patterns")
    
    return value


def validate_name(value: Any, field_name: str = "name") -> str:
    """
    Validate name fields (first_name, last_name, username).
    Ensures reasonable length and format.
    """
    if value is None:
        return value
    
    if not isinstance(value, str):
        raise ValueError(f"{field_name} must be a string")
    
    # Sanitize
    value = sanitize_string(value)
    
    # Check length
    if len(value) < 1:
        raise ValueError(f"{field_name} cannot be empty")
    if len(value) > 100:
        raise ValueError(f"{field_name} must be 100 characters or less")
    
    # Check for only whitespace
    if not value.strip():
        raise ValueError(f"{field_name} cannot be only whitespace")
    
    # Check for reasonable characters (allow unicode letters, spaces, hyphens, apostrophes, periods)
    # Use Unicode character properties to support international names (e.g., é, ñ, ü)
    if not re.match(r'^[\w\s\-\'\.]+$', value, re.UNICODE):
        raise ValueError(f"{field_name} contains invalid characters")
    
    return value.strip()


def validate_company_name(value: Any) -> str:
    """
    Validate company name.
    Allows more characters than personal names (numbers, special chars for business names).
    """
    if value is None:
        return value
    
    if not isinstance(value, str):
        raise ValueError("Company name must be a string")
    
    # Sanitize
    value = sanitize_string(value)
    
    # Check length
    if len(value) < 1:
        raise ValueError("Company name cannot be empty")
    if len(value) > 200:
        raise ValueError("Company name must be 200 characters or less")
    
    # Check for only whitespace
    if not value.strip():
        raise ValueError("Company name cannot be only whitespace")
    
    return value.strip()


def validate_url(value: Any) -> str:
    """
    Validate URL format.
    """
    if value is None:
        return value
    
    if not isinstance(value, str):
        raise ValueError("URL must be a string")
    
    # Sanitize
    value = sanitize_string(value)
    
    # Basic URL pattern
    url_pattern = re.compile(
        r'^https?://'  # http:// or https://
        r'(?:(?:[A-Z0-9](?:[A-Z0-9-]{0,61}[A-Z0-9])?\.)+[A-Z]{2,6}\.?|'  # domain...
        r'localhost|'  # localhost...
        r'\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})'  # ...or ip
        r'(?::\d+)?'  # optional port
        r'(?:/?|[/?]\S+)$', re.IGNORECASE
    )
    
    if not url_pattern.match(value):
        raise ValueError("Invalid URL format")
    
    return value


def validate_phone(value: Any) -> str:
    """
    Validate phone number format.
    Accepts various formats and normalizes.
    """
    if value is None:
        return value
    
    if not isinstance(value, str):
        raise ValueError("Phone number must be a string")
    
    # Remove common formatting characters
    cleaned = re.sub(r'[\s\-\(\)\.]', '', value)
    
    # Check if it's all digits (with optional + prefix)
    if cleaned.startswith('+'):
        cleaned = cleaned[1:]
    
    if not cleaned.isdigit():
        raise ValueError("Phone number must contain only digits and formatting characters")
    
    # Check reasonable length (7-15 digits is standard)
    if len(cleaned) < 7 or len(cleaned) > 15:
        raise ValueError("Phone number must be between 7 and 15 digits")
    
    return value.strip()


def validate_text_length(value: Any, max_length: int = 5000, field_name: str = "text") -> str:
    """
    Validate text length for descriptions, messages, etc.
    """
    if value is None:
        return value
    
    if not isinstance(value, str):
        raise ValueError(f"{field_name} must be a string")
    
    # Sanitize
    value = sanitize_string(value)
    
    if len(value) > max_length:
        raise ValueError(f"{field_name} must be {max_length} characters or less")
    
    return value


# Pydantic validators for use in models
def string_validator(field_name: str = "field", max_length: int = None):
    """
    Create a Pydantic validator for string fields.
    """
    def validator_func(cls, v):
        if v is None:
            return v
        if not isinstance(v, str):
            raise ValueError(f"{field_name} must be a string")
        
        # Sanitize
        v = sanitize_string(v)
        
        # Check for XSS
        validate_no_xss(v)
        
        # Check length if specified
        if max_length and len(v) > max_length:
            raise ValueError(f"{field_name} must be {max_length} characters or less")
        
        return v.strip() if isinstance(v, str) else v
    
    return validator(field_name, pre=True)(validator_func)

