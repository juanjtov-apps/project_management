"""
Object storage API endpoints for serving images from Google Cloud Storage.
"""
import os
import httpx
import json
from datetime import datetime, timedelta
from fastapi import APIRouter, HTTPException, status
from fastapi.responses import RedirectResponse

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
    """Get an image from object storage by object ID."""
    try:
        print(f"🖼️ Serving object image: {object_id}")
        
        # Get storage configuration
        config = get_storage_config()
        bucket_id = config["bucket_id"]
        private_dir = config["private_dir"]
        sidecar_endpoint = config["sidecar_endpoint"]
        
        if not all([bucket_id, private_dir, sidecar_endpoint]):
            print(f"❌ Storage config incomplete: bucket={bucket_id}, dir={bool(private_dir)}, endpoint={bool(sidecar_endpoint)}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Object storage not configured"
            )
        
        # Construct the object path
        object_path = f"{private_dir}/uploads/{object_id}".lstrip('/')
        
        # Create a signed URL for the object
        signed_url = await create_signed_url(bucket_id, object_path, sidecar_endpoint)
        
        if signed_url:
            print(f"✅ Redirecting to signed URL: {signed_url[:100]}...")
            return RedirectResponse(url=signed_url, status_code=302)
        else:
            print(f"❌ Failed to create signed URL for object: {object_id}")
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Object not found"
            )
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ Error serving object image {object_id}: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to serve object"
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