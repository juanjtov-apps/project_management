"""
Photo API endpoints.
"""
import os
import uuid
from typing import List, Optional
from fastapi import APIRouter, HTTPException, status, UploadFile, File, Form, Query
from fastapi.responses import FileResponse
from src.models import Photo, PhotoCreate
from src.database.repositories import PhotoRepository
from src.core.config import settings

router = APIRouter(prefix="/photos", tags=["photos"])
photo_repo = PhotoRepository()


@router.get("", response_model=List[Photo])
async def get_photos(
    project_id: Optional[str] = Query(None, alias="projectId"),
    uploaded_by: Optional[str] = Query(None, alias="uploadedBy")
):
    """Get photos with optional filters."""
    try:
        return await photo_repo.get_all(project_id=project_id, uploaded_by=uploaded_by)
    except Exception as e:
        print(f"Error fetching photos: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to fetch photos"
        )


@router.post("", response_model=Photo, status_code=status.HTTP_201_CREATED)
async def upload_photo(
    files: List[UploadFile] = File(...),
    project_id: str = Form(..., alias="projectId"),
    description: str = Form(default=""),
    uploaded_by: str = Form(..., alias="uploadedBy")
):
    """Upload one or more photos."""
    try:
        # For simplicity, handle only the first file in this endpoint
        file = files[0] if files else None
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
            uploadedBy=uploaded_by
        )
        
        return await photo_repo.create(
            photo_create, 
            filename=unique_filename,
            file_size=len(content),
            mime_type=file.content_type
        )
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error uploading photo: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to upload photo"
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
        
        return FileResponse(
            path=file_path,
            media_type=photo.mime_type,
            filename=photo.filename
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