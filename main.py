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
import psycopg2.extras
from psycopg2.extras import RealDictCursor
from psycopg2.pool import SimpleConnectionPool
from pydantic import BaseModel, Field
from dotenv import load_dotenv
import uvicorn

# Load environment variables
load_dotenv()

def format_datetime_for_frontend(dt_value):
    """Helper function to format datetime values for frontend consumption"""
    if not dt_value:
        return None
    
    # If it's already a datetime object
    if hasattr(dt_value, 'isoformat'):
        return dt_value.isoformat()
    
    # If it's a string, try to parse and format it
    try:
        # Handle various string formats from PostgreSQL
        dt_str = str(dt_value).replace('Z', '+00:00')
        
        # Try different parsing methods
        from datetime import datetime
        try:
            # First try direct ISO format parsing
            dt = datetime.fromisoformat(dt_str)
            return dt.isoformat()
        except:
            # Try parsing PostgreSQL timestamp format
            dt = datetime.strptime(dt_str.split('.')[0], '%Y-%m-%d %H:%M:%S')
            return dt.isoformat()
    except Exception as e:
        print(f"Date parsing error for value '{dt_value}': {e}")
        # Return the original string for debugging
        return str(dt_value)

# Create FastAPI app
app = FastAPI(title="Tower Flow API", version="1.0.0")

# RBAC functionality integrated directly

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

# Create connection pool with SSL handling
try:
    connection_pool = SimpleConnectionPool(
        minconn=1,
        maxconn=10,
        dsn=DATABASE_URL,
        # Add connection parameters to handle SSL issues
        connection_factory=None,
        keepalives_idle=300,
        keepalives_interval=30,
        keepalives_count=3
    )
    print("Database connection pool created successfully")
except Exception as e:
    print(f"Failed to create connection pool: {e}")
    raise

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
    """Context manager for database connections with improved error handling"""
    def __init__(self):
        self.conn = None
        
    def __enter__(self):
        try:
            self.conn = get_db_connection()
            self.conn.autocommit = False  # Ensure explicit transaction control
            return self.conn
        except Exception as e:
            print(f"Failed to get database connection: {e}")
            raise
        
    def __exit__(self, exc_type, exc_val, exc_tb):
        if self.conn:
            try:
                if exc_type is None:
                    # No exception occurred, commit the transaction
                    self.conn.commit()
                else:
                    # Exception occurred, rollback
                    self.conn.rollback()
                    print(f"Database transaction rolled back due to: {exc_val}")
            except Exception as e:
                print(f"Error during transaction cleanup: {e}")
            finally:
                try:
                    return_db_connection(self.conn)
                except Exception as e:
                    print(f"Error returning connection to pool: {e}")

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

# Dashboard stats - Optimized single query
@app.get("/api/dashboard/stats", response_model=DashboardStats)
async def get_dashboard_stats():
    """Get dashboard statistics with optimized single query"""
    try:
        today = datetime.now().date()
        
        # Single optimized query to get all stats at once
        optimized_query = """
        WITH project_stats AS (
            SELECT COUNT(*) FILTER (WHERE status = 'active') as active_projects
            FROM projects
        ),
        task_stats AS (
            SELECT COUNT(*) FILTER (WHERE status IN ('pending', 'in-progress')) as pending_tasks
            FROM tasks
        ),
        photo_stats AS (
            SELECT 
                COUNT(*) as total_photos,
                COUNT(*) FILTER (WHERE DATE(created_at) = %s) as photos_today
            FROM photos
        )
        SELECT 
            ps.active_projects,
            ts.pending_tasks,
            phs.total_photos as photos_uploaded,
            phs.photos_today as photos_uploaded_today
        FROM project_stats ps, task_stats ts, photo_stats phs
        """
        
        result = execute_query(optimized_query, (today,), fetch_one=True)
        
        if not result:
            # Fallback values if query fails
            return DashboardStats(
                activeProjects=0,
                pendingTasks=0,
                photosUploaded=0,
                photosUploadedToday=0,
                crewMembers=28
            )
        
        return DashboardStats(
            activeProjects=result.get("active_projects", 0),
            pendingTasks=result.get("pending_tasks", 0),
            photosUploaded=result.get("photos_uploaded", 0),
            photosUploadedToday=result.get("photos_uploaded_today", 0),
            crewMembers=28  # Static for demo
        )
    except Exception as e:
        print(f"Dashboard stats error: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch dashboard stats")

