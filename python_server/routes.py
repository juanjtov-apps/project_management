# Task routes
from fastapi import HTTPException, File, UploadFile, Form
from typing import Optional, List
import uuid
import json
import os
from pathlib import Path
from datetime import datetime

from .main import app, execute_query, execute_insert, execute_update
from .main import Task, TaskCreate, TaskUpdate, ProjectLog, ProjectLogCreate, ProjectLogUpdate
from .main import Photo, PhotoCreate, FileResponse

@app.get("/api/tasks", response_model=List[Task])
async def get_tasks(project_id: Optional[str] = None):
    """Get all tasks, optionally filtered by project"""
    try:
        if project_id:
            query = "SELECT * FROM tasks WHERE project_id = %s ORDER BY created_at DESC"
            tasks = execute_query(query, (project_id,))
        else:
            query = "SELECT * FROM tasks ORDER BY created_at DESC"
            tasks = execute_query(query)
        return tasks
    except Exception as e:
        raise HTTPException(status_code=500, detail="Failed to fetch tasks")

@app.get("/api/tasks/{task_id}", response_model=Task)
async def get_task(task_id: str):
    """Get a specific task"""
    try:
        query = "SELECT * FROM tasks WHERE id = %s"
        task = execute_query(query, (task_id,), fetch_one=True)
        if not task:
            raise HTTPException(status_code=404, detail="Task not found")
        return task
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail="Failed to fetch task")

@app.post("/api/tasks", response_model=Task, status_code=201)
async def create_task(task: TaskCreate):
    """Create a new task"""
    try:
        task_id = str(uuid.uuid4())
        query = """
            INSERT INTO tasks (id, title, description, project_id, assignee_id, category, status, priority, due_date)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
        """
        # Handle description - convert empty string to None
        description = task.description.strip() if task.description else None
        if description == "":
            description = None
            
        params = (
            task_id,
            task.title,
            description,
            task.project_id,
            task.assignee_id,
            task.category,
            task.status,
            task.priority,
            task.due_date
        )
        result = execute_insert(query, params)
        return result
    except Exception as e:
        print(f"Task creation error: {e}")
        raise HTTPException(status_code=400, detail="Invalid task data")

@app.patch("/api/tasks/{task_id}", response_model=Task)
async def update_task(task_id: str, updates: TaskUpdate):
    """Update a task"""
    try:
        # Build dynamic update query
        update_fields = []
        params = []
        
        update_data = updates.model_dump(exclude_unset=True)
        
        for field, value in update_data.items():
            # Convert field names to database column names
            if field == "projectId":
                field = "project_id"
            elif field == "assigneeId":
                field = "assignee_id"
            elif field == "dueDate":
                field = "due_date"
            
            # Handle description - convert empty string to None
            if field == "description" and isinstance(value, str):
                value = value.strip() if value else None
                if value == "":
                    value = None
            
            update_fields.append(f"{field} = %s")
            params.append(value)
        
        if not update_fields:
            raise HTTPException(status_code=400, detail="No fields to update")
        
        params.append(task_id)
        query = f"UPDATE tasks SET {', '.join(update_fields)} WHERE id = %s"
        
        result = execute_update(query, tuple(params))
        if not result:
            raise HTTPException(status_code=404, detail="Task not found")
        return result
    except HTTPException:
        raise
    except Exception as e:
        print(f"Task update error: {e}")
        raise HTTPException(status_code=400, detail="Invalid task data")

@app.delete("/api/tasks/{task_id}", status_code=204)
async def delete_task(task_id: str):
    """Delete a task"""
    try:
        query = "DELETE FROM tasks WHERE id = %s"
        rowcount = execute_query(query, (task_id,), fetch_all=False)
        if rowcount == 0:
            raise HTTPException(status_code=404, detail="Task not found")
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail="Failed to delete task")

# Project Logs routes
from .main import ProjectLog, ProjectLogCreate, ProjectLogUpdate

@app.get("/api/logs", response_model=List[ProjectLog])
async def get_project_logs(project_id: Optional[str] = None):
    """Get all project logs, optionally filtered by project"""
    try:
        if project_id:
            query = "SELECT * FROM project_logs WHERE project_id = %s ORDER BY created_at DESC"
            logs = execute_query(query, (project_id,))
        else:
            query = "SELECT * FROM project_logs ORDER BY created_at DESC"
            logs = execute_query(query)
        return logs
    except Exception as e:
        raise HTTPException(status_code=500, detail="Failed to fetch logs")

