import os
import json
import uuid
import shutil
from datetime import datetime
from typing import Optional, List, Dict, Any
from pathlib import Path

from fastapi import FastAPI, HTTPException, File, UploadFile, Form, Depends, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
import psycopg2
from psycopg2.extras import RealDictCursor
from psycopg2.pool import SimpleConnectionPool
from pydantic import BaseModel, Field
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Create FastAPI app
app = FastAPI(title="ContractorPro API", version="1.0.0")

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Check if we're in development mode
is_development = os.getenv("NODE_ENV") == "development"

if not is_development:
    # In production, serve static files
    if Path("dist/public").exists():
        app.mount("/", StaticFiles(directory="dist/public", html=True), name="static")

# Database connection pool
DATABASE_URL = os.getenv("DATABASE_URL")
if not DATABASE_URL:
    raise ValueError("DATABASE_URL environment variable is required")

# Create connection pool
connection_pool = SimpleConnectionPool(
    minconn=1,
    maxconn=10,
    dsn=DATABASE_URL
)

# Ensure uploads directory exists
UPLOADS_DIR = Path("uploads")
UPLOADS_DIR.mkdir(exist_ok=True)

def get_db_connection():
    """Get database connection from pool"""
    return connection_pool.getconn()

def return_db_connection(conn):
    """Return connection to pool"""
    connection_pool.putconn(conn)

class DatabaseConnection:
    """Context manager for database connections"""
    def __init__(self):
        self.conn = None
        
    def __enter__(self):
        self.conn = get_db_connection()
        return self.conn
        
    def __exit__(self, exc_type, exc_val, exc_tb):
        if self.conn:
            return_db_connection(self.conn)

# Pydantic models
class UserBase(BaseModel):
    username: str
    name: str
    email: str
    role: str = "crew"

class UserCreate(UserBase):
    password: str

class User(UserBase):
    id: str
    class Config:
        from_attributes = True

class ProjectBase(BaseModel):
    name: str
    description: Optional[str] = None
    location: str
    status: str = "active"
    progress: int = 0
    dueDate: Optional[datetime] = None

class ProjectCreate(ProjectBase):
    pass

class ProjectUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    location: Optional[str] = None
    status: Optional[str] = None
    progress: Optional[int] = None
    dueDate: Optional[datetime] = None

class Project(ProjectBase):
    id: str
    createdAt: datetime
    
    class Config:
        from_attributes = True

class TaskBase(BaseModel):
    title: str
    description: Optional[str] = None
    projectId: Optional[str] = None
    assigneeId: Optional[str] = None
    category: str = "project"
    status: str = "pending"
    priority: str = "medium"
    dueDate: Optional[datetime] = None

class TaskCreate(TaskBase):
    pass

class TaskUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    projectId: Optional[str] = None
    assigneeId: Optional[str] = None
    category: Optional[str] = None
    status: Optional[str] = None
    priority: Optional[str] = None
    dueDate: Optional[datetime] = None

class Task(TaskBase):
    id: str
    completedAt: Optional[datetime] = None
    createdAt: datetime
    
    class Config:
        from_attributes = True

class ProjectLogBase(BaseModel):
    projectId: str
    userId: str
    title: str
    content: str
    type: str = "general"
    status: str = "open"

class ProjectLogCreate(ProjectLogBase):
    pass

class ProjectLogUpdate(BaseModel):
    title: Optional[str] = None
    content: Optional[str] = None
    type: Optional[str] = None
    status: Optional[str] = None

class ProjectLog(ProjectLogBase):
    id: str
    createdAt: datetime
    
    class Config:
        from_attributes = True

class PhotoBase(BaseModel):
    projectId: str
    userId: str
    filename: str
    originalName: str
    description: Optional[str] = None
    tags: Optional[List[str]] = None

class PhotoCreate(PhotoBase):
    pass

class Photo(PhotoBase):
    id: str
    createdAt: datetime
    
    class Config:
        from_attributes = True

class ScheduleChangeBase(BaseModel):
    taskId: str
    userId: str
    reason: str
    originalDate: datetime
    newDate: datetime
    status: str = "pending"

class ScheduleChangeCreate(ScheduleChangeBase):
    pass

class ScheduleChangeUpdate(BaseModel):
    reason: Optional[str] = None
    originalDate: Optional[datetime] = None
    newDate: Optional[datetime] = None
    status: Optional[str] = None

class ScheduleChange(ScheduleChangeBase):
    id: str
    createdAt: datetime
    
    class Config:
        from_attributes = True