# Add RBAC endpoints directly
@app.get("/rbac/companies")
async def get_companies():
    """Get all companies"""
    try:
        query = "SELECT * FROM companies ORDER BY name"
        companies = execute_query(query)
        
        # Add frontend-compatible fields to each company
        for company in companies:
            if company.get('settings'):
                company['type'] = company['settings'].get('type', 'customer')
                company['subscription_tier'] = company['settings'].get('subscription_tier', 'basic')
            else:
                company['type'] = 'customer'
                company['subscription_tier'] = 'basic'
            company['is_active'] = company.get('status') == 'active'
            
            # Fix date formatting for frontend (PostgreSQL returns camelCase field names)
            company['created_at'] = format_datetime_for_frontend(company.get('createdAt'))
            company['updated_at'] = format_datetime_for_frontend(company.get('updatedAt'))
            
        return companies
    except Exception as e:
        raise HTTPException(status_code=500, detail="Failed to fetch companies")

@app.get("/rbac/role-templates")
async def get_role_templates():
    """Get all role templates"""
    try:
        query = "SELECT * FROM role_templates ORDER BY name"
        templates = execute_query(query)
        return templates
    except Exception as e:
        raise HTTPException(status_code=500, detail="Failed to fetch role templates")

@app.get("/rbac/permissions")
async def get_permissions():
    """Get all permissions"""
    try:
        query = "SELECT * FROM permissions ORDER BY id"
        permissions = execute_query(query)
        return permissions
    except Exception as e:
        raise HTTPException(status_code=500, detail="Failed to fetch permissions")

@app.get("/rbac/roles")
async def get_roles():
    """Get all roles"""
    try:
        query = "SELECT * FROM roles ORDER BY name"
        roles = execute_query(query)
        return roles
    except Exception as e:
        raise HTTPException(status_code=500, detail="Failed to fetch roles")

@app.get("/rbac/users")
async def get_users():
    """Get all users"""
    try:
        query = """
            SELECT u.*, 
                   cu.company_id, 
                   c.name as company_name, 
                   cu.role_id, 
                   r.name as role_name
            FROM users u
            LEFT JOIN company_users cu ON u.id = cu.user_id
            LEFT JOIN companies c ON cu.company_id = c.id
            LEFT JOIN roles r ON cu.role_id = r.id
            ORDER BY c.name NULLS LAST, u.name
        """
        users = execute_query(query)
        
        if not users:
            return []
            
        # Format dates for frontend and ensure proper field mapping
        for user in users:
            user['created_at'] = format_datetime_for_frontend(user.get('createdAt'))
            user['updated_at'] = format_datetime_for_frontend(user.get('updatedAt'))
            
            # Map camelCase to snake_case for company_name (frontend expects snake_case)
            if user.get('companyName'):
                user['company_name'] = user['companyName']
            elif not user.get('company_name'):
                user['company_name'] = None
        
        return users
    except Exception as e:
        print(f"Error fetching users: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch users")

@app.get("/rbac/companies/{company_id}/users")
async def get_company_users(company_id: int):
    """Get users for a specific company"""
    try:
        query = """
            SELECT u.*, cu.role_id, r.name as role_name
            FROM users u
            JOIN company_users cu ON u.id = cu.user_id
            LEFT JOIN roles r ON cu.role_id = r.id
            WHERE cu.company_id = %s
            ORDER BY u.name
        """
        users = execute_query(query, (company_id,))
        return users
    except Exception as e:
        raise HTTPException(status_code=500, detail="Failed to fetch company users")

