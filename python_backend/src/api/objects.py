"""
Object storage API endpoints for serving images from Google Cloud Storage.

Supports multi-environment operation:
- Development: Uses GCP SDK directly → dev bucket
- Production (Replit): Uses sidecar → prod bucket
"""
import uuid
from typing import Dict, Any
from fastapi import APIRouter, HTTPException, status, Depends
from fastapi.responses import RedirectResponse
from pydantic import BaseModel

from ..core.config import settings
from ..core.storage import (
    get_storage_config as _get_storage_config,
    generate_signed_url,
    get_object_path,
)
from .auth import get_current_user_dependency

router = APIRouter(prefix="/objects", tags=["objects"])


def get_storage_config():
    """Get object storage configuration based on current environment.

    Raises HTTPException if storage is not configured.
    """
    try:
        return _get_storage_config()
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )

@router.get("/image/{object_id}")
async def get_object_image(object_id: str):
    """Get an image from object storage by object ID (generates GCS signed URL)."""
    try:
        # Get storage configuration
        config = get_storage_config()
        bucket_id = config["bucket_id"]
        clean_private_dir = config["clean_private_dir"]

        if not bucket_id:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Object storage bucket not configured."
            )

        # Construct the object path
        object_path = get_object_path(object_id, clean_private_dir)

        # Generate signed URL (uses GCP SDK in dev, sidecar in prod)
        signed_url = await generate_signed_url(bucket_id, object_path, method="GET", expires_minutes=60)

        if signed_url:
            return RedirectResponse(url=signed_url, status_code=302)
        else:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Object not found in GCS bucket: {object_id}"
            )

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to serve object from GCS: {str(e)}"
        )

class DownloadRequest(BaseModel):
    filePath: str


@router.post("/upload")
async def get_upload_url(
    current_user: Dict[str, Any] = Depends(get_current_user_dependency)
):
    """Get signed URLs for upload and preview, plus the object path for storage.

    Requires authentication to prevent unauthorized file uploads.
    """
    try:
        config = get_storage_config()
        bucket_id = config["bucket_id"]
        clean_private_dir = config["clean_private_dir"]

        if not bucket_id:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Object storage not configured"
            )

        # Generate a unique object ID
        object_id = str(uuid.uuid4())
        object_path = get_object_path(object_id, clean_private_dir)

        # Generate signed URL for PUT (upload) - 15 min expiry
        upload_url = await generate_signed_url(bucket_id, object_path, method="PUT", expires_minutes=15)

        # Generate signed URL for GET (preview) - 60 min expiry
        preview_url = await generate_signed_url(bucket_id, object_path, method="GET", expires_minutes=60)

        if upload_url and preview_url:
            return {
                "uploadURL": upload_url,
                "previewURL": preview_url,
                "objectPath": object_path
            }
        else:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to generate upload URLs"
            )

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to get upload URL"
        )


@router.post("/download")
async def get_download_url(request: DownloadRequest):
    """Get a signed download URL for object storage."""
    try:
        config = get_storage_config()
        bucket_id = config["bucket_id"]
        clean_private_dir = config["clean_private_dir"]

        if not bucket_id:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Object storage not configured"
            )

        file_path = request.filePath

        # Normalize file path: remove leading slashes and bucket prefix if present
        normalized_path = file_path.lstrip('/')
        if normalized_path.startswith(f"{bucket_id}/"):
            normalized_path = normalized_path[len(bucket_id) + 1:]

        # If path is just a filename (UUID), construct full object path
        if '/' not in normalized_path:
            object_path = get_object_path(normalized_path, clean_private_dir)
        else:
            object_path = normalized_path

        # Generate signed URL for GET (download)
        download_url = await generate_signed_url(bucket_id, object_path, method="GET", expires_minutes=15)

        if download_url:
            return {"downloadURL": download_url}
        else:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to generate download URL"
            )

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to get download URL"
        )