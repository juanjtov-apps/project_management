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
app = FastAPI(title="Tower Flow API", version="1.0.0")

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

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
    due_date: Optional[datetime] = Field(None, alias="dueDate")

class ProjectCreate(ProjectBase):
    pass

class ProjectUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    location: Optional[str] = None
    status: Optional[str] = None
    progress: Optional[int] = None
    due_date: Optional[datetime] = Field(None, alias="dueDate")

class Project(ProjectBase):
    id: str
    created_at: datetime = Field(alias="createdAt")
    
    class Config:
        from_attributes = True
        populate_by_name = True

class TaskBase(BaseModel):
    title: str
    description: Optional[str] = None
    project_id: Optional[str] = Field(None, alias="projectId")
    assignee_id: Optional[str] = Field(None, alias="assigneeId")
    category: str = "project"
    status: str = "pending"
    priority: str = "medium"
    due_date: Optional[datetime] = Field(None, alias="dueDate")

class TaskCreate(TaskBase):
    pass

class TaskUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    project_id: Optional[str] = Field(None, alias="projectId")
    assignee_id: Optional[str] = Field(None, alias="assigneeId")
    category: Optional[str] = None
    status: Optional[str] = None
    priority: Optional[str] = None
    due_date: Optional[datetime] = Field(None, alias="dueDate")

class Task(TaskBase):
    id: str
    completed_at: Optional[datetime] = Field(None, alias="completedAt")
    created_at: datetime = Field(alias="createdAt")
    
    class Config:
        from_attributes = True
        populate_by_name = True

class ProjectLogBase(BaseModel):
    project_id: str = Field(alias="projectId")
    user_id: str = Field(alias="userId")
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
    created_at: datetime = Field(alias="createdAt")
    
    class Config:
        from_attributes = True
        populate_by_name = True

class PhotoBase(BaseModel):
    project_id: str = Field(alias="projectId")
    user_id: str = Field(alias="userId")
    filename: str
    original_name: str = Field(alias="originalName")
    description: Optional[str] = None
    tags: Optional[List[str]] = None

class PhotoCreate(PhotoBase):
    pass

class Photo(PhotoBase):
    id: str
    created_at: datetime = Field(alias="createdAt")
    
    class Config:
        from_attributes = True
        populate_by_name = True

class ScheduleChangeBase(BaseModel):
    task_id: str = Field(alias="taskId")
    user_id: str = Field(alias="userId")
    reason: str
    original_date: datetime = Field(alias="originalDate")
    new_date: datetime = Field(alias="newDate")
    status: str = "pending"

class ScheduleChangeCreate(ScheduleChangeBase):
    pass

class ScheduleChangeUpdate(BaseModel):
    reason: Optional[str] = None
    original_date: Optional[datetime] = Field(None, alias="originalDate")
    new_date: Optional[datetime] = Field(None, alias="newDate")
    status: Optional[str] = None

class ScheduleChange(ScheduleChangeBase):
    id: str
    created_at: datetime = Field(alias="createdAt")
    
    class Config:
        from_attributes = True
        populate_by_name = True

class NotificationBase(BaseModel):
    user_id: str = Field(alias="userId")
    title: str
    message: str
    type: str = "info"
    is_read: bool = Field(default=False, alias="isRead")
    related_entity_type: Optional[str] = Field(None, alias="relatedEntityType")
    related_entity_id: Optional[str] = Field(None, alias="relatedEntityId")

class NotificationCreate(NotificationBase):
    pass

class Notification(NotificationBase):
    id: str
    created_at: datetime = Field(alias="createdAt")
    
    class Config:
        from_attributes = True
        populate_by_name = True

class DashboardStats(BaseModel):
    active_projects: int = Field(alias="activeProjects")
    pending_tasks: int = Field(alias="pendingTasks")
    photos_uploaded: int = Field(alias="photosUploaded")
    photos_uploaded_today: int = Field(alias="photosUploadedToday")
    crew_members: int = Field(alias="crewMembers")
    
    class Config:
        populate_by_name = True

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
    """Convert database row to dictionary"""
    if row is None:
        return None
    return dict(zip([desc[0] for desc in cursor_description], row))

def execute_query(query: str, params: tuple = (), fetch_one: bool = False, fetch_all: bool = True):
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
            project.due_date
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
        
        for field, value in updates.model_dump(exclude_unset=True).items():
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

if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", 5000))
    uvicorn.run("python_server.app:app", host="0.0.0.0", port=port, reload=True)