@app.post("/rbac/users")
async def create_user(request: Request):
    """Create a new user"""
    try:
        data = await request.json()
        
        # Validate required fields
        required_fields = ['email', 'first_name', 'last_name', 'company_id', 'role_id']
        for field in required_fields:
            if not data.get(field):
                raise HTTPException(status_code=400, detail=f"Missing required field: {field}")
        
        # Hash password if provided, otherwise generate a temporary one
        password = data.get('password', 'TempPassword123!')
        import bcrypt
        hashed_password = bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
        
        # Generate username from email
        username = data['email'].split('@')[0]
        
        # Generate user ID
        import uuid
        user_id = str(uuid.uuid4())[:8]
        
        current_time = datetime.utcnow()
        
        with DatabaseConnection() as conn:
            with conn.cursor() as cursor:
                # Create user
                cursor.execute("""
                    INSERT INTO users (id, username, password, name, email, first_name, last_name, is_active, created_at, updated_at)
                    VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                    RETURNING *
                """, (
                    user_id,
                    username,
                    hashed_password,
                    f"{data['first_name']} {data['last_name']}",
                    data['email'],
                    data['first_name'],
                    data['last_name'],
                    True,
                    current_time,
                    current_time
                ))
                
                new_user = cursor.fetchone()
                if not new_user:
                    raise HTTPException(status_code=500, detail="Failed to create user")
                
                # Convert to dict
                user_dict = dict(zip([desc[0] for desc in cursor.description], new_user))
                
                # Create company-user association
                cursor.execute("""
                    INSERT INTO company_users (user_id, company_id, role_id, created_at)
                    VALUES (%s, %s, %s, %s)
                """, (user_id, data['company_id'], data['role_id'], current_time))
                
                conn.commit()
                
                # Format response
                user_dict['created_at'] = format_datetime_for_frontend(user_dict.get('created_at'))
                user_dict['updated_at'] = format_datetime_for_frontend(user_dict.get('updated_at'))
                
                return user_dict
                
    except HTTPException:
        raise
    except Exception as e:
        print(f"User creation error: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to create user: {str(e)}")

@app.patch("/rbac/users/{user_id}")
async def update_user_status(user_id: str, request: Request):
    """Update user status or other properties"""
    try:
        data = await request.json()
        
        # Build dynamic update query based on provided fields
        update_fields = []
        params = []
        
        if 'is_active' in data:
            update_fields.append("is_active = %s")
            params.append(data['is_active'])
        
        if 'email' in data:
            update_fields.append("email = %s")
            params.append(data['email'])
            
        if 'first_name' in data:
            update_fields.append("first_name = %s")
            params.append(data['first_name'])
            
        if 'last_name' in data:
            update_fields.append("last_name = %s")
            params.append(data['last_name'])
        
        if not update_fields:
            raise HTTPException(status_code=400, detail="No valid fields to update")
        
        # Add updated timestamp and user ID
        update_fields.append("updated_at = CURRENT_TIMESTAMP")
        params.append(user_id)
        
        query = f"""
            UPDATE users 
            SET {', '.join(update_fields)}
            WHERE id = %s
            RETURNING *
        """
        
        updated_user = execute_query(query, params)
        if not updated_user:
            raise HTTPException(status_code=404, detail="User not found")
        
        # Format dates for frontend
        user = updated_user[0] if isinstance(updated_user, list) else updated_user
        user['created_at'] = format_datetime_for_frontend(user.get('createdAt'))
        user['updated_at'] = format_datetime_for_frontend(user.get('updatedAt'))
        
        return user
    except HTTPException:
        raise
    except Exception as e:
        print(f"User update error: {e}")
        raise HTTPException(status_code=500, detail="Failed to update user")

@app.post("/rbac/roles")
async def create_role(request: Request):
    """Create a new role"""
    try:
        data = await request.json()
        
        # Validate required fields
        if not data.get('name'):
            raise HTTPException(status_code=400, detail="Role name is required")
        
        current_time = datetime.utcnow()
        
        with DatabaseConnection() as conn:
            with conn.cursor() as cursor:
                cursor.execute("""
                    INSERT INTO roles (company_id, name, description, template_id, custom_permissions, is_template, is_active, created_at, updated_at)
                    VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
                    RETURNING *
                """, (
                    data.get('company_id'),
                    data['name'],
                    data.get('description', ''),
                    data.get('template_id'),
                    psycopg2.extras.Json(data.get('custom_permissions', [])) if data.get('custom_permissions') else None,
                    data.get('is_template', False),
                    data.get('is_active', True),
                    current_time,
                    current_time
                ))
                
                new_role = cursor.fetchone()
                if not new_role:
                    raise HTTPException(status_code=500, detail="Failed to create role")
                
                # Convert to dict
                role_dict = dict(zip([desc[0] for desc in cursor.description], new_role))
                conn.commit()
                
                # Format response
                role_dict['created_at'] = format_datetime_for_frontend(role_dict.get('created_at'))
                role_dict['updated_at'] = format_datetime_for_frontend(role_dict.get('updated_at'))
                
                return role_dict
                
    except HTTPException:
        raise
    except Exception as e:
        print(f"Role creation error: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to create role: {str(e)}")

