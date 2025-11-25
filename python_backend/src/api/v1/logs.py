"""
Project logs API endpoints for v1 API with validation.
"""
from typing import List, Optional, Dict, Any
from fastapi import APIRouter, HTTPException, status, Query, Depends
from pydantic import BaseModel, Field
from ...models.log import ProjectLog, ProjectLogCreate, ProjectLogUpdate
from ...database.connection import get_db_pool
from ...api.auth import get_current_user_dependency, is_root_admin

router = APIRouter(prefix="/logs", tags=["logs"])

class ProjectLogCreateRequest(BaseModel):
    """Request model for creating project log."""
    projectId: str = Field(..., description="Project ID")
    title: str = Field(..., min_length=1, description="Log title")
    content: str = Field(..., min_length=1, description="Log content")
    logType: str = Field(default="general", description="Log type")
    images: Optional[List[str]] = Field(default=[], description="Array of image URLs")

@router.get("", response_model=List[Dict[str, Any]], summary="Get project logs")
async def get_logs(
    projectId: Optional[str] = Query(None, alias="projectId", description="Filter by project ID"),
    current_user: Dict[str, Any] = Depends(get_current_user_dependency)
):
    """Get project logs with optional project filter and company scoping."""
    try:
        pool = await get_db_pool()
        async with pool.acquire() as conn:
            query = "SELECT * FROM project_logs WHERE 1=1"
            params = []
            
            if projectId:
                query += " AND project_id = $1"
                params.append(projectId)
            
            query += " ORDER BY created_at DESC"
            
            rows = await conn.fetch(query, *params)
            logs = [dict(row) for row in rows]
            
            # Apply company filtering unless root admin
            if not is_root_admin(current_user):
                user_company_id = str(current_user.get('companyId') or current_user.get('company_id'))
                print(f"Logs: User {current_user.get('email')} - filtering by company: {user_company_id}")
                # Filter by validating associated project company
                filtered_logs = []
                for log in logs:
                    log_project_id = log.get('project_id')
                    if log_project_id:
                        project_row = await conn.fetchrow(
                            "SELECT company_id FROM projects WHERE id = $1",
                            log_project_id
                        )
                        if project_row and str(project_row['company_id']) == user_company_id:
                            filtered_logs.append(log)
                logs = filtered_logs
                print(f"Logs: User {current_user.get('email')} retrieved {len(logs)} logs after company filtering")
            else:
                print(f"Logs: Root admin retrieved {len(logs)} logs (no filtering)")
            
            # Convert to camelCase for frontend
            result = []
            for log in logs:
                result.append({
                    'id': log.get('id'),
                    'projectId': log.get('project_id'),
                    'userId': log.get('user_id'),
                    'title': log.get('title'),
                    'content': log.get('content'),
                    'type': log.get('type'),
                    'status': log.get('status'),
                    'images': log.get('images', []),
                    'createdAt': log.get('created_at').isoformat() if log.get('created_at') else None
                })
            
            return result
    except Exception as e:
        print(f"Error fetching logs: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to fetch project logs"
        )

@router.post("", status_code=status.HTTP_201_CREATED, summary="Create project log")
async def create_log(
    log_data: ProjectLogCreateRequest,
    current_user: Dict[str, Any] = Depends(get_current_user_dependency)
):
    """Create a new project log with validation."""
    try:
        pool = await get_db_pool()
        async with pool.acquire() as conn:
            # Verify project exists and user has access
            project = await conn.fetchrow(
                "SELECT company_id FROM projects WHERE id = $1",
                log_data.projectId
            )
            if not project:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Project not found"
                )
            
            # Verify company access (unless root admin)
            if not is_root_admin(current_user):
                user_company_id = str(current_user.get('companyId'))
                project_company_id = str(project['company_id'])
                if project_company_id != user_company_id:
                    raise HTTPException(
                        status_code=status.HTTP_403_FORBIDDEN,
                        detail="Access denied: Project belongs to different company"
                    )
            
            # Create log
            log_id = await conn.fetchval("""
                INSERT INTO project_logs (project_id, user_id, title, content, type, images)
                VALUES ($1, $2, $3, $4, $5, $6)
                RETURNING id
            """, log_data.projectId, current_user.get('id'), log_data.title, 
                log_data.content, log_data.logType, log_data.images)
            
            # Get created log
            log_row = await conn.fetchrow(
                "SELECT * FROM project_logs WHERE id = $1", log_id
            )
            
            # Create photo records for images if provided
            if log_data.images:
                for image_url in log_data.images:
                    try:
                        # Extract object ID from URL
                        object_id = image_url.split('/')[-1].split('?')[0]
                        
                        # Check for duplicates
                        existing = await conn.fetchrow(
                            "SELECT id FROM photos WHERE filename = $1 OR original_name = $2",
                            object_id, image_url
                        )
                        if not existing:
                            await conn.execute("""
                                INSERT INTO photos (project_id, user_id, filename, original_name, description, tags)
                                VALUES ($1, $2, $3, $4, $5, $6)
                            """, log_data.projectId, current_user.get('id'), 
                                object_id, image_url, log_data.title, ['log-photo'])
                    except Exception as e:
                        print(f"Error creating photo record: {e}")
            
            return {
                'id': str(log_row['id']),
                'projectId': log_row['project_id'],
                'userId': log_row['user_id'],
                'title': log_row['title'],
                'content': log_row['content'],
                'type': log_row['type'],
                'status': log_row['status'],
                'images': log_row.get('images', []),
                'createdAt': log_row['created_at'].isoformat() if log_row.get('created_at') else None
            }
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error creating log: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create project log"
        )