class NotificationBase(BaseModel):
    userId: str
    title: str
    message: str
    type: str = "info"
    isRead: bool = False
    relatedEntityType: Optional[str] = None
    relatedEntityId: Optional[str] = None

class NotificationCreate(NotificationBase):
    pass

class Notification(NotificationBase):
    id: str
    createdAt: datetime
    
    class Config:
        from_attributes = True

class DashboardStats(BaseModel):
    activeProjects: int
    pendingTasks: int
    photosUploaded: int
    photosUploadedToday: int
    crewMembers: int

# Middleware for logging
@app.middleware("http")
async def log_requests(request: Request, call_next):
    start_time = datetime.now()
    response = await call_next(request)
    process_time = (datetime.now() - start_time).total_seconds() * 1000
    
    if request.url.path.startswith("/api"):
        print(f"{request.method} {request.url.path} {response.status_code} in {process_time:.0f}ms")
    
    return response

# Helper functions
def row_to_dict(row, cursor_description):
    """Convert database row to dictionary with camelCase keys"""
    if row is None:
        return None
    
    result = {}
    for i, value in enumerate(row):
        column_name = cursor_description[i][0]
        
        # Convert snake_case to camelCase
        if '_' in column_name:
            parts = column_name.split('_')
            camel_case = parts[0] + ''.join(word.capitalize() for word in parts[1:])
            result[camel_case] = value
        else:
            result[column_name] = value
    
    return result

def execute_query(query: str, params: tuple = None, fetch_one: bool = False, fetch_all: bool = True):
    """Execute database query and return results"""
    with DatabaseConnection() as conn:
        with conn.cursor() as cursor:
            cursor.execute(query, params)
            
            if fetch_one:
                row = cursor.fetchone()
                return row_to_dict(row, cursor.description) if row else None
            elif fetch_all:
                rows = cursor.fetchall()
                return [row_to_dict(row, cursor.description) for row in rows]
            else:
                conn.commit()
                return cursor.rowcount

def execute_insert(query: str, params: tuple):
    """Execute insert query and return the inserted record"""
    with DatabaseConnection() as conn:
        with conn.cursor() as cursor:
            cursor.execute(query + " RETURNING *", params)
            conn.commit()
            row = cursor.fetchone()
            return row_to_dict(row, cursor.description) if row else None

def execute_update(query: str, params: tuple):
    """Execute update query and return the updated record"""
    with DatabaseConnection() as conn:
        with conn.cursor() as cursor:
            cursor.execute(query + " RETURNING *", params)
            conn.commit()
            row = cursor.fetchone()
            return row_to_dict(row, cursor.description) if row else None

# API Routes

# Projects
@app.get("/api/projects", response_model=List[Project])
async def get_projects():
    """Get all projects"""
    try:
        query = "SELECT * FROM projects ORDER BY created_at DESC"
        projects = execute_query(query)
        return projects
    except Exception as e:
        raise HTTPException(status_code=500, detail="Failed to fetch projects")

@app.get("/api/projects/{project_id}", response_model=Project)
async def get_project(project_id: str):
    """Get a specific project"""
    try:
        query = "SELECT * FROM projects WHERE id = %s"
        project = execute_query(query, (project_id,), fetch_one=True)
        if not project:
            raise HTTPException(status_code=404, detail="Project not found")
        return project
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail="Failed to fetch project")

@app.post("/api/projects", response_model=Project, status_code=201)
async def create_project(project: ProjectCreate):
    """Create a new project"""
    try:
        project_id = str(uuid.uuid4())
        query = """
            INSERT INTO projects (id, name, description, location, status, progress, due_date)
            VALUES (%s, %s, %s, %s, %s, %s, %s)
        """
        params = (
            project_id,
            project.name,
            project.description,
            project.location,
            project.status,
            project.progress,
            project.dueDate
        )
        result = execute_insert(query, params)
        return result
    except Exception as e:
        print(f"Project creation error: {e}")
        raise HTTPException(status_code=400, detail="Invalid project data")

@app.patch("/api/projects/{project_id}", response_model=Project)
async def update_project(project_id: str, updates: ProjectUpdate):
    """Update a project"""
    try:
        # Build dynamic update query
        update_fields = []
        params = []
        
        update_data = updates.model_dump(exclude_unset=True)
        for field, value in update_data.items():
            # Convert camelCase to snake_case
            if field == "dueDate":
                field = "due_date"
            update_fields.append(f"{field} = %s")
            params.append(value)
        
        if not update_fields:
            raise HTTPException(status_code=400, detail="No fields to update")
        
        params.append(project_id)
        query = f"UPDATE projects SET {', '.join(update_fields)} WHERE id = %s"
        
        result = execute_update(query, tuple(params))
        if not result:
            raise HTTPException(status_code=404, detail="Project not found")
        return result
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=400, detail="Invalid project data")

