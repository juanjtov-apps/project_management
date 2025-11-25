"""
Invoices API endpoints for v1 API.
"""
from typing import List, Dict, Any, Optional
from fastapi import APIRouter, HTTPException, status, Depends, Query
from ...api.auth import get_current_user_dependency

router = APIRouter(prefix="/invoices", tags=["invoices"])


@router.get("", summary="Get all invoices")
async def get_invoices(
    project_id: Optional[str] = Query(None, alias="projectId"),
    current_user: Dict[str, Any] = Depends(get_current_user_dependency)
):
    """Get all invoices with company filtering."""
    try:
        # TODO: Implement invoices repository and business logic
        # For now, return empty array to prevent 502 errors
        return []
    except Exception as e:
        print(f"Error fetching invoices: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to fetch invoices"
        )


@router.post("", status_code=status.HTTP_201_CREATED, summary="Create invoice")
async def create_invoice(
    invoice_data: Dict[str, Any],
    current_user: Dict[str, Any] = Depends(get_current_user_dependency)
) -> Dict[str, Any]:
    """Create a new invoice."""
    try:
        # TODO: Implement invoices repository and business logic
        raise HTTPException(
            status_code=status.HTTP_501_NOT_IMPLEMENTED,
            detail="Invoices endpoint not yet implemented"
        )
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error creating invoice: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create invoice"
        )