@router.patch("/{log_id}", summary="Update project log")
async def update_log(
    log_id: str,
    log_update: ProjectLogUpdate,
    current_user: Dict[str, Any] = Depends(get_current_user_dependency)
):
    """Update a project log with validation."""
    try:
        pool = await get_db_pool()
        async with pool.acquire() as conn:
            # Verify log exists and user has access
            log = await conn.fetchrow(
                "SELECT * FROM project_logs WHERE id = $1", log_id
            )
            if not log:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Log not found"
                )
            
            # Verify company access via project
            if not is_root_admin(current_user):
                project = await conn.fetchrow(
                    "SELECT company_id FROM projects WHERE id = $1",
                    log['project_id']
                )
                if project:
                    user_company_id = str(current_user.get('companyId'))
                    project_company_id = str(project['company_id'])
                    if project_company_id != user_company_id:
                        raise HTTPException(
                            status_code=status.HTTP_403_FORBIDDEN,
                            detail="Access denied"
                        )
            
            # Update log
            update_data = log_update.dict(exclude_unset=True, by_alias=True)
            if not update_data:
                # Return existing log if no updates
                log_row = await conn.fetchrow(
                    "SELECT * FROM project_logs WHERE id = $1", log_id
                )
            else:
                set_clauses = []
                params = []
                param_count = 1
                
                for key, value in update_data.items():
                    set_clauses.append(f"{key} = ${param_count}")
                    params.append(value)
                    param_count += 1
                
                params.append(log_id)
                await conn.execute(
                    f"UPDATE project_logs SET {', '.join(set_clauses)} WHERE id = ${param_count}",
                    *params
                )
                log_row = await conn.fetchrow(
                    "SELECT * FROM project_logs WHERE id = $1", log_id
                )
            
            return {
                'id': str(log_row['id']),
                'projectId': log_row['project_id'],
                'userId': log_row['user_id'],
                'title': log_row['title'],
                'content': log_row['content'],
                'type': log_row['type'],
                'status': log_row['status'],
                'images': log_row.get('images', []),
                'createdAt': log_row['created_at'].isoformat() if log_row.get('created_at') else None
            }
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error updating log: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update project log"
        )

@router.delete("/{log_id}", status_code=status.HTTP_204_NO_CONTENT, summary="Delete project log")
async def delete_log(
    log_id: str,
    current_user: Dict[str, Any] = Depends(get_current_user_dependency)
):
    """Delete a project log with validation."""
    try:
        pool = await get_db_pool()
        async with pool.acquire() as conn:
            # Verify log exists and user has access
            log = await conn.fetchrow(
                "SELECT * FROM project_logs WHERE id = $1", log_id
            )
            if not log:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Log not found"
                )
            
            # Verify company access via project
            if not is_root_admin(current_user):
                project = await conn.fetchrow(
                    "SELECT company_id FROM projects WHERE id = $1",
                    log['project_id']
                )
                if project:
                    user_company_id = str(current_user.get('companyId'))
                    project_company_id = str(project['company_id'])
                    if project_company_id != user_company_id:
                        raise HTTPException(
                            status_code=status.HTTP_403_FORBIDDEN,
                            detail="Access denied"
                        )
            
            await conn.execute("DELETE FROM project_logs WHERE id = $1", log_id)
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error deleting log: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to delete project log"
        )