@app.post("/rbac/companies")
async def create_company(request: Request):
    """Create a new company"""
    try:
        data = await request.json()
        
        # Validate required fields
        if not data.get('name'):
            raise HTTPException(status_code=400, detail="Company name is required")
        
        # Map frontend fields to database schema
        # Frontend sends: name, type, subscription_tier
        # Database has: name, domain, status, settings
        query = """
            INSERT INTO companies (name, domain, status, settings)
            VALUES (%s, %s, %s, %s)
            RETURNING *
        """
        
        # Handle settings as JSONB - include type and subscription_tier in settings
        settings = {
            'type': data.get('type', 'customer'),
            'subscription_tier': data.get('subscription_tier', 'basic'),
            **data.get('settings', {})
        }
        
        company = execute_query(
            query, 
            (
                data.get('name'), 
                data.get('domain', f"{data.get('name', 'company').lower().replace(' ', '')}.com"),
                'active',  # Default status
                psycopg2.extras.Json(settings)
            ),
            fetch_one=True
        )
        
        # Add type and subscription_tier to response for frontend compatibility
        if company and company.get('settings'):
            company['type'] = company['settings'].get('type', 'customer')
            company['subscription_tier'] = company['settings'].get('subscription_tier', 'basic')
            company['is_active'] = company.get('status') == 'active'
            
            # Fix date formatting for frontend (PostgreSQL returns camelCase field names)
            company['created_at'] = format_datetime_for_frontend(company.get('createdAt'))
            company['updated_at'] = format_datetime_for_frontend(company.get('updatedAt'))
        
        return company
    except Exception as e:
        print(f"RBAC company creation error: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to create company: {str(e)}")

@app.patch("/rbac/companies/{company_id}")
async def update_company(company_id: int, request: Request):
    """Update a company"""
    try:
        data = await request.json()
        
        # Build dynamic update query based on provided fields
        update_fields = []
        params = []
        
        if data.get('name'):
            update_fields.append("name = %s")
            params.append(data['name'])
            
        if data.get('domain'):
            update_fields.append("domain = %s")
            params.append(data['domain'])
            
        if data.get('status'):
            update_fields.append("status = %s")
            params.append(data['status'])
        elif 'is_active' in data:
            # Handle is_active field from frontend
            status = 'active' if data.get('is_active') else 'inactive'
            update_fields.append("status = %s")
            params.append(status)
            
        # Handle settings update
        if any(key in data for key in ['type', 'subscription_tier', 'settings']):
            # Get existing settings first
            existing_query = "SELECT settings FROM companies WHERE id = %s"
            existing_company = execute_query(existing_query, (company_id,), fetch_one=True)
            
            existing_settings = existing_company.get('settings', {}) if existing_company else {}
            
            # Update settings
            if data.get('type'):
                existing_settings['type'] = data['type']
            if data.get('subscription_tier'):
                existing_settings['subscription_tier'] = data['subscription_tier']
            if data.get('settings'):
                existing_settings.update(data['settings'])
            
            update_fields.append("settings = %s")
            params.append(psycopg2.extras.Json(existing_settings))
        
        if not update_fields:
            raise HTTPException(status_code=400, detail="No valid fields to update")
        
        # Add company_id to params for WHERE clause
        params.append(company_id)
        
        query = f"""
            UPDATE companies 
            SET {', '.join(update_fields)}, updated_at = CURRENT_TIMESTAMP
            WHERE id = %s
            RETURNING *
        """
        
        company = execute_query(query, tuple(params), fetch_one=True)
        
        if not company:
            raise HTTPException(status_code=404, detail="Company not found")
        
        # Add frontend-compatible fields
        if company.get('settings'):
            company['type'] = company['settings'].get('type', 'customer')
            company['subscription_tier'] = company['settings'].get('subscription_tier', 'basic')
        else:
            company['type'] = 'customer'
            company['subscription_tier'] = 'basic'
        company['is_active'] = company.get('status') == 'active'
        
        # Fix date formatting - map database fields to frontend fields (PostgreSQL returns camelCase)
        company['created_at'] = format_datetime_for_frontend(company.get('createdAt'))
        company['updated_at'] = format_datetime_for_frontend(company.get('updatedAt'))
        
        return company
    except HTTPException:
        raise
    except Exception as e:
        print(f"RBAC company update error: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to update company: {str(e)}")

