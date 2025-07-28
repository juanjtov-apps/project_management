"""
Database repositories for data access.
"""
import uuid
from datetime import datetime
from typing import List, Optional, Dict, Any
from src.database.connection import db_manager
from src.models import *
from src.utils.data_conversion import to_camel_case, to_snake_case


class BaseRepository:
    """Base repository with common database operations."""
    
    def __init__(self, table_name: str):
        self.table_name = table_name
    
    def _convert_to_camel_case(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """Convert snake_case keys to camelCase for frontend compatibility."""
        result = to_camel_case(data)
        return result if isinstance(result, dict) else data
    
    def _convert_from_camel_case(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """Convert camelCase keys to snake_case for database operations."""
        result = to_snake_case(data)
        return result if isinstance(result, dict) else data


class ProjectRepository(BaseRepository):
    """Repository for project operations."""
    
    def __init__(self):
        super().__init__("projects")
    
    async def get_all(self) -> List[Project]:
        """Get all projects."""
        query = f"SELECT * FROM {self.table_name} ORDER BY created_at DESC"
        rows = await db_manager.execute_query(query)
        return [Project(**self._convert_to_camel_case(dict(row))) for row in rows]
    
    async def get_by_id(self, project_id: str) -> Optional[Project]:
        """Get project by ID."""
        query = f"SELECT * FROM {self.table_name} WHERE id = $1"
        row = await db_manager.execute_one(query, project_id)
        if row:
            return Project(**self._convert_to_camel_case(dict(row)))
        return None
    
    async def create(self, project: ProjectCreate) -> Project:
        """Create a new project."""
        project_id = str(uuid.uuid4())
        now = datetime.utcnow()
        
        data = project.dict(by_alias=True)
        data = self._convert_from_camel_case(data)
        
        query = f"""
            INSERT INTO {self.table_name} 
            (id, name, description, location, status, progress, due_date, created_at)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
            RETURNING *
        """
        
        row = await db_manager.execute_one(
            query, project_id, data.get('name'), data.get('description'), 
            data.get('location'), data.get('status'), data.get('progress'),
            data.get('due_date'), now
        )
        return Project(**self._convert_to_camel_case(dict(row)))
    
    async def update(self, project_id: str, project_update: ProjectUpdate) -> Optional[Project]:
        """Update an existing project."""
        data = project_update.dict(exclude_unset=True, by_alias=True)
        data = self._convert_from_camel_case(data)
        
        if not data:
            return await self.get_by_id(project_id)
        
        set_clauses = []
        values = []
        param_count = 1
        
        for key, value in data.items():
            set_clauses.append(f"{key} = ${param_count}")
            values.append(value)
            param_count += 1
        
        values.append(project_id)
        
        query = f"""
            UPDATE {self.table_name} 
            SET {', '.join(set_clauses)}
            WHERE id = ${param_count}
            RETURNING *
        """
        
        row = await db_manager.execute_one(query, *values)
        if row:
            return Project(**self._convert_to_camel_case(dict(row)))
        return None
    
    async def delete(self, project_id: str) -> bool:
        """Delete a project."""
        query = f"DELETE FROM {self.table_name} WHERE id = $1"
        result = await db_manager.execute_command(query, project_id)
        return "DELETE 1" in result


class TaskRepository(BaseRepository):
    """Repository for task operations."""
    
    def __init__(self):
        super().__init__("tasks")
    
    async def get_all(self, project_id: Optional[str] = None, status: Optional[str] = None, 
                      category: Optional[str] = None, assigned_to: Optional[str] = None) -> List[Task]:
        """Get tasks with optional filters."""
        query = f"SELECT * FROM {self.table_name} WHERE 1=1"
        params = []
        param_count = 1
        
        if project_id:
            query += f" AND project_id = ${param_count}"
            params.append(project_id)
            param_count += 1
        
        if status:
            query += f" AND status = ${param_count}"
            params.append(status)
            param_count += 1
        
        if category:
            query += f" AND category = ${param_count}"
            params.append(category)
            param_count += 1
        
        if assigned_to:
            query += f" AND assignee_id = ${param_count}"
            params.append(assigned_to)
            param_count += 1
        
        query += " ORDER BY created_at DESC"
        rows = await db_manager.execute_query(query, *params)
        return [Task(**self._convert_to_camel_case(dict(row))) for row in rows]
    
    async def get_by_id(self, task_id: str) -> Optional[Task]:
        """Get task by ID."""
        query = f"SELECT * FROM {self.table_name} WHERE id = $1"
        row = await db_manager.execute_one(query, task_id)
        if row:
            return Task(**self._convert_to_camel_case(dict(row)))
        return None
    
    async def create(self, task: TaskCreate) -> Task:
        """Create a new task."""
        task_id = str(uuid.uuid4())
        now = datetime.utcnow()
        
        data = task.dict(by_alias=True)
        data = self._convert_from_camel_case(data)
        
        query = f"""
            INSERT INTO {self.table_name} 
            (id, title, description, status, priority, category, project_id, 
             assignee_id, due_date, created_at)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
            RETURNING *
        """
        
        row = await db_manager.execute_one(
            query, task_id, data.get('title'), data.get('description'),
            data.get('status'), data.get('priority'), data.get('category'),
            data.get('project_id'), data.get('assignee_id'), data.get('due_date'), now
        )
        return Task(**self._convert_to_camel_case(dict(row)))
    
    async def update(self, task_id: str, task_update: TaskUpdate) -> Optional[Task]:
        """Update an existing task."""
        data = task_update.dict(exclude_unset=True, by_alias=True)
        data = self._convert_from_camel_case(data)
        
        if not data:
            return await self.get_by_id(task_id)
        
        set_clauses = []
        values = []
        param_count = 1
        
        for key, value in data.items():
            set_clauses.append(f"{key} = ${param_count}")
            values.append(value)
            param_count += 1
        
        values.append(task_id)
        
        query = f"""
            UPDATE {self.table_name} 
            SET {', '.join(set_clauses)}
            WHERE id = ${param_count}
            RETURNING *
        """
        
        row = await db_manager.execute_one(query, *values)
        if row:
            return Task(**self._convert_to_camel_case(dict(row)))
        return None
    
    async def delete(self, task_id: str) -> bool:
        """Delete a task."""
        query = f"DELETE FROM {self.table_name} WHERE id = $1"
        result = await db_manager.execute_command(query, task_id)
        return "DELETE 1" in result


class PhotoRepository(BaseRepository):
    """Repository for photo operations."""
    
    def __init__(self):
        super().__init__("photos")
    
    async def get_all(self, project_id: Optional[str] = None, uploaded_by: Optional[str] = None) -> List[Photo]:
        """Get photos with optional filters."""
        query = f"SELECT * FROM {self.table_name} WHERE 1=1"
        params = []
        param_count = 1
        
        if project_id:
            query += f" AND project_id = ${param_count}"
            params.append(project_id)
            param_count += 1
        
        if uploaded_by:
            query += f" AND uploaded_by = ${param_count}"
            params.append(uploaded_by)
            param_count += 1
        
        query += " ORDER BY created_at DESC"
        rows = await db_manager.execute_query(query, *params)
        return [Photo(**self._convert_to_camel_case(dict(row))) for row in rows]
    
    async def get_by_id(self, photo_id: str) -> Optional[Photo]:
        """Get photo by ID."""
        query = f"SELECT * FROM {self.table_name} WHERE id = $1"
        row = await db_manager.execute_one(query, photo_id)
        if row:
            return Photo(**self._convert_to_camel_case(dict(row)))
        return None
    
    async def create(self, photo: PhotoCreate, filename: str, file_size: int, mime_type: str) -> Photo:
        """Create a new photo record."""
        photo_id = str(uuid.uuid4())
        now = datetime.utcnow()
        
        data = photo.dict(by_alias=True)
        data = self._convert_from_camel_case(data)
        
        query = f"""
            INSERT INTO {self.table_name} 
            (id, filename, project_id, description, file_size, mime_type, uploaded_by, created_at)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
            RETURNING *
        """
        
        row = await db_manager.execute_one(
            query, photo_id, filename, data.get('project_id'),
            data.get('description'), file_size, mime_type, data.get('uploaded_by'), now
        )
        return Photo(**self._convert_to_camel_case(dict(row)))
    
    async def delete(self, photo_id: str) -> bool:
        """Delete a photo."""
        query = f"DELETE FROM {self.table_name} WHERE id = $1"
        result = await db_manager.execute_command(query, photo_id)
        return "DELETE 1" in result


class DashboardRepository(BaseRepository):
    """Repository for dashboard statistics."""
    
    def __init__(self):
        super().__init__("")
    
    async def get_comprehensive_stats(self) -> Dict[str, Any]:
        """Get comprehensive dashboard statistics."""
        # Project stats
        project_stats_query = """
            SELECT 
                COUNT(*) as total_projects,
                COUNT(*) FILTER (WHERE status = 'active') as active_projects,
                COUNT(*) FILTER (WHERE status = 'completed') as completed_projects,
                COALESCE(AVG(progress), 0) as average_progress
            FROM projects
        """
        project_row = await db_manager.execute_one(project_stats_query)
        
        # Task stats  
        task_stats_query = """
            SELECT 
                COUNT(*) as total_tasks,
                COUNT(*) FILTER (WHERE status = 'done') as completed_tasks,
                COUNT(*) FILTER (WHERE status IN ('todo', 'in_progress')) as pending_tasks,
                COUNT(*) FILTER (WHERE due_date < NOW() AND status != 'done') as overdue_tasks
            FROM tasks
        """
        task_row = await db_manager.execute_one(task_stats_query)
        
        # Photo stats
        photo_stats_query = """
            SELECT 
                COUNT(*) as total_photos,
                COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '7 days') as photos_this_week,
                COALESCE(SUM(file_size), 0) / 1024.0 / 1024.0 as total_storage_mb
            FROM photos
        """
        photo_row = await db_manager.execute_one(photo_stats_query)
        
        # User stats
        user_stats_query = """
            SELECT 
                COUNT(*) as total_users,
                COUNT(*) FILTER (WHERE is_active = true) as active_users,
                COUNT(*) FILTER (WHERE role = 'crew') as crew_members,
                COUNT(*) FILTER (WHERE role = 'manager') as managers
            FROM users
        """
        user_row = await db_manager.execute_one(user_stats_query)
        
        return {
            "projects": self._convert_to_camel_case(dict(project_row)) if project_row else {},
            "tasks": self._convert_to_camel_case(dict(task_row)) if task_row else {},
            "photos": self._convert_to_camel_case(dict(photo_row)) if photo_row else {},
            "users": self._convert_to_camel_case(dict(user_row)) if user_row else {}
        }