@app.post("/api/logs", response_model=ProjectLog, status_code=201)
async def create_project_log(log: ProjectLogCreate):
    """Create a new project log"""
    try:
        log_id = str(uuid.uuid4())
        query = """
            INSERT INTO project_logs (id, project_id, user_id, title, content, type, status)
            VALUES (%s, %s, %s, %s, %s, %s, %s)
        """
        params = (
            log_id,
            log.project_id,
            log.user_id,
            log.title,
            log.content,
            log.type,
            log.status
        )
        result = execute_insert(query, params)
        return result
    except Exception as e:
        raise HTTPException(status_code=400, detail="Invalid log data")

@app.patch("/api/logs/{log_id}", response_model=ProjectLog)
async def update_project_log(log_id: str, updates: ProjectLogUpdate):
    """Update a project log"""
    try:
        # Build dynamic update query
        update_fields = []
        params = []
        
        for field, value in updates.model_dump(exclude_unset=True).items():
            update_fields.append(f"{field} = %s")
            params.append(value)
        
        if not update_fields:
            raise HTTPException(status_code=400, detail="No fields to update")
        
        params.append(log_id)
        query = f"UPDATE project_logs SET {', '.join(update_fields)} WHERE id = %s"
        
        result = execute_update(query, tuple(params))
        if not result:
            raise HTTPException(status_code=404, detail="Log not found")
        return result
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=400, detail="Invalid log data")

# Photos routes

@app.get("/api/photos", response_model=List[Photo])
async def get_photos(project_id: Optional[str] = None):
    """Get all photos, optionally filtered by project"""
    try:
        if project_id:
            query = "SELECT * FROM photos WHERE project_id = %s ORDER BY created_at DESC"
            photos = execute_query(query, (project_id,))
        else:
            query = "SELECT * FROM photos ORDER BY created_at DESC"
            photos = execute_query(query)
        return photos
    except Exception as e:
        raise HTTPException(status_code=500, detail="Failed to fetch photos")

@app.post("/api/photos", response_model=Photo, status_code=201)
async def create_photo(
    photo: UploadFile = File(...),
    project_id: str = Form(...),
    user_id: str = Form(...),
    description: str = Form(""),
    tags: str = Form("[]")
):
    """Upload a new photo"""
    try:
        # Validate file type
        if not photo.content_type or not photo.content_type.startswith('image/'):
            raise HTTPException(status_code=400, detail="Only image files are allowed")
        
        # Generate unique filename
        file_extension = Path(photo.filename).suffix
        unique_filename = f"{uuid.uuid4()}{file_extension}"
        file_path = Path("uploads") / unique_filename
        
        # Save file
        with open(file_path, "wb") as buffer:
            content = await photo.read()
            buffer.write(content)
        
        # Parse tags
        try:
            tags_list = json.loads(tags) if tags else []
        except json.JSONDecodeError:
            tags_list = []
        
        # Insert into database
        photo_id = str(uuid.uuid4())
        query = """
            INSERT INTO photos (id, project_id, user_id, filename, original_name, description, tags)
            VALUES (%s, %s, %s, %s, %s, %s, %s)
        """
        params = (
            photo_id,
            project_id,
            user_id,
            unique_filename,
            photo.filename,
            description,
            tags_list
        )
        result = execute_insert(query, params)
        return result
    except HTTPException:
        raise
    except Exception as e:
        print(f"Photo upload error: {e}")
        raise HTTPException(status_code=400, detail="Invalid photo data")

@app.delete("/api/photos/{photo_id}", status_code=204)
async def delete_photo(photo_id: str):
    """Delete a photo"""
    try:
        # Get photo info first
        query = "SELECT * FROM photos WHERE id = %s"
        photo = execute_query(query, (photo_id,), fetch_one=True)
        if not photo:
            raise HTTPException(status_code=404, detail="Photo not found")
        
        # Delete file
        file_path = Path("uploads") / photo["filename"]
        if file_path.exists():
            file_path.unlink()
        
        # Delete from database
        query = "DELETE FROM photos WHERE id = %s"
        rowcount = execute_query(query, (photo_id,), fetch_all=False)
        if rowcount == 0:
            raise HTTPException(status_code=404, detail="Photo not found")
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail="Failed to delete photo")

@app.get("/api/photos/{photo_id}/file")
async def get_photo_file(photo_id: str):
    """Serve a photo file"""
    try:
        query = "SELECT * FROM photos WHERE id = %s"
        photo = execute_query(query, (photo_id,), fetch_one=True)
        if not photo:
            raise HTTPException(status_code=404, detail="Photo not found")
        
        file_path = Path("uploads") / photo["filename"]
        if not file_path.exists():
            raise HTTPException(status_code=404, detail="Photo file not found")
        
        return FileResponse(file_path)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail="Failed to serve photo")

# Continue with remaining routes in the next part...