"""
Object storage API endpoints for serving images from Google Cloud Storage.
"""
import os
import httpx
import json
import uuid
from datetime import datetime, timedelta
from fastapi import APIRouter, HTTPException, status, Depends
from fastapi.responses import RedirectResponse
from typing import Dict, Any
from pydantic import BaseModel

router = APIRouter(prefix="/objects", tags=["objects"])

def get_storage_config():
    """Get Replit object storage configuration."""
    bucket_id = os.getenv("DEFAULT_OBJECT_STORAGE_BUCKET_ID")
    private_dir = os.getenv("PRIVATE_OBJECT_DIR", "")
    # Use the hardcoded sidecar endpoint from Node.js implementation
    sidecar_endpoint = "http://127.0.0.1:1106"
    
    return {
        "bucket_id": bucket_id,
        "private_dir": private_dir,
        "sidecar_endpoint": sidecar_endpoint
    }

@router.get("/image/{object_id}")
async def get_object_image(object_id: str):
    """Get an image from object storage by object ID (generates GCS signed URL)."""
    try:
        print(f"🖼️ [GCS] Generating signed URL for object: {object_id}")
        
        # Get storage configuration
        config = get_storage_config()
        bucket_id = config["bucket_id"]
        private_dir = config["private_dir"]
        sidecar_endpoint = config["sidecar_endpoint"]
        
        if not all([bucket_id, sidecar_endpoint]):
            print(f"❌ [GCS] Storage config incomplete:")
            print(f"   - bucket_id: {bucket_id or 'MISSING'}")
            print(f"   - private_dir: {private_dir or 'MISSING'}")
            print(f"   - sidecar_endpoint: {sidecar_endpoint or 'MISSING'}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Object storage not configured. Check DEFAULT_OBJECT_STORAGE_BUCKET_ID environment variable."
            )
        
        # Construct the object path - handle both UUID and UUID.ext formats
        object_filename = object_id
        if not any(object_id.endswith(ext) for ext in ['.jpg', '.jpeg', '.png', '.gif', '.webp']):
            # No extension provided, try common image extensions
            print(f"🔍 [GCS] No extension in object_id, will try common extensions")
        
        # PRIVATE_OBJECT_DIR contains the full path like "/replit-objstore-.../. private"
        # We need to extract just the ".private" part for the object path
        # The object path in GCS should be: .private/uploads/{uuid}
        if private_dir:
            # Strip the bucket name prefix if present
            clean_private_dir = private_dir
            if bucket_id and private_dir.startswith(f"/{bucket_id}"):
                clean_private_dir = private_dir[len(f"/{bucket_id}"):]
            elif bucket_id and private_dir.startswith(bucket_id):
                clean_private_dir = private_dir[len(bucket_id):]
            clean_private_dir = clean_private_dir.lstrip('/')
            object_path = f"{clean_private_dir}/uploads/{object_filename}"
        else:
            # Fallback to default path
            object_path = f".private/uploads/{object_filename}"
        
        print(f"📂 [GCS] Bucket: {bucket_id}")
        print(f"📂 [GCS] Object path: {object_path}")
        
        # Create a signed URL for the object
        signed_url = await create_signed_url(bucket_id, object_path, sidecar_endpoint)
        
        if signed_url:
            print(f"✅ [GCS] Generated signed URL successfully")
            print(f"🔗 [GCS] URL: {signed_url[:100]}...")
            return RedirectResponse(url=signed_url, status_code=302)
        else:
            print(f"❌ [GCS] Failed to create signed URL for object: {object_id}")
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Object not found in GCS bucket: {object_id}"
            )
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ [GCS] Error serving object image {object_id}: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to serve object from GCS: {str(e)}"
        )

