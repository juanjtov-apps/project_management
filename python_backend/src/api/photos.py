"""
Photo API endpoints.
"""
import os
import uuid
from typing import List, Optional, Dict, Any
from fastapi import APIRouter, HTTPException, status, UploadFile, File, Form, Query, Request, Depends
from fastapi.responses import FileResponse
from src.models import Photo, PhotoCreate
from pydantic import ValidationError
from src.database.repositories import PhotoRepository, ProjectRepository
from src.core.config import settings
from src.api.auth import get_current_user_dependency, is_root_admin

router = APIRouter(prefix="/photos", tags=["photos"])
photo_repo = PhotoRepository()
project_repo = ProjectRepository()


@router.get("", response_model=List[Photo])
async def get_photos(
    project_id: Optional[str] = Query(None, alias="projectId"),
    user_id: Optional[str] = Query(None, alias="userId"),
    current_user: Dict[str, Any] = Depends(get_current_user_dependency)
):
    """Get photos with optional filters and company scoping."""
    try:
        photos = await photo_repo.get_all(project_id=project_id, user_id=user_id)
        
        # Apply company filtering unless root admin
        if not is_root_admin(current_user):
            user_company_id = str(current_user.get('companyId') or current_user.get('company_id'))
            # Filter photos by validating associated project company
            filtered_photos = []
            for photo in photos:
                photo_project_id = photo.project_id
                if photo_project_id:
                    project = await project_repo.get_by_id(photo_project_id)
                    if project and str(getattr(project, 'company_id', '')) == user_company_id:
                        filtered_photos.append(photo)
            photos = filtered_photos
        
        return photos
    except Exception as e:
        print(f"Error fetching photos: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to fetch photos"
        )


@router.post("", status_code=status.HTTP_201_CREATED)
async def upload_photo(
    request: Request,
    current_user: Dict[str, Any] = Depends(get_current_user_dependency)
):
    """Upload a photo with authentication and company validation.
    
    Supports two modes:
    1. JSON body with metadata (when file is already uploaded to object storage)
    2. Multipart form upload (direct file uploads)
    """
    content_type = request.headers.get('content-type', '')
    print(f"📸 Photo upload request - Content-Type: {content_type}")
    
    # Handle JSON body (file already uploaded to object storage)
    if 'application/json' in content_type:
        try:
            body = await request.json()
            print(f"📸 JSON photo metadata received: {body}")
            
            projectId = body.get('projectId', '')
            userId = body.get('userId', '') or str(current_user.get('id', ''))
            description = body.get('description', '')
            filename = body.get('filename', '')
            originalName = body.get('originalName', '')
            tags = body.get('tags', [])
            
            if not projectId:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Project ID is required"
                )
            
            if not filename:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Filename is required (file should be uploaded to object storage first)"
                )
            
            # Validate project ownership (unless root admin)
            if not is_root_admin(current_user):
                user_company_id = str(current_user.get('companyId') or current_user.get('company_id'))
                project = await project_repo.get_by_id(projectId)
                if not project:
                    raise HTTPException(
                        status_code=status.HTTP_404_NOT_FOUND,
                        detail="Project not found"
                    )
                if str(project.get('company_id')) != user_company_id:
                    raise HTTPException(
                        status_code=status.HTTP_403_FORBIDDEN,
                        detail="Cannot upload photo to project from different company"
                    )
            
            # Extract object ID from URL if filename is a full URL
            if 'storage.googleapis.com' in filename or 'storage.cloud.google.com' in filename:
                # Extract the object path from the signed URL
                from urllib.parse import urlparse, unquote
                parsed = urlparse(filename)
                path_parts = parsed.path.split('/')
                # The object ID is typically the last part of the path before query params
                object_id = path_parts[-1] if path_parts else filename
                # Remove any file extension for consistent storage
                if '.' in object_id:
                    object_id = object_id.rsplit('.', 1)[0]
                stored_filename = object_id
            else:
                # Use filename directly - could be a UUID or path from object storage
                stored_filename = filename.split('/')[-1] if '/' in filename else filename
            
            # Create photo record
            photo_create = PhotoCreate(
                projectId=projectId,
                description=description,
                userId=userId,
                tags=tags if tags else []
            )
            
            result = await photo_repo.create(
                photo_create, 
                filename=stored_filename,
                original_name=originalName or stored_filename
            )
            print(f"✅ Photo record created: {result}")
            return result
            
        except HTTPException:
            raise
        except Exception as e:
            print(f"❌ Error creating photo from JSON: {e}")
            import traceback
            traceback.print_exc()
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to create photo record: {str(e)}"
            )
    
    # Handle multipart form upload (direct file upload)
    try:
        form = await request.form()
        print(f"📸 Form data received: {dict(form)}")
        
        # Extract form fields with proper type handling
        file = form.get("file") or form.get("photo")
        projectId = str(form.get("projectId", ""))
        userId = str(form.get("userId", "")) or str(current_user.get('id', ''))
        description = str(form.get("description", ""))
        
    except Exception as e:
        print(f"Error reading form: {e}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Failed to parse form data: {str(e)}"
        )
    
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
    
    # Validate project ownership (unless root admin)
    if not is_root_admin(current_user):
        user_company_id = str(current_user.get('companyId') or current_user.get('company_id'))
        project = await project_repo.get_by_id(projectId)
        if not project:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Project not found"
            )
        if str(getattr(project, 'company_id', '')) != user_company_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Cannot upload photo to project from different company"
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
        import traceback
        traceback.print_exc()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to upload photo: {str(e)}"
        )