@app.delete("/api/projects/{project_id}", status_code=204)
async def delete_project(project_id: str):
    """Delete a project"""
    try:
        query = "DELETE FROM projects WHERE id = %s"
        rowcount = execute_query(query, (project_id,), fetch_all=False)
        if rowcount == 0:
            raise HTTPException(status_code=404, detail="Project not found")
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail="Failed to delete project")

# Tasks
@app.get("/api/tasks", response_model=List[Task])
async def get_tasks(projectId: Optional[str] = None):
    """Get all tasks, optionally filtered by project"""
    try:
        if projectId:
            query = "SELECT * FROM tasks WHERE project_id = %s ORDER BY created_at DESC"
            tasks = execute_query(query, (projectId,))
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
            task.projectId,
            task.assigneeId,
            task.category,
            task.status,
            task.priority,
            task.dueDate
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
            # Convert camelCase to snake_case
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

# Project Logs
@app.get("/api/logs", response_model=List[ProjectLog])
async def get_project_logs(projectId: Optional[str] = None):
    """Get all project logs, optionally filtered by project"""
    try:
        if projectId:
            query = "SELECT * FROM project_logs WHERE project_id = %s ORDER BY created_at DESC"
            logs = execute_query(query, (projectId,))
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
            log.projectId,
            log.userId,
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

# Photos
@app.get("/api/photos", response_model=List[Photo])
async def get_photos(projectId: Optional[str] = None):
    """Get all photos, optionally filtered by project"""
    try:
        if projectId:
            query = "SELECT * FROM photos WHERE project_id = %s ORDER BY created_at DESC"
            photos = execute_query(query, (projectId,))
        else:
            query = "SELECT * FROM photos ORDER BY created_at DESC"
            photos = execute_query(query)
        return photos
    except Exception as e:
        raise HTTPException(status_code=500, detail="Failed to fetch photos")

@app.post("/api/photos", response_model=Photo, status_code=201)
async def create_photo(
    photo: UploadFile = File(...),
    projectId: str = Form(...),
    userId: str = Form(...),
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
            projectId,
            userId,
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

# Schedule Changes
@app.get("/api/schedule-changes", response_model=List[ScheduleChange])
async def get_schedule_changes(taskId: Optional[str] = None):
    """Get all schedule changes, optionally filtered by task"""
    try:
        if taskId:
            query = "SELECT * FROM schedule_changes WHERE task_id = %s ORDER BY created_at DESC"
            changes = execute_query(query, (taskId,))
        else:
            query = "SELECT * FROM schedule_changes ORDER BY created_at DESC"
            changes = execute_query(query)
        return changes
    except Exception as e:
        raise HTTPException(status_code=500, detail="Failed to fetch schedule changes")

@app.post("/api/schedule-changes", response_model=ScheduleChange, status_code=201)
async def create_schedule_change(change: ScheduleChangeCreate):
    """Create a new schedule change"""
    try:
        change_id = str(uuid.uuid4())
        query = """
            INSERT INTO schedule_changes (id, task_id, user_id, reason, original_date, new_date, status)
            VALUES (%s, %s, %s, %s, %s, %s, %s)
        """
        params = (
            change_id,
            change.taskId,
            change.userId,
            change.reason,
            change.originalDate,
            change.newDate,
            change.status
        )
        result = execute_insert(query, params)
        
        # Create notification for project manager
        notification_id = str(uuid.uuid4())
        notification_query = """
            INSERT INTO notifications (id, user_id, title, message, type, is_read, related_entity_type, related_entity_id)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
        """
        notification_params = (
            notification_id,
            "manager-id",  # In a real app, this would be determined from the project
            "Schedule Change Alert",
            f"Schedule change reported for task: {change.reason}",
            "warning",
            False,
            "schedule_change",
            change_id
        )
        execute_insert(notification_query, notification_params)
        
        return result
    except Exception as e:
        raise HTTPException(status_code=400, detail="Invalid schedule change data")

@app.patch("/api/schedule-changes/{change_id}", response_model=ScheduleChange)
async def update_schedule_change(change_id: str, updates: ScheduleChangeUpdate):
    """Update a schedule change"""
    try:
        # Build dynamic update query
        update_fields = []
        params = []
        
        update_data = updates.model_dump(exclude_unset=True)
        
        for field, value in update_data.items():
            # Convert camelCase to snake_case
            if field == "originalDate":
                field = "original_date"
            elif field == "newDate":
                field = "new_date"
            
            update_fields.append(f"{field} = %s")
            params.append(value)
        
        if not update_fields:
            raise HTTPException(status_code=400, detail="No fields to update")
        
        params.append(change_id)
        query = f"UPDATE schedule_changes SET {', '.join(update_fields)} WHERE id = %s"
        
        result = execute_update(query, tuple(params))
        if not result:
            raise HTTPException(status_code=404, detail="Schedule change not found")
        return result
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=400, detail="Invalid schedule change data")

