"""
Data conversion utilities for camelCase/snake_case transformation.
"""
import re
from typing import Dict, Any, List, Union


def to_camel_case(data: Union[Dict[str, Any], str]) -> Union[Dict[str, Any], str]:
    """Convert snake_case to camelCase."""
    if isinstance(data, str):
        components = data.split('_')
        return components[0] + ''.join(word.capitalize() for word in components[1:])
    
    if isinstance(data, dict):
        converted = {}
        for key, value in data.items():
            camel_key = to_camel_case(key) if isinstance(key, str) else key
            if isinstance(value, dict):
                converted[camel_key] = to_camel_case(value)
            elif isinstance(value, list):
                converted[camel_key] = [to_camel_case(item) if isinstance(item, dict) else item for item in value]
            else:
                converted[camel_key] = value
        return converted
    
    return data


def to_snake_case(data: Union[Dict[str, Any], str]) -> Union[Dict[str, Any], str]:
    """Convert camelCase to snake_case."""
    if isinstance(data, str):
        # Insert underscore before uppercase letters (except at start)
        s1 = re.sub('([a-z0-9])([A-Z])', r'\1_\2', data)
        return s1.lower()
    
    if isinstance(data, dict):
        converted = {}
        for key, value in data.items():
            snake_key = to_snake_case(key) if isinstance(key, str) else key
            if isinstance(value, dict):
                converted[snake_key] = to_snake_case(value)
            elif isinstance(value, list):
                converted[snake_key] = [to_snake_case(item) if isinstance(item, dict) else item for item in value]
            else:
                converted[snake_key] = value
        return converted
    
    return data


def convert_response_to_camel_case(data: Any) -> Any:
    """Convert API response data to camelCase for frontend compatibility."""
    if isinstance(data, dict):
        return to_camel_case(data)
    elif isinstance(data, list):
        return [to_camel_case(item) if isinstance(item, dict) else item for item in data]
    return data


def convert_request_to_snake_case(data: Any) -> Any:
    """Convert API request data from camelCase to snake_case for database operations."""
    if isinstance(data, dict):
        return to_snake_case(data)
    elif isinstance(data, list):
        return [to_snake_case(item) if isinstance(item, dict) else item for item in data]
    return data