@router.get("/{photo_id}")
async def get_photo(
    photo_id: str,
    current_user: Dict[str, Any] = Depends(get_current_user_dependency)
):
    """Get photo metadata by photo ID with company scoping."""
    try:
        photo = await photo_repo.get_by_id(photo_id)
        if not photo:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Photo not found"
            )
        
        # Verify company access (unless root admin)
        if not is_root_admin(current_user):
            user_company_id = str(current_user.get('companyId'))
            photo_project_id = photo.project_id
            if photo_project_id:
                project = await project_repo.get_by_id(photo_project_id)
                if not project or str(getattr(project, 'company_id', '')) != user_company_id:
                    raise HTTPException(
                        status_code=status.HTTP_403_FORBIDDEN,
                        detail="Access denied: Photo belongs to different company"
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
async def get_photo_file(
    photo_id: str,
    current_user: Dict[str, Any] = Depends(get_current_user_dependency)
):
    """Get photo file by photo ID with company scoping."""
    try:
        photo = await photo_repo.get_by_id(photo_id)
        if not photo:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Photo not found"
            )
        
        # Verify company access (unless root admin)
        if not is_root_admin(current_user):
            user_company_id = str(current_user.get('companyId'))
            photo_project_id = photo.project_id
            if photo_project_id:
                project = await project_repo.get_by_id(photo_project_id)
                if not project or str(getattr(project, 'company_id', '')) != user_company_id:
                    raise HTTPException(
                        status_code=status.HTTP_403_FORBIDDEN,
                        detail="Access denied: Photo belongs to different company"
                    )
        
        from fastapi.responses import RedirectResponse
        
        # Priority 1: For UUID filenames, always generate fresh signed URL from object storage
        # This handles photos uploaded via Replit Object Storage (most common case)
        if photo.filename:
            # Check if filename is a UUID (36 chars with dashes, or UUID pattern)
            is_uuid_filename = (
                (len(photo.filename) == 36 and photo.filename.count('-') == 4) or
                (len(photo.filename) > 36 and photo.filename.count('-') >= 4 and '.' not in photo.filename[:36])
            )
            if is_uuid_filename:
                # This is a UUID stored in Replit Object Storage (GCP bucket)
                # Generate a fresh signed URL via the objects endpoint
                object_url = f"/api/v1/objects/image/{photo.filename}"
                print(f"🔄 [GCS] Generating fresh signed URL via objects endpoint: {object_url}")
                return RedirectResponse(url=object_url, status_code=302)
        
        # Priority 2: Legacy local file serving (for backward compatibility)
        if photo.filename:
            file_path = os.path.join(settings.upload_dir, photo.filename)
            if os.path.exists(file_path):
                print(f"📁 [LOCAL] Serving from filesystem: {file_path}")
                import mimetypes
                media_type = mimetypes.guess_type(file_path)[0] or "image/jpeg"
                return FileResponse(
                    path=file_path,
                    media_type=media_type,
                    filename=photo.original_name
                )
        
        # Priority 3: If filename looks like a regular file but doesn't exist locally,
        # try object storage as a fallback
        if photo.filename:
            object_url = f"/api/v1/objects/image/{photo.filename}"
            print(f"🔄 [GCS] Fallback - trying object storage: {object_url}")
            return RedirectResponse(url=object_url, status_code=302)
        
        # Photo not found
        print(f"❌ Photo file not found: filename={photo.filename}, original_name={photo.original_name}")
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Photo file not found in any storage location"
        )
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ Error retrieving photo file {photo_id}: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve photo file"
        )


@router.delete("/{photo_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_photo(
    photo_id: str,
    current_user: Dict[str, Any] = Depends(get_current_user_dependency)
):
    """Delete a photo and its file with company scoping."""
    try:
        photo = await photo_repo.get_by_id(photo_id)
        if not photo:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Photo not found"
            )
        
        # Verify company access (unless root admin)
        if not is_root_admin(current_user):
            user_company_id = str(current_user.get('companyId'))
            photo_project_id = photo.project_id
            if photo_project_id:
                project = await project_repo.get_by_id(photo_project_id)
                if not project or str(getattr(project, 'company_id', '')) != user_company_id:
                    raise HTTPException(
                        status_code=status.HTTP_403_FORBIDDEN,
                        detail="Access denied: Cannot delete photo from different company"
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