"""
Company filtering utilities for consistent data scoping across endpoints.
Ensures all users can only access data from their company unless they are root admins.
"""
from typing import Optional, Dict, Any
from ..api.auth import is_root_admin, get_effective_company_id


def get_user_company_id(user: Dict[str, Any]) -> Optional[str]:
    """
    Get the company_id that should be used for filtering queries.
    
    Returns:
        - For root admins: None (no filtering, can see all)
        - For root admins with organization context: current_organization_id
        - For regular users: their company_id
        - For users without company: None (will return empty results)
    """
    if is_root_admin(user):
        # Root users can have organization context
        current_org_id = user.get("currentOrganizationId") or user.get("current_organization_id")
        return current_org_id  # None means show all
    else:
        # Non-root users are always scoped to their company
        company_id = user.get("companyId") or user.get("company_id")
        return str(company_id) if company_id else None


def verify_company_access(
    user: Dict[str, Any],
    resource_company_id: Optional[str],
    resource_name: str = "resource"
) -> bool:
    """
    Verify that a user has access to a resource based on company_id.
    
    Args:
        user: Current user dictionary
        resource_company_id: Company ID of the resource being accessed
        resource_name: Name of the resource (for error messages)
    
    Returns:
        True if user has access, False otherwise
    
    Raises:
        HTTPException(403) if access is denied
    """
    from fastapi import HTTPException, status
    
    # Root admins always have access
    if is_root_admin(user):
        return True
    
    # Get user's company_id
    user_company_id = get_user_company_id(user)
    
    # If user has no company_id, deny access
    if not user_company_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Access denied: User is not assigned to a company"
        )
    
    # If resource has no company_id, deny access (shouldn't happen in normal operation)
    if not resource_company_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Access denied: {resource_name} does not belong to your company"
        )
    
    # Check if company_ids match
    if str(resource_company_id) != str(user_company_id):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Access denied: {resource_name} belongs to a different company"
        )
    
    return True


def build_company_filter_query(
    user: Dict[str, Any],
    base_query: str,
    company_id_column: str = "company_id",
    param_index: int = 1
) -> tuple[str, list]:
    """
    Build a SQL query with company_id filtering applied.
    
    Args:
        user: Current user dictionary
        base_query: Base SQL query (should end with WHERE clause or have WHERE 1=1)
        company_id_column: Name of the company_id column in the table
        param_index: Starting parameter index for the query
    
    Returns:
        Tuple of (modified_query, params_list)
    """
    user_company_id = get_user_company_id(user)
    
    # Root admins see all (no filter)
    if user_company_id is None and is_root_admin(user):
        return base_query, []
    
    # Add company_id filter
    if "WHERE" in base_query.upper():
        query = f"{base_query} AND {company_id_column} = ${param_index}"
    else:
        query = f"{base_query} WHERE {company_id_column} = ${param_index}"
    
    return query, [user_company_id]

