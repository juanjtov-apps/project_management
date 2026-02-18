"""
Database repositories for data access.
"""
import uuid
from datetime import datetime, timezone
from typing import List, Optional, Dict, Any
from src.database.connection import db_manager
from src.models import (
    Project, ProjectCreate, ProjectUpdate,
    Task, TaskCreate, TaskUpdate, 
    User, UserCreate, UserUpdate,
    Photo, PhotoCreate,
    ScheduleChange, ScheduleChangeCreate, ScheduleChangeUpdate,
    ProjectLog, Notification
)
from src.utils.data_conversion import to_camel_case, to_snake_case

def normalize_datetime(dt):
    """Convert timezone-aware datetime to timezone-naive UTC datetime."""
    if dt is None:
        return None
    if isinstance(dt, str):
        # Parse ISO string to datetime
        dt = datetime.fromisoformat(dt.replace('Z', '+00:00'))
    if dt.tzinfo is not None:
        # Convert to UTC and make naive
        return dt.utctimetuple()
    return dt


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
    
    def _normalize_status(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """Normalize status field to use hyphens (on-hold) instead of underscores (on_hold)."""
        if 'status' in data and data['status']:
            # Convert underscore to hyphen for enum compatibility
            data['status'] = data['status'].replace('_', '-')
        return data

    async def get_all(self) -> List[Dict[str, Any]]:
        """Get all projects."""
        query = f"SELECT * FROM {self.table_name} ORDER BY created_at DESC"
        rows = await db_manager.execute_query(query)
        return [self._normalize_status(self._convert_to_camel_case(dict(row))) for row in rows]

    async def get_by_company(self, company_id: str) -> List[Dict[str, Any]]:
        """Get projects filtered by company ID."""
        query = f"SELECT * FROM {self.table_name} WHERE company_id = $1 ORDER BY created_at DESC"
        rows = await db_manager.execute_query(query, company_id)
        return [self._normalize_status(self._convert_to_camel_case(dict(row))) for row in rows]
    
    async def get_by_id(self, project_id: str) -> Optional[Dict[str, Any]]:
        """Get project by ID."""
        query = f"SELECT * FROM {self.table_name} WHERE id = $1"
        row = await db_manager.execute_one(query, project_id)
        if row:
            return Project(**self._normalize_status(self._convert_to_camel_case(dict(row))))
        return None
    
    async def create(self, project: ProjectCreate, company_id: Optional[str] = None) -> Project:
        """Create a new project."""
        project_id = str(uuid.uuid4())
        now = datetime.now(timezone.utc)
        
        # Get data with aliases first, then convert
        data = project.model_dump(by_alias=True)
        data = self._convert_from_camel_case(data)
        
        # Use provided company_id parameter, or get from model, or get from data
        # Use provided company_id parameter, or get from model, or get from data
        company_id_value = company_id or getattr(project, 'company_id', None) or data.get('company_id')
        
        # Set company_id in data dict if we have a value
        if company_id_value is not None:
            data['company_id'] = str(company_id_value)
        
        # Handle due_date timezone conversion
        due_date = data.get('due_date')
        if due_date:
            if isinstance(due_date, str):
                # Parse ISO string and convert to naive UTC
                dt = datetime.fromisoformat(due_date.replace('Z', '+00:00'))
                due_date = dt.replace(tzinfo=None) if dt.tzinfo else dt
            elif hasattr(due_date, 'tzinfo') and due_date.tzinfo:
                # Convert timezone-aware to naive
                due_date = due_date.replace(tzinfo=None)
        
        query = f"""
            INSERT INTO {self.table_name} 
            (id, name, description, location, status, progress, due_date, company_id, created_at)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
            RETURNING *
        """
        
        company_id_value = data.get('company_id')
        
        row = await db_manager.execute_one(
            query, project_id, data.get('name'), data.get('description'), 
            data.get('location'), data.get('status'), data.get('progress'),
            due_date, company_id_value, now
        )
        
        return Project(**self._convert_to_camel_case(dict(row)))
    
    async def update(self, project_id: str, project_update: ProjectUpdate) -> Optional[Project]:
        """Update an existing project."""
        data = project_update.model_dump(exclude_unset=True, by_alias=True)
        data = self._convert_from_camel_case(data)
        
        if not data:
            return await self.get_by_id(project_id)
        
        # Prevent company_id from being updated (security: company_id is immutable)
        if 'company_id' in data:
            del data['company_id']
        
        # Handle due_date timezone conversion
        if 'due_date' in data and data['due_date']:
            due_date = data['due_date']
            if isinstance(due_date, str):
                # Parse ISO string and convert to naive UTC
                dt = datetime.fromisoformat(due_date.replace('Z', '+00:00'))
                data['due_date'] = dt.replace(tzinfo=None) if dt.tzinfo else dt
            elif hasattr(due_date, 'tzinfo') and due_date.tzinfo:
                # Convert timezone-aware to naive
                data['due_date'] = due_date.replace(tzinfo=None)
        
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
        """Delete a project with cascade deletion of all related data.

        Deletes in reverse FK dependency order.  Error codes caught:
          42P01 = undefined_table, 42703 = undefined_column
        """
        from src.database.connection import get_db_pool

        pool = await get_db_pool()
        try:
            async with pool.acquire() as connection:
                async with connection.transaction():
                    async def safe_delete(query: str):
                        try:
                            await connection.execute(query, project_id)
                        except Exception as e:
                            code = getattr(e, 'sqlstate', None) or getattr(e, 'code', None)
                            if code not in ('42P01', '42703'):
                                raise

                    # === CLIENT PORTAL: leaf tables first ===
                    # Payments — RESTRICT FKs require leaf-first order
                    await safe_delete("DELETE FROM client_portal.payment_events WHERE project_id = $1")
                    await safe_delete("DELETE FROM client_portal.payment_receipts WHERE project_id = $1")
                    await safe_delete("DELETE FROM client_portal.invoices WHERE project_id = $1")
                    await safe_delete("DELETE FROM client_portal.payment_documents WHERE project_id = $1")
                    await safe_delete("DELETE FROM client_portal.payment_installments WHERE project_id = $1")
                    await safe_delete("DELETE FROM client_portal.payment_schedules WHERE project_id = $1")

                    # Issues (comments/attachments CASCADE from issues)
                    await safe_delete("DELETE FROM client_portal.issue_audit_log WHERE project_id = $1")
                    await safe_delete("DELETE FROM client_portal.issues WHERE project_id = $1")

                    # Forum (messages/attachments CASCADE from threads)
                    await safe_delete("DELETE FROM client_portal.forum_threads WHERE project_id = $1")

                    # Materials (items CASCADE from areas)
                    await safe_delete("DELETE FROM client_portal.material_items WHERE project_id = $1")
                    await safe_delete("DELETE FROM client_portal.material_areas WHERE project_id = $1")
                    await safe_delete("DELETE FROM client_portal.materials WHERE project_id = $1")

                    # Stages (material_area_id SET NULL, stage_id SET NULL)
                    await safe_delete("DELETE FROM client_portal.project_stages WHERE project_id = $1")

                    # Legacy installments (files CASCADE from installments)
                    await safe_delete("DELETE FROM client_portal.installment_files WHERE installment_id IN (SELECT id FROM client_portal.installments WHERE project_id = $1)")
                    await safe_delete("DELETE FROM client_portal.installments WHERE project_id = $1")

                    # Notifications & invitations
                    await safe_delete("DELETE FROM client_portal.notification_settings WHERE project_id = $1")
                    await safe_delete("DELETE FROM client_portal.notifications WHERE project_id = $1")
                    await safe_delete("DELETE FROM client_portal.pm_notifications WHERE project_id = $1")
                    await safe_delete("DELETE FROM client_portal.client_invitations WHERE project_id = $1")

                    # === PUBLIC SCHEMA: NO ACTION FKs must be deleted before project ===
                    await safe_delete("DELETE FROM schedule_changes WHERE task_id IN (SELECT id FROM tasks WHERE project_id = $1)")
                    await safe_delete("DELETE FROM time_entries WHERE project_id = $1")
                    await safe_delete("DELETE FROM change_orders WHERE project_id = $1")
                    await safe_delete("DELETE FROM communications WHERE project_id = $1")
                    await safe_delete("DELETE FROM subcontractor_assignments WHERE project_id = $1")
                    await safe_delete("DELETE FROM project_assignments WHERE project_id = $1")
                    await safe_delete("DELETE FROM invoices WHERE project_id = $1")
                    await safe_delete("DELETE FROM tasks WHERE project_id = $1")
                    await safe_delete("DELETE FROM photos WHERE project_id = $1")
                    await safe_delete("DELETE FROM project_logs WHERE project_id = $1")
                    await safe_delete("DELETE FROM project_health_metrics WHERE project_id = $1")
                    await safe_delete("DELETE FROM risk_assessments WHERE project_id = $1")
                    # Legacy client_* tables
                    await safe_delete("DELETE FROM client_notification_settings WHERE project_id = $1")
                    await safe_delete("DELETE FROM client_issues WHERE project_id = $1")
                    await safe_delete("DELETE FROM client_materials WHERE project_id = $1")
                    await safe_delete("DELETE FROM client_forum_messages WHERE project_id = $1")
                    await safe_delete("DELETE FROM client_installments WHERE project_id = $1")

                    # Finally delete the project
                    result = await connection.execute(
                        f"DELETE FROM {self.table_name} WHERE id = $1",
                        project_id
                    )
                    return "DELETE 1" in result
        except Exception as e:
            import traceback
            print(f"Error deleting project {project_id}: {e}")
            traceback.print_exc()
            raise


class TaskRepository(BaseRepository):
    """Repository for task operations."""
    
    def __init__(self):
        super().__init__("tasks")
    
    def _normalize_task_status(self, status: Optional[str]) -> Optional[str]:
        """Normalize task status values from database to model enum values.
        
        Maps legacy or alternative status values to valid TaskStatus enum values:
        - 'done' -> 'completed'
        - Other values are passed through as-is
        """
        if status is None:
            return None
        status_lower = status.lower()
        if status_lower == 'done':
            return 'completed'
        return status
    
    async def get_all(self, project_id: Optional[str] = None, status: Optional[str] = None, 
                      category: Optional[str] = None, assigned_to: Optional[str] = None,
                      company_id: Optional[str] = None) -> List[Task]:
        """Get tasks with optional filters including company_id."""
        query = f"SELECT * FROM {self.table_name} WHERE 1=1"
        params = []
        param_count = 1
        
        if company_id:
            query += f" AND company_id = ${param_count}"
            params.append(company_id)
            param_count += 1
        
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
        tasks = []
        for row in rows:
            try:
                row_dict = dict(row)
                # Ensure company_id is present (may be None for old tasks)
                if 'company_id' not in row_dict:
                    row_dict['company_id'] = None
                # Normalize status value (e.g., 'done' -> 'completed')
                if 'status' in row_dict:
                    row_dict['status'] = self._normalize_task_status(row_dict['status'])
                camel_case_dict = self._convert_to_camel_case(row_dict)
                tasks.append(Task(**camel_case_dict))
            except Exception as e:
                print(f"Error converting task row to model: {e}")
                print(f"Row data: {dict(row)}")
                import traceback
                traceback.print_exc()
                # Skip this task but continue with others
                continue
        return tasks
    
    async def get_by_id(self, task_id: str) -> Optional[Task]:
        """Get task by ID."""
        query = f"SELECT * FROM {self.table_name} WHERE id = $1"
        row = await db_manager.execute_one(query, task_id)
        if row:
            row_dict = dict(row)
            # Normalize status value (e.g., 'done' -> 'completed')
            if 'status' in row_dict:
                row_dict['status'] = self._normalize_task_status(row_dict['status'])
            return Task(**self._convert_to_camel_case(row_dict))
        return None
    
    async def create(self, task: TaskCreate) -> Task:
        """Create a new task."""
        task_id = str(uuid.uuid4())
        now = datetime.now(timezone.utc)
        
        data = task.model_dump(by_alias=True)
        data = self._convert_from_camel_case(data)
        
        # Normalize status value (e.g., 'done' -> 'completed')
        if 'status' in data:
            data['status'] = self._normalize_task_status(data['status'])
        
        # Convert timezone-aware due_date to timezone-naive UTC
        due_date = data.get('due_date')
        if due_date and hasattr(due_date, 'tzinfo') and due_date.tzinfo is not None:
            # Convert to UTC and remove timezone info
            due_date = due_date.replace(tzinfo=None)
        data['due_date'] = due_date
        
        query = f"""
            INSERT INTO {self.table_name} 
            (id, title, description, status, priority, category, project_id, 
             assignee_id, due_date, company_id, created_at)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
            RETURNING *
        """
        
        row = await db_manager.execute_one(
            query, task_id, data.get('title'), data.get('description'),
            data.get('status'), data.get('priority'), data.get('category'),
            data.get('project_id'), data.get('assignee_id'), data.get('due_date'),
            data.get('company_id'), now
        )
        row_dict = dict(row)
        # Normalize status value when reading back
        if 'status' in row_dict:
            row_dict['status'] = self._normalize_task_status(row_dict['status'])
        return Task(**self._convert_to_camel_case(row_dict))
    
    async def update(self, task_id: str, task_update: TaskUpdate) -> Optional[Task]:
        """Update an existing task."""
        data = task_update.model_dump(exclude_unset=True, by_alias=True)
        data = self._convert_from_camel_case(data)
        
        if not data:
            return await self.get_by_id(task_id)
        
        # Prevent company_id from being updated (security: company_id is immutable)
        if 'company_id' in data:
            del data['company_id']
        
        # Normalize status value (e.g., 'done' -> 'completed')
        if 'status' in data:
            data['status'] = self._normalize_task_status(data['status'])
        
        # Convert timezone-aware due_date to timezone-naive UTC
        if 'due_date' in data and data['due_date']:
            due_date = data['due_date']
            if hasattr(due_date, 'tzinfo') and due_date.tzinfo is not None:
                data['due_date'] = due_date.replace(tzinfo=None)
        
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
            row_dict = dict(row)
            # Normalize status value when reading back
            if 'status' in row_dict:
                row_dict['status'] = self._normalize_task_status(row_dict['status'])
            return Task(**self._convert_to_camel_case(row_dict))
        return None
    
    async def update_due_date(self, task_id: str, new_due_date: datetime) -> bool:
        """Update the due date of a task."""
        # Convert timezone-aware due_date to timezone-naive UTC if needed
        if hasattr(new_due_date, 'tzinfo') and new_due_date.tzinfo is not None:
            new_due_date = new_due_date.replace(tzinfo=None)
        
        query = f"UPDATE {self.table_name} SET due_date = $1 WHERE id = $2"
        result = await db_manager.execute(query, new_due_date, task_id)
        return "UPDATE 1" in result
    
    async def update_assignee(self, task_id: str, assignee_id: Optional[str]) -> bool:
        """Update the assignee of a task."""
        query = f"UPDATE {self.table_name} SET assignee_id = $1 WHERE id = $2"
        result = await db_manager.execute(query, assignee_id, task_id)
        return "UPDATE 1" in result
    
    async def delete(self, task_id: str) -> bool:
        """Delete a task."""
        query = f"DELETE FROM {self.table_name} WHERE id = $1"
        result = await db_manager.execute(query, task_id)
        return "DELETE 1" in result


class PhotoRepository(BaseRepository):
    """Repository for photo operations."""
    
    def __init__(self):
        super().__init__("photos")
    
    async def get_all(self, project_id: Optional[str] = None, user_id: Optional[str] = None) -> List[Photo]:
        """Get photos with optional filters."""
        query = f"SELECT * FROM {self.table_name} WHERE 1=1"
        params = []
        param_count = 1
        
        if project_id:
            query += f" AND project_id = ${param_count}"
            params.append(project_id)
            param_count += 1
        
        if user_id:
            query += f" AND user_id = ${param_count}"
            params.append(user_id)
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
    
    async def create(self, photo: PhotoCreate, filename: str, original_name: str) -> Photo:
        """Create a new photo record."""
        photo_id = str(uuid.uuid4())
        now = datetime.now(timezone.utc)
        
        data = photo.model_dump(by_alias=True)
        data = self._convert_from_camel_case(data)
        
        # Get tags from the photo data, default to empty list
        tags = data.get('tags', []) or []
        
        query = f"""
            INSERT INTO {self.table_name} 
            (id, filename, original_name, project_id, description, user_id, tags, created_at)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
            RETURNING *
        """
        
        row = await db_manager.execute_one(
            query, photo_id, filename, original_name, data.get('project_id'),
            data.get('description'), data.get('user_id'), tags, now
        )
        return Photo(**self._convert_to_camel_case(dict(row)))
    
    async def delete(self, photo_id: str) -> bool:
        """Delete a photo."""
        query = f"DELETE FROM {self.table_name} WHERE id = $1"
        result = await db_manager.execute(query, photo_id)
        return "DELETE 1" in result


class DashboardRepository(BaseRepository):
    """Repository for dashboard statistics."""
    
    def __init__(self):
        super().__init__("")
    
    async def get_comprehensive_stats(self, company_id: Optional[str] = None) -> Dict[str, Any]:
        """Get comprehensive dashboard statistics with optional company filtering."""
        # Project stats
        if company_id:
            project_stats_query = """
                SELECT 
                    COUNT(*) as total_projects,
                    COUNT(*) FILTER (WHERE status = 'active') as active_projects,
                    COUNT(*) FILTER (WHERE status = 'completed') as completed_projects,
                    COALESCE(AVG(progress), 0) as average_progress
                FROM projects
                WHERE company_id = $1
            """
            project_row = await db_manager.execute_one(project_stats_query, company_id)
        else:
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
        if company_id:
            task_stats_query = """
                SELECT 
                    COUNT(*) as total_tasks,
                    COUNT(*) FILTER (WHERE status = 'completed') as completed_tasks,
                    COUNT(*) FILTER (WHERE status IN ('pending', 'in-progress')) as pending_tasks,
                    COUNT(*) FILTER (WHERE due_date < NOW() AND status != 'completed') as overdue_tasks
                FROM tasks
                WHERE company_id = $1
            """
            task_row = await db_manager.execute_one(task_stats_query, company_id)
        else:
            task_stats_query = """
                SELECT 
                    COUNT(*) as total_tasks,
                    COUNT(*) FILTER (WHERE status = 'completed') as completed_tasks,
                    COUNT(*) FILTER (WHERE status IN ('pending', 'in-progress')) as pending_tasks,
                    COUNT(*) FILTER (WHERE due_date < NOW() AND status != 'completed') as overdue_tasks
                FROM tasks
            """
            task_row = await db_manager.execute_one(task_stats_query)
        
        # Photo stats - filter by project company_id
        if company_id:
            photo_stats_query = """
                SELECT 
                    COUNT(*) as total_photos,
                    COUNT(*) FILTER (WHERE p.created_at >= NOW() - INTERVAL '7 days') as photos_this_week
                FROM photos p
                JOIN projects pr ON p.project_id = pr.id
                WHERE pr.company_id = $1
            """
            photo_row = await db_manager.execute_one(photo_stats_query, company_id)
        else:
            photo_stats_query = """
                SELECT 
                    COUNT(*) as total_photos,
                    COUNT(*) FILTER (WHERE p.created_at >= NOW() - INTERVAL '7 days') as photos_this_week
                FROM photos p
            """
            photo_row = await db_manager.execute_one(photo_stats_query)
        
        # User stats
        # Dynamically handle both 'role_name' and 'name' columns in roles table
        # Use COALESCE to handle either column being present
        if company_id:
            user_stats_query = """
                SELECT 
                    COUNT(*) as total_users,
                    COUNT(*) as active_users,
                    COUNT(*) FILTER (WHERE COALESCE(r.role_name, r.name) = 'crew') as crew_members,
                    COUNT(*) FILTER (WHERE COALESCE(r.role_name, r.name) IN ('manager', 'project_manager', 'office_manager')) as managers
                FROM users u
                LEFT JOIN roles r ON u.role_id = r.id
                WHERE u.company_id = $1
            """
            user_row = await db_manager.execute_one(user_stats_query, company_id)
        else:
            user_stats_query = """
                SELECT 
                    COUNT(*) as total_users,
                    COUNT(*) as active_users,
                    COUNT(*) FILTER (WHERE COALESCE(r.role_name, r.name) = 'crew') as crew_members,
                    COUNT(*) FILTER (WHERE COALESCE(r.role_name, r.name) IN ('manager', 'project_manager', 'office_manager')) as managers
                FROM users u
                LEFT JOIN roles r ON u.role_id = r.id
            """
            user_row = await db_manager.execute_one(user_stats_query)
        
        return {
            "projects": self._convert_to_camel_case(dict(project_row)) if project_row else {},
            "tasks": self._convert_to_camel_case(dict(task_row)) if task_row else {},
            "photos": self._convert_to_camel_case(dict(photo_row)) if photo_row else {},
            "users": self._convert_to_camel_case(dict(user_row)) if user_row else {}
        }


class ScheduleChangeRepository(BaseRepository):
    """Repository for schedule change operations."""
    
    def __init__(self):
        super().__init__("schedule_changes")
    
    async def get_all(self, task_id: Optional[str] = None) -> List[ScheduleChange]:
        """Get all schedule changes, optionally filtered by task."""
        query = f"SELECT * FROM {self.table_name} WHERE 1=1"
        params = []
        param_count = 1
        
        if task_id:
            query += f" AND task_id = ${param_count}"
            params.append(task_id)
            param_count += 1
        
        query += " ORDER BY created_at DESC"
        rows = await db_manager.execute_query(query, *params)
        return [ScheduleChange(**self._convert_to_camel_case(dict(row))) for row in rows]
    
    async def get_by_id(self, change_id: str) -> Optional[ScheduleChange]:
        """Get schedule change by ID."""
        query = f"SELECT * FROM {self.table_name} WHERE id = $1"
        row = await db_manager.execute_one(query, change_id)
        if row:
            return ScheduleChange(**self._convert_to_camel_case(dict(row)))
        return None
    
    async def create(self, change: ScheduleChangeCreate) -> ScheduleChange:
        """Create a new schedule change."""
        change_id = str(uuid.uuid4())
        now = datetime.now(timezone.utc)
        
        data = change.model_dump(by_alias=True)
        data = self._convert_from_camel_case(data)
        
        # Convert timezone-aware dates to timezone-naive UTC
        original_date = data.get('original_date')
        if original_date and hasattr(original_date, 'tzinfo') and original_date.tzinfo is not None:
            original_date = original_date.replace(tzinfo=None)
        data['original_date'] = original_date
        
        new_date = data.get('new_date')
        if new_date and hasattr(new_date, 'tzinfo') and new_date.tzinfo is not None:
            new_date = new_date.replace(tzinfo=None)
        data['new_date'] = new_date
        
        query = f"""
            INSERT INTO {self.table_name} 
            (id, task_id, user_id, reason, original_date, new_date, status, created_at)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
            RETURNING *
        """
        
        row = await db_manager.execute_one(
            query, change_id, data.get('task_id'), data.get('user_id'),
            data.get('reason'), data.get('original_date'), data.get('new_date'),
            data.get('status', 'pending'), now
        )
        return ScheduleChange(**self._convert_to_camel_case(dict(row)))
    
    async def update(self, change_id: str, change_update: ScheduleChangeUpdate) -> Optional[ScheduleChange]:
        """Update an existing schedule change."""
        data = change_update.model_dump(exclude_unset=True, by_alias=True)
        data = self._convert_from_camel_case(data)
        
        if not data:
            return await self.get_by_id(change_id)
        
        # Convert timezone-aware dates to timezone-naive UTC
        if 'original_date' in data and data['original_date']:
            original_date = data['original_date']
            if hasattr(original_date, 'tzinfo') and original_date.tzinfo is not None:
                data['original_date'] = original_date.replace(tzinfo=None)
        
        if 'new_date' in data and data['new_date']:
            new_date = data['new_date']
            if hasattr(new_date, 'tzinfo') and new_date.tzinfo is not None:
                data['new_date'] = new_date.replace(tzinfo=None)
        
        set_clauses = []
        values = []
        param_count = 1
        
        for key, value in data.items():
            set_clauses.append(f"{key} = ${param_count}")
            values.append(value)
            param_count += 1
        
        values.append(change_id)
        
        query = f"""
            UPDATE {self.table_name} 
            SET {', '.join(set_clauses)}
            WHERE id = ${param_count}
            RETURNING *
        """
        
        row = await db_manager.execute_one(query, *values)
        if row:
            return ScheduleChange(**self._convert_to_camel_case(dict(row)))
        return None
    
    async def delete(self, change_id: str) -> bool:
        """Delete a schedule change."""
        query = f"DELETE FROM {self.table_name} WHERE id = $1"
        result = await db_manager.execute(query, change_id)
        return "DELETE 1" in result


class UserRepository(BaseRepository):
    """Repository for user operations."""
    
    def __init__(self):
        super().__init__("users")
    
    async def get_all(self) -> List["User"]:
        """Get all users."""
        from ..models.user import User
        query = f"""
            SELECT u.id, u.first_name, u.last_name, u.email, u.username, u.name,
                   u.profile_image_url, u.company_id, u.role_id, u.is_root, u.is_active,
                   u.created_at, u.updated_at,
                   COALESCE(r.role_name, r.name, u.role, 'user') as role_name,
                   r.display_name as role_display_name
            FROM {self.table_name} u
            LEFT JOIN roles r ON u.role_id = r.id
            ORDER BY u.first_name, u.last_name
        """
        rows = await db_manager.execute_query(query)
        return [User(**dict(row)) for row in rows]
    
    async def get_by_role(self, role: str) -> List["User"]:
        """Get users by role."""
        from ..models.user import User
        # Look up role_id from role name (handle both 'manager' and 'project_manager')
        role_lookup = role
        if role == 'manager':
            role_lookup = 'project_manager'
        
        role_row = await db_manager.execute_one("""
            SELECT id FROM roles 
            WHERE LOWER(role_name) = LOWER($1) OR LOWER(role_name) LIKE LOWER($2)
            LIMIT 1
        """, role_lookup, f'%{role}%')
        
        if not role_row:
            return []
        
        query = f"""
            SELECT u.id, u.first_name, u.last_name, u.email, u.username, u.name,
                   u.profile_image_url, u.company_id, u.role_id, u.is_root, u.is_active,
                   u.created_at, u.updated_at,
                   COALESCE(r.role_name, r.name, 'user') as role_name,
                   r.display_name as role_display_name
            FROM {self.table_name} u
            LEFT JOIN roles r ON u.role_id = r.id
            WHERE u.role_id = $1 OR u.role ILIKE $2
            ORDER BY u.first_name, u.last_name
        """
        rows = await db_manager.execute_query(query, role_row['id'], f'%{role}%')
        return [User(**dict(row)) for row in rows]
    
    async def get_by_id(self, user_id: str) -> Optional["User"]:
        """Get user by ID."""
        from ..models.user import User
        query = f"""
            SELECT u.id, u.first_name, u.last_name, u.email, u.username, u.name,
                   u.profile_image_url, u.company_id, u.role_id, u.is_root, u.is_active,
                   u.created_at, u.updated_at,
                   COALESCE(r.role_name, r.name, u.role, 'user') as role_name,
                   r.display_name as role_display_name
            FROM {self.table_name} u
            LEFT JOIN roles r ON u.role_id = r.id
            WHERE u.id = $1
        """
        row = await db_manager.execute_one(query, user_id)
        if row:
            return User(**dict(row))
        return None


class SubcontractorAssignmentRepository(BaseRepository):
    """Repository for subcontractor assignment operations."""
    
    def __init__(self):
        super().__init__("subcontractor_assignments")
    
    async def get_all(self) -> List[Dict[str, Any]]:
        """Get all subcontractor assignments."""
        from ..models.subcontractor_assignment import SubcontractorAssignment
        query = f"SELECT * FROM {self.table_name} ORDER BY created_at DESC"
        rows = await db_manager.execute_query(query)
        return [self._convert_to_camel_case(dict(row)) for row in rows]
    
    async def get_by_id(self, assignment_id: str) -> Optional[Dict[str, Any]]:
        """Get subcontractor assignment by ID."""
        from ..models.subcontractor_assignment import SubcontractorAssignment
        query = f"SELECT * FROM {self.table_name} WHERE id = $1"
        row = await db_manager.execute_one(query, assignment_id)
        if row:
            return self._convert_to_camel_case(dict(row))
        return None
    
    async def create(self, assignment_data: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """Create a new subcontractor assignment."""
        from ..models.subcontractor_assignment import SubcontractorAssignment
        assignment_id = str(uuid.uuid4())
        now = datetime.now(timezone.utc)
        
        data = self._convert_from_camel_case(assignment_data)
        
        query = f"""
            INSERT INTO {self.table_name} 
            (id, subcontractor_id, project_id, assigned_by, start_date, end_date, specialization, status, created_at)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
            RETURNING *
        """
        
        row = await db_manager.execute_one(
            query, assignment_id, data.get('subcontractor_id'), data.get('project_id'),
            data.get('assigned_by'), data.get('start_date'), data.get('end_date'),
            data.get('specialization'), data.get('status', 'active'), now
        )
        if row:
            return self._convert_to_camel_case(dict(row))
        return None
    
    async def update(self, assignment_id: str, assignment_data: Dict[str, Any]) -> Optional["SubcontractorAssignment"]:
        """Update an existing subcontractor assignment."""
        from ..models.subcontractor_assignment import SubcontractorAssignment
        data = self._convert_from_camel_case(assignment_data)
        
        if not data:
            return await self.get_by_id(assignment_id)
        
        set_clauses = []
        values = []
        param_count = 1
        
        for key, value in data.items():
            set_clauses.append(f"{key} = ${param_count}")
            values.append(value)
            param_count += 1
        
        values.append(assignment_id)
        
        query = f"""
            UPDATE {self.table_name} 
            SET {', '.join(set_clauses)}
            WHERE id = ${param_count}
            RETURNING *
        """
        
        row = await db_manager.execute_one(query, *values)
        if row:
            return self._convert_to_camel_case(dict(row))
        return None
    
    async def delete(self, assignment_id: str) -> bool:
        """Delete a subcontractor assignment."""
        query = f"DELETE FROM {self.table_name} WHERE id = $1"
        result = await db_manager.execute(query, assignment_id)
        return "DELETE 1" in result
    
    async def get_by_subcontractor(self, subcontractor_id: str) -> List["SubcontractorAssignment"]:
        """Get all assignments for a specific subcontractor."""
        from ..models.subcontractor_assignment import SubcontractorAssignment
        query = f"SELECT * FROM {self.table_name} WHERE subcontractor_id = $1 ORDER BY created_at DESC"
        rows = await db_manager.execute_query(query, subcontractor_id)
        return [self._convert_to_camel_case(dict(row)) for row in rows]
    
    async def get_by_project(self, project_id: str) -> List["SubcontractorAssignment"]:
        """Get all assignments for a specific project."""
        from ..models.subcontractor_assignment import SubcontractorAssignment
        query = f"SELECT * FROM {self.table_name} WHERE project_id = $1 ORDER BY created_at DESC"
        rows = await db_manager.execute_query(query, project_id)
        return [self._convert_to_camel_case(dict(row)) for row in rows]