# API RBAC endpoints (with /api prefix for frontend compatibility)
@app.get("/api/rbac/permissions")
async def get_api_permissions():
    """Get all permissions for API"""
    permissions = [
        {"id": "1", "name": "View Projects", "description": "View project details", "category": "project", "resource_type": "project", "action": "read", "created_at": "2025-01-31"},
        {"id": "2", "name": "Create Projects", "description": "Create new projects", "category": "project", "resource_type": "project", "action": "create", "created_at": "2025-01-31"},
        {"id": "3", "name": "Edit Projects", "description": "Edit existing projects", "category": "project", "resource_type": "project", "action": "update", "created_at": "2025-01-31"},
        {"id": "4", "name": "Delete Projects", "description": "Delete projects", "category": "project", "resource_type": "project", "action": "delete", "created_at": "2025-01-31"},
        {"id": "5", "name": "View Tasks", "description": "View task details", "category": "task", "resource_type": "task", "action": "read", "created_at": "2025-01-31"},
        {"id": "6", "name": "Create Tasks", "description": "Create new tasks", "category": "task", "resource_type": "task", "action": "create", "created_at": "2025-01-31"},
        {"id": "7", "name": "Edit Tasks", "description": "Edit existing tasks", "category": "task", "resource_type": "task", "action": "update", "created_at": "2025-01-31"},
        {"id": "8", "name": "Delete Tasks", "description": "Delete tasks", "category": "task", "resource_type": "task", "action": "delete", "created_at": "2025-01-31"},
        {"id": "9", "name": "Assign Tasks", "description": "Assign tasks to users", "category": "task", "resource_type": "task", "action": "assign", "created_at": "2025-01-31"},
        {"id": "10", "name": "View Photos", "description": "View project photos", "category": "media", "resource_type": "photo", "action": "read", "created_at": "2025-01-31"},
        {"id": "11", "name": "Upload Photos", "description": "Upload project photos", "category": "media", "resource_type": "photo", "action": "create", "created_at": "2025-01-31"},
        {"id": "12", "name": "Delete Photos", "description": "Delete project photos", "category": "media", "resource_type": "photo", "action": "delete", "created_at": "2025-01-31"},
        {"id": "13", "name": "View Logs", "description": "View project logs", "category": "logging", "resource_type": "log", "action": "read", "created_at": "2025-01-31"},
        {"id": "14", "name": "Create Logs", "description": "Create project log entries", "category": "logging", "resource_type": "log", "action": "create", "created_at": "2025-01-31"},
        {"id": "15", "name": "Edit Logs", "description": "Edit project log entries", "category": "logging", "resource_type": "log", "action": "update", "created_at": "2025-01-31"},
        {"id": "16", "name": "View Users", "description": "View user profiles", "category": "user", "resource_type": "user", "action": "read", "created_at": "2025-01-31"},
        {"id": "17", "name": "Create Users", "description": "Create new users", "category": "user", "resource_type": "user", "action": "create", "created_at": "2025-01-31"},
        {"id": "18", "name": "Edit Users", "description": "Edit user profiles", "category": "user", "resource_type": "user", "action": "update", "created_at": "2025-01-31"},
        {"id": "19", "name": "Delete Users", "description": "Delete users", "category": "user", "resource_type": "user", "action": "delete", "created_at": "2025-01-31"},
        {"id": "20", "name": "Manage Roles", "description": "Manage user roles", "category": "role", "resource_type": "role", "action": "manage", "created_at": "2025-01-31"},
        {"id": "21", "name": "View Schedule", "description": "View project schedules", "category": "schedule", "resource_type": "schedule", "action": "read", "created_at": "2025-01-31"},
        {"id": "22", "name": "Edit Schedule", "description": "Edit project schedules", "category": "schedule", "resource_type": "schedule", "action": "update", "created_at": "2025-01-31"},
        {"id": "23", "name": "View Reports", "description": "View project reports", "category": "report", "resource_type": "report", "action": "read", "created_at": "2025-01-31"},
        {"id": "24", "name": "Create Reports", "description": "Create project reports", "category": "report", "resource_type": "report", "action": "create", "created_at": "2025-01-31"},
        {"id": "25", "name": "View Financials", "description": "View financial information", "category": "finance", "resource_type": "finance", "action": "read", "created_at": "2025-01-31"},
        {"id": "26", "name": "Manage Notifications", "description": "Manage system notifications", "category": "system", "resource_type": "notification", "action": "manage", "created_at": "2025-01-31"}
    ]
    return permissions