async def create_signed_url(bucket_name: str, object_name: str, sidecar_endpoint: str) -> str:
    """Create a signed URL for a Google Cloud Storage object."""
    try:
        print(f"🔐 Creating signed URL for bucket: {bucket_name}, object: {object_name}")
        
        # Create request for signed URL
        expires_at = (datetime.utcnow() + timedelta(hours=1)).isoformat() + "Z"
        request_data = {
            "bucket_name": bucket_name,
            "object_name": object_name,
            "method": "GET",
            "expires_at": expires_at
        }
        
        print(f"📤 Requesting signed URL with data: {request_data}")
        
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(
                f"{sidecar_endpoint}/object-storage/signed-object-url",
                headers={"Content-Type": "application/json"},
                json=request_data
            )
            
            print(f"📥 Sidecar response: {response.status_code}")
            
            if response.status_code == 200:
                result = response.json()
                signed_url = result.get("signed_url")
                if signed_url:
                    print(f"✅ Got signed URL: {signed_url[:100]}...")
                    return signed_url
                else:
                    print(f"❌ No signed_url in response: {result}")
                    return None
            else:
                print(f"❌ Sidecar error: {response.status_code} - {response.text}")
                return None
                
    except Exception as e:
        print(f"❌ Error creating signed URL: {e}")
        import traceback
        traceback.print_exc()
        return None

class DownloadRequest(BaseModel):
    filePath: str

@router.post("/upload")
async def get_upload_url():
    """Get a signed upload URL for object storage."""
    try:
        config = get_storage_config()
        bucket_id = config["bucket_id"]
        private_dir = config["private_dir"]
        sidecar_endpoint = config["sidecar_endpoint"]
        
        if not all([bucket_id, private_dir, sidecar_endpoint]):
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Object storage not configured"
            )
        
        # Generate a unique object ID
        object_id = str(uuid.uuid4())
        object_path = f"{private_dir}/uploads/{object_id}".lstrip('/')
        
        # Create signed URL for PUT (upload)
        expires_at = (datetime.utcnow() + timedelta(minutes=15)).isoformat() + "Z"
        request_data = {
            "bucket_name": bucket_id,
            "object_name": object_path,
            "method": "PUT",
            "expires_at": expires_at
        }
        
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(
                f"{sidecar_endpoint}/object-storage/signed-object-url",
                headers={"Content-Type": "application/json"},
                json=request_data
            )
            
            if response.status_code == 200:
                result = response.json()
                upload_url = result.get("signed_url")
                if upload_url:
                    return {"uploadURL": upload_url}
                else:
                    raise HTTPException(
                        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                        detail="Failed to get upload URL from sidecar"
                    )
            else:
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail=f"Sidecar error: {response.status_code}"
                )
                
    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ Error getting upload URL: {e}")
        import traceback
        traceback.print_exc()
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
        private_dir = config["private_dir"]
        sidecar_endpoint = config["sidecar_endpoint"]
        
        if not all([bucket_id, private_dir, sidecar_endpoint]):
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Object storage not configured"
            )
        
        file_path = request.filePath
        
        # Normalize file path: remove leading slashes and bucket prefix if present
        normalized_path = file_path.lstrip('/')
        if normalized_path.startswith(f"{bucket_id}/"):
            normalized_path = normalized_path[len(bucket_id) + 1:]
        
        # If path doesn't start with private_dir, prepend it
        if not normalized_path.startswith(private_dir.lstrip('/')):
            # Extract just the filename/relative path if it's a full path
            if '/' in normalized_path:
                # Assume it's already a full path within the bucket
                object_path = normalized_path
            else:
                # Just a filename, prepend private_dir/uploads
                object_path = f"{private_dir}/uploads/{normalized_path}".lstrip('/')
        else:
            object_path = normalized_path
        
        # Create signed URL for GET (download)
        expires_at = (datetime.utcnow() + timedelta(minutes=15)).isoformat() + "Z"
        request_data = {
            "bucket_name": bucket_id,
            "object_name": object_path,
            "method": "GET",
            "expires_at": expires_at
        }
        
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(
                f"{sidecar_endpoint}/object-storage/signed-object-url",
                headers={"Content-Type": "application/json"},
                json=request_data
            )
            
            if response.status_code == 200:
                result = response.json()
                download_url = result.get("signed_url")
                if download_url:
                    return {"downloadURL": download_url}
                else:
                    raise HTTPException(
                        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                        detail="Failed to get download URL from sidecar"
                    )
            else:
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail=f"Sidecar error: {response.status_code}"
                )
                
    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ Error getting download URL: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to get download URL"
        )