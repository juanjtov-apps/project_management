"""
Photo API endpoints.
"""
import os
import uuid
from typing import List, Optional
from fastapi import APIRouter, HTTPException, status, UploadFile, File, Form, Query, Request
from fastapi.responses import FileResponse
from src.models import Photo, PhotoCreate
from pydantic import ValidationError
from src.database.repositories import PhotoRepository
from src.core.config import settings

router = APIRouter(prefix="/photos", tags=["photos"])
photo_repo = PhotoRepository()


@router.get("", response_model=List[Photo])
async def get_photos(
    project_id: Optional[str] = Query(None, alias="projectId"),
    user_id: Optional[str] = Query(None, alias="userId")
):
    """Get photos with optional filters."""
    try:
        return await photo_repo.get_all(project_id=project_id, user_id=user_id)
    except Exception as e:
        print(f"Error fetching photos: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to fetch photos"
        )


@router.post("/debug", status_code=200)
async def debug_upload(request: Request):
    """Debug endpoint to see raw request data."""
    print("=== DEBUG UPLOAD REQUEST ===")
    print(f"Method: {request.method}")
    print(f"URL: {request.url}")
    print(f"Headers: {dict(request.headers)}")
    
    try:
        form = await request.form()
        print(f"Form data: {dict(form)}")
        for key, value in form.items():
            print(f"  {key}: {value} (type: {type(value)})")
    except Exception as e:
        print(f"Error reading form: {e}")
    
    return {"status": "debug", "received": "ok"}


@router.post("", status_code=status.HTTP_201_CREATED)
async def upload_photo(request: Request):
    """Upload a photo."""
    print("=" * 50)
    print("PHOTO UPLOAD REQUEST RECEIVED")
    print(f"Method: {request.method}")
    print(f"URL: {request.url}")
    print(f"Headers: {dict(request.headers)}")
    print(f"Content-Type: {request.headers.get('content-type', 'None')}")
    
    try:
        form = await request.form()
        print(f"Form data received: {dict(form)}")
        
        # Extract form fields with proper type handling
        file = form.get("file") or form.get("photo")  # Support both field names
        projectId = str(form.get("projectId", ""))
        userId = str(form.get("userId", ""))  
        description = str(form.get("description", ""))
        
        print(f"file: {file} (type: {type(file)})")
        print(f"projectId: '{projectId}' (type: {type(projectId)})")
        print(f"userId: '{userId}' (type: {type(userId)})")
        print(f"description: '{description}' (type: {type(description)})")
        
        if file and hasattr(file, 'filename'):
            print(f"file.filename: '{getattr(file, 'filename', 'None')}'")
            print(f"file.content_type: '{getattr(file, 'content_type', 'None')}'")
            print(f"file.size: {getattr(file, 'size', 'Unknown')}")
        
    except Exception as e:
        print(f"Error reading form: {e}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Failed to parse form data: {str(e)}"
        )
    
    print("=" * 50)
    
    # Validation
    if not file:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No file provided"
        )
    
    if not projectId:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Project ID is required"
        )
    
    if not userId:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User ID is required"
        )
    
    try:
        
        # Validate file type
        file_content_type = getattr(file, 'content_type', None)
        if not file_content_type or not file_content_type.startswith('image/'):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="File must be an image"
            )
        
        # Generate unique filename
        file_filename = getattr(file, 'filename', None)
        file_extension = os.path.splitext(file_filename)[1] if file_filename else '.jpg'
        unique_filename = f"{uuid.uuid4()}{file_extension}"
        
        # Ensure upload directory exists
        os.makedirs(settings.upload_dir, exist_ok=True)
        
        # Save file
        file_path = os.path.join(settings.upload_dir, unique_filename)
        content = await file.read() if hasattr(file, 'read') else b''
        with open(file_path, "wb") as f:
            f.write(content)
        
        # Create photo record
        photo_create = PhotoCreate(
            projectId=projectId,
            description=description,
            userId=userId
        )
        
        return await photo_repo.create(
            photo_create, 
            filename=unique_filename,
            original_name=file_filename or "unknown.jpg"
        )
        
    except ValidationError as e:
        print(f"Validation error: {e}")
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Validation error: {e}"
        )
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error uploading photo: {e}")
        print(f"Error type: {type(e)}")
        import traceback
        traceback.print_exc()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to upload photo: {str(e)}"
        )


@router.get("/{photo_id}")
async def get_photo(photo_id: str):
    """Get photo metadata by photo ID."""
    try:
        photo = await photo_repo.get_by_id(photo_id)
        if not photo:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Photo not found"
            )
        return photo
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error getting photo {photo_id}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to get photo"
        )


@router.get("/{photo_id}/file")
@router.head("/{photo_id}/file")
async def get_photo_file(photo_id: str):
    """Get photo file by photo ID."""
    try:
        photo = await photo_repo.get_by_id(photo_id)
        if not photo:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Photo not found"
            )
        
        # Check if original_name contains a pre-signed Google Cloud Storage URL (priority)
        if photo.original_name and ('googleapis.com' in photo.original_name or photo.original_name.startswith('http')):
            from fastapi.responses import RedirectResponse
            print(f"✅ Redirecting to pre-signed GCS URL: {photo.original_name[:100]}...")
            return RedirectResponse(url=photo.original_name, status_code=302)
        
        # Check if filename is a Google Cloud Storage URL
        if photo.filename and ('googleapis.com' in photo.filename or photo.filename.startswith('http')):
            # For Google Cloud Storage URLs, redirect to the URL
            from fastapi.responses import RedirectResponse
            print(f"Redirecting to GCS URL: {photo.filename}")
            return RedirectResponse(url=photo.filename, status_code=302)
        
        # For simple UUID filenames, redirect to Node.js object storage
        if photo.filename and len(photo.filename) == 36 and '-' in photo.filename:
            from fastapi.responses import RedirectResponse
            object_url = f"http://127.0.0.1:5000/api/objects/image/{photo.filename}"
            print(f"🔄 Redirecting to Node.js object storage: {object_url}")
            return RedirectResponse(url=object_url, status_code=302)
        
        # For local files, serve from filesystem
        file_path = os.path.join(settings.upload_dir, photo.filename)
        if not os.path.exists(file_path):
            print(f"Local file not found: {file_path}")
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Photo file not found"
            )
        
        # Determine media type from file extension
        import mimetypes
        media_type = mimetypes.guess_type(file_path)[0] or "image/jpeg"
        
        return FileResponse(
            path=file_path,
            media_type=media_type,
            filename=photo.original_name
        )
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error retrieving photo file {photo_id}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve photo file"
        )


@router.delete("/{photo_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_photo(photo_id: str):
    """Delete a photo and its file."""
    try:
        photo = await photo_repo.get_by_id(photo_id)
        if not photo:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Photo not found"
            )
        
        # Delete file if it exists
        file_path = os.path.join(settings.upload_dir, photo.filename)
        if os.path.exists(file_path):
            os.remove(file_path)
        
        # Delete database record
        success = await photo_repo.delete(photo_id)
        if not success:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Photo not found"
            )
            
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error deleting photo {photo_id}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to delete photo"
        )