@app.get("/api/rbac/roles")
async def get_api_roles():
    """Get all roles for API"""
    roles = [
        {"id": "1", "name": "Platform Admin", "description": "Full system access", "company_id": "platform", "permissions": ["1","2","3","4","5","6","7","8","9","10","11","12","13","14","15","16","17","18","19","20","21","22","23","24","25","26"], "is_template": True, "created_at": "2025-01-31", "updated_at": "2025-01-31"},
        {"id": "2", "name": "Company Admin", "description": "Full company access", "company_id": "comp-001", "permissions": ["1","2","3","4","5","6","7","8","9","10","11","12","13","14","15","16","17","18","19","20","21","22","23","24"], "is_template": True, "created_at": "2025-01-31", "updated_at": "2025-01-31"},
        {"id": "3", "name": "Project Manager", "description": "Project management access", "company_id": "comp-001", "permissions": ["1","2","3","5","6","7","8","9","10","11","13","14","16","21","22","23","24"], "is_template": True, "created_at": "2025-01-31", "updated_at": "2025-01-31"},
        {"id": "4", "name": "Subcontractor", "description": "Limited project access", "company_id": "comp-001", "permissions": ["1","5","6","7","10","11","13","14","21"], "is_template": True, "created_at": "2025-01-31", "updated_at": "2025-01-31"},
        {"id": "5", "name": "Client", "description": "View-only access to assigned projects", "company_id": "comp-001", "permissions": ["1","5","10","13","21","23"], "is_template": True, "created_at": "2025-01-31", "updated_at": "2025-01-31"},
        {"id": "6", "name": "Viewer", "description": "Read-only access", "company_id": "comp-001", "permissions": ["1","5","10","13","21"], "is_template": True, "created_at": "2025-01-31", "updated_at": "2025-01-31"}
    ]
    return roles

@app.get("/api/rbac/companies")
async def get_api_companies():
    """Get all companies for API"""
    companies = [
        {"id": "platform", "name": "Tower Flow Platform", "type": "platform", "subscription_tier": "enterprise", "created_at": "2025-01-31", "is_active": True},
        {"id": "comp-001", "name": "ABC Construction", "type": "customer", "subscription_tier": "professional", "created_at": "2025-01-31", "is_active": True},
        {"id": "comp-002", "name": "Elite Builders", "type": "customer", "subscription_tier": "basic", "created_at": "2025-01-31", "is_active": True},
        {"id": "comp-003", "name": "Metro Development", "type": "partner", "subscription_tier": "enterprise", "created_at": "2025-01-31", "is_active": True}
    ]
    return companies

@app.get("/api/rbac/users")
async def get_api_users():
    """Get all users for API"""
    users = [
        {"id": "admin-001", "email": "admin@towerflow.com", "first_name": "System", "last_name": "Admin", "company_id": "platform", "role_id": "1", "is_active": True, "created_at": "2025-01-31", "last_login": "2025-01-31T19:00:00", "role_name": "Platform Admin", "company_name": "Tower Flow Platform"},
        {"id": "pm-004", "email": "sergio@towerflow.com", "first_name": "Sergio", "last_name": "Rodriguez", "company_id": "comp-001", "role_id": "3", "is_active": True, "created_at": "2025-01-31", "last_login": "2025-01-31T19:15:00", "role_name": "Project Manager", "company_name": "ABC Construction"},
        {"id": "sub-001", "email": "mike@contractorco.com", "first_name": "Mike", "last_name": "Wilson", "company_id": "comp-001", "role_id": "4", "is_active": True, "created_at": "2025-01-31", "last_login": "2025-01-30T14:30:00", "role_name": "Subcontractor", "company_name": "ABC Construction"},
        {"id": "client-001", "email": "jane@clientcorp.com", "first_name": "Jane", "last_name": "Smith", "company_id": "comp-002", "role_id": "5", "is_active": True, "created_at": "2025-01-31", "last_login": "2025-01-29T10:15:00", "role_name": "Client", "company_name": "Elite Builders"}
    ]
    return users

