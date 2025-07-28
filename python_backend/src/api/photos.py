"""
Photo API endpoints.
"""
import os
import uuid
from typing import List, Optional
from fastapi import APIRouter, HTTPException, status, UploadFile, File, Form, Query
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


@router.post("", response_model=Photo, status_code=status.HTTP_201_CREATED)
async def upload_photo(
    file: UploadFile = File(...),
    project_id: str = Form(..., alias="projectId"),
    description: str = Form(""),
    user_id: str = Form(..., alias="userId")
):
    """Upload a photo."""
    print(f"=== PHOTO UPLOAD REQUEST ===")
    print(f"project_id: {project_id}")
    print(f"user_id: {user_id}")
    print(f"description: {description}")
    print(f"file.filename: {file.filename if file else 'None'}")
    print(f"file.content_type: {file.content_type if file else 'None'}")
    print(f"file.size: {file.size if hasattr(file, 'size') else 'Unknown'}")
    
    try:
        if not file:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="No file provided"
            )
        
        # Validate file type
        if not file.content_type or not file.content_type.startswith('image/'):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="File must be an image"
            )
        
        # Generate unique filename
        file_extension = os.path.splitext(file.filename)[1] if file.filename else '.jpg'
        unique_filename = f"{uuid.uuid4()}{file_extension}"
        
        # Ensure upload directory exists
        os.makedirs(settings.upload_dir, exist_ok=True)
        
        # Save file
        file_path = os.path.join(settings.upload_dir, unique_filename)
        content = await file.read()
        with open(file_path, "wb") as f:
            f.write(content)
        
        # Create photo record
        photo_create = PhotoCreate(
            projectId=project_id,
            description=description,
            userId=user_id
        )
        
        return await photo_repo.create(
            photo_create, 
            filename=unique_filename,
            original_name=file.filename or "unknown.jpg"
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


@router.get("/{photo_id}/file")
async def get_photo_file(photo_id: str):
    """Get photo file by photo ID."""
    try:
        photo = await photo_repo.get_by_id(photo_id)
        if not photo:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Photo not found"
            )
        
        file_path = os.path.join(settings.upload_dir, photo.filename)
        if not os.path.exists(file_path):
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