# Notifications
@app.get("/api/notifications", response_model=List[Notification])
async def get_notifications(userId: Optional[str] = None):
    """Get notifications for a user"""
    try:
        if not userId:
            # Return empty list if no user_id provided (matching TypeScript behavior)
            return []
        
        query = "SELECT * FROM notifications WHERE user_id = %s ORDER BY created_at DESC"
        notifications = execute_query(query, (userId,))
        return notifications
    except Exception as e:
        raise HTTPException(status_code=500, detail="Failed to fetch notifications")

@app.patch("/api/notifications/{notification_id}/read", status_code=204)
async def mark_notification_as_read(notification_id: str):
    """Mark a notification as read"""
    try:
        query = "UPDATE notifications SET is_read = true WHERE id = %s"
        rowcount = execute_query(query, (notification_id,), fetch_all=False)
        if rowcount == 0:
            raise HTTPException(status_code=404, detail="Notification not found")
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail="Failed to mark notification as read")

class MarkAllReadRequest(BaseModel):
    userId: str

@app.patch("/api/notifications/mark-all-read", status_code=204)
async def mark_all_notifications_as_read(request_data: MarkAllReadRequest):
    """Mark all notifications as read for a user"""
    try:
        user_id = request_data.userId
        if not user_id:
            raise HTTPException(status_code=400, detail="User ID is required")
        
        query = "UPDATE notifications SET is_read = true WHERE user_id = %s"
        execute_query(query, (user_id,), fetch_all=False)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail="Failed to mark all notifications as read")

# Dashboard stats
@app.get("/api/dashboard/stats", response_model=DashboardStats)
async def get_dashboard_stats():
    """Get dashboard statistics"""
    try:
        # Get active projects count
        active_projects_query = "SELECT COUNT(*) as count FROM projects WHERE status = 'active'"
        active_projects_result = execute_query(active_projects_query, fetch_one=True)
        active_projects = active_projects_result["count"] if active_projects_result else 0
        
        # Get pending tasks count
        pending_tasks_query = "SELECT COUNT(*) as count FROM tasks WHERE status IN ('pending', 'in-progress')"
        pending_tasks_result = execute_query(pending_tasks_query, fetch_one=True)
        pending_tasks = pending_tasks_result["count"] if pending_tasks_result else 0
        
        # Get total photos count
        photos_query = "SELECT COUNT(*) as count FROM photos"
        photos_result = execute_query(photos_query, fetch_one=True)
        photos_uploaded = photos_result["count"] if photos_result else 0
        
        # Get photos uploaded today
        today = datetime.now().date()
        photos_today_query = "SELECT COUNT(*) as count FROM photos WHERE DATE(created_at) = %s"
        photos_today_result = execute_query(photos_today_query, (today,), fetch_one=True)
        photos_uploaded_today = photos_today_result["count"] if photos_today_result else 0
        
        return DashboardStats(
            activeProjects=active_projects,
            pendingTasks=pending_tasks,
            photosUploaded=photos_uploaded,
            photosUploadedToday=photos_uploaded_today,
            crewMembers=28  # Static for demo
        )
    except Exception as e:
        print(f"Dashboard stats error: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch dashboard stats")

# In development, we need to proxy to Vite dev server
@app.api_route("/{path:path}", methods=["GET"])
async def catch_all(path: str, request: Request):
    """Catch-all route for development mode to proxy to Vite"""
    if is_development:
        # This should not be reached in development as Vite should handle routing
        return {"detail": "Not Found"}
    else:
        # In production, serve index.html for SPA routing
        if Path("dist/public/index.html").exists():
            return FileResponse("dist/public/index.html")
        return {"detail": "Not Found"}

if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", 5000))
    if is_development:
        print("Starting Python backend in development mode...")
        print("Note: Frontend should be served by Vite dev server on a different port")
    uvicorn.run(app, host="0.0.0.0", port=port)