@app.post("/api/rbac/users")
async def create_api_user(request: Request):
    """Create a new user"""
    try:
        data = await request.json()
        new_user = {
            "id": f"user-{len((await get_api_users())) + 1:03d}",
            "email": data["email"],
            "first_name": data["first_name"],
            "last_name": data["last_name"],
            "company_id": data["company_id"],
            "role_id": data["role_id"],
            "is_active": True,
            "created_at": "2025-01-31T19:15:00",
            "last_login": None,
            "role_name": "New Role",
            "company_name": "Company Name"
        }
        return new_user
    except Exception as e:
        raise HTTPException(status_code=400, detail="Invalid user data")

@app.patch("/api/rbac/users/{user_id}")
async def update_api_user(user_id: str, request: Request):
    """Update a user"""
    try:
        data = await request.json()
        return {"id": user_id, "message": "User updated successfully"}
    except Exception as e:
        raise HTTPException(status_code=400, detail="Invalid user data")

@app.delete("/api/rbac/users/{user_id}")
async def delete_api_user(user_id: str):
    """Delete a user"""
    return {"message": "User deleted successfully"}

@app.post("/api/rbac/roles")
async def create_api_role(request: Request):
    """Create a new role"""
    try:
        data = await request.json()
        new_role = {
            "id": f"role-{len((await get_api_roles())) + 1:03d}",
            "name": data["name"],
            "description": data["description"],
            "company_id": data["company_id"],
            "permissions": data.get("permissions", []),
            "is_template": data.get("is_template", False),
            "created_at": "2025-01-31T19:15:00",
            "updated_at": "2025-01-31T19:15:00"
        }
        return new_role
    except Exception as e:
        raise HTTPException(status_code=400, detail="Invalid role data")

@app.patch("/api/rbac/roles/{role_id}")
async def update_api_role(role_id: str, request: Request):
    """Update a role"""
    try:
        data = await request.json()
        return {"id": role_id, "message": "Role updated successfully"}
    except Exception as e:
        raise HTTPException(status_code=400, detail="Invalid role data")

@app.delete("/api/rbac/roles/{role_id}")
async def delete_api_role(role_id: str):
    """Delete a role"""
    return {"message": "Role deleted successfully"}

@app.post("/api/rbac/companies")
async def create_api_company(request: Request):
    """Create a new company"""
    try:
        data = await request.json()
        
        # Validate required fields
        if not data.get("name"):
            raise HTTPException(status_code=400, detail="Company name is required")
        
        # Get current companies to generate new ID
        companies = await get_api_companies()
        next_id = len(companies) + 1
        
        new_company = {
            "id": f"comp-{next_id:03d}",
            "name": data["name"],
            "type": data.get("type", "customer"),
            "subscription_tier": data.get("subscription_tier", "basic"),
            "created_at": "2025-01-31T19:15:00",
            "is_active": True
        }
        return new_company
    except HTTPException:
        raise
    except Exception as e:
        print(f"Company creation error: {e}")
        raise HTTPException(status_code=400, detail=f"Invalid company data: {str(e)}")

@app.patch("/api/rbac/companies/{company_id}")
async def update_api_company(company_id: str, request: Request):
    """Update a company"""
    try:
        data = await request.json()
        return {"id": company_id, "message": "Company updated successfully"}
    except Exception as e:
        raise HTTPException(status_code=400, detail="Invalid company data")

# Health check endpoint
@app.get("/health")
async def health_check():
    return {"status": "ok", "message": "Tower Flow API is running"}

# Catch-all route with proper 404 status
@app.api_route("/{path:path}", methods=["GET"])
async def catch_all(path: str, request: Request):
    """Catch-all route for development mode with proper 404 status"""
    if is_development:
        # Return proper 404 for API paths that don't exist
        if path.startswith("api/"):
            raise HTTPException(status_code=404, detail="API endpoint not found")
        # For non-API paths, return 404 as well
        raise HTTPException(status_code=404, detail="Not Found")
    else:
        # In production, serve index.html for SPA routing
        if Path("dist/public/index.html").exists():
            return FileResponse("dist/public/index.html")
        raise HTTPException(status_code=404, detail="Not Found")

if __name__ == "__main__":
    import uvicorn
    port = 8000  # Force port 8000 for API backend
    print("Starting Tower Flow FastAPI server on port 8000...")
    uvicorn.run(app, host="0.0.0.0", port=port, log_level="info")