"""
Authentication and RBAC repositories for comprehensive user management.
Contains all authentication, user management, and company filtering functionality.
"""

import uuid
import bcrypt
from datetime import datetime
from typing import List, Optional, Dict, Any
from .connection import db_manager
from ..models.user import User
from ..utils.data_conversion import to_camel_case, to_snake_case


class AuthRepository:
    """Repository for authentication operations."""
    
    def __init__(self):
        self.table_name = "users"
    
    def _convert_to_camel_case(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """Convert snake_case keys to camelCase for frontend compatibility."""
        result = to_camel_case(data)
        return result if isinstance(result, dict) else data
    
    def _convert_from_camel_case(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """Convert camelCase keys to snake_case for database operations."""
        result = to_snake_case(data)
        return result if isinstance(result, dict) else data

    async def get_user_by_email(self, email: str) -> Optional[Dict[str, Any]]:
        """Get user by email including password for authentication."""
        query = f"SELECT * FROM {self.table_name} WHERE email = $1"
        row = await db_manager.execute_one(query, email)
        if row:
            return dict(row)
        return None
    
    async def get_user(self, user_id: str) -> Optional[Dict[str, Any]]:
        """Get user by ID (without password for general use)."""
        query = f"SELECT id, first_name, last_name, email, role, is_active, company_id, created_at, last_login FROM {self.table_name} WHERE id = $1"
        row = await db_manager.execute_one(query, user_id)
        if row:
            user_data = dict(row)
            # Convert company_id to companyId for frontend compatibility
            if 'company_id' in user_data:
                user_data['companyId'] = user_data['company_id']
            return self._convert_to_camel_case(user_data)
        return None
    
    async def get_users(self) -> List[Dict[str, Any]]:
        """Get all users (without passwords)."""
        query = f"SELECT id, first_name, last_name, email, role, is_active, company_id, created_at, last_login FROM {self.table_name} ORDER BY first_name, last_name"
        rows = await db_manager.execute_query(query)
        users = []
        for row in rows:
            user_data = dict(row)
            # Convert company_id to companyId for frontend compatibility
            if 'company_id' in user_data:
                user_data['companyId'] = user_data['company_id']
            users.append(self._convert_to_camel_case(user_data))
        return users
    
    async def get_company_users(self, company_id: str) -> List[Dict[str, Any]]:
        """Get all users for a specific company."""
        query = f"SELECT id, first_name, last_name, email, role, is_active, company_id, created_at, last_login FROM {self.table_name} WHERE company_id = $1 ORDER BY first_name, last_name"
        rows = await db_manager.execute_query(query, company_id)
        users = []
        for row in rows:
            user_data = dict(row)
            # Convert company_id to companyId for frontend compatibility
            if 'company_id' in user_data:
                user_data['companyId'] = user_data['company_id']
            users.append(self._convert_to_camel_case(user_data))
        return users
    
    async def create_rbac_user(self, user_data: Dict[str, Any]) -> Dict[str, Any]:
        """Create a new user for RBAC system."""
        user_id = str(uuid.uuid4())
        now = datetime.utcnow()
        
        # Convert camelCase to snake_case for database
        data = self._convert_from_camel_case(user_data)
        
        # Hash password if provided
        password_hash = None
        if data.get('password'):
            password_bytes = data['password'].encode('utf-8')
            password_hash = bcrypt.hashpw(password_bytes, bcrypt.gensalt()).decode('utf-8')
        
        query = f"""
            INSERT INTO {self.table_name} 
            (id, first_name, last_name, email, password, role, is_active, company_id, created_at)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
            RETURNING id, first_name, last_name, email, role, is_active, company_id, created_at
        """
        
        row = await db_manager.execute_one(
            query, user_id, data.get('first_name'), data.get('last_name'),
            data.get('email'), password_hash, data.get('role', 'user'),
            data.get('is_active', True), data.get('company_id'), now
        )
        
        user_result = dict(row)
        # Convert company_id to companyId for frontend compatibility
        if 'company_id' in user_result:
            user_result['companyId'] = user_result['company_id']
        return self._convert_to_camel_case(user_result)
    
    async def update_user(self, user_id: str, user_data: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """Update an existing user."""
        data = self._convert_from_camel_case(user_data)
        
        if not data:
            return await self.get_user(user_id)
        
        # Hash password if being updated
        if 'password' in data and data['password']:
            password_bytes = data['password'].encode('utf-8')
            data['password'] = bcrypt.hashpw(password_bytes, bcrypt.gensalt()).decode('utf-8')
        
        set_clauses = []
        values = []
        param_count = 1
        
        for key, value in data.items():
            if key != 'id':  # Don't update ID
                set_clauses.append(f"{key} = ${param_count}")
                values.append(value)
                param_count += 1
        
        if not set_clauses:
            return await self.get_user(user_id)
        
        values.append(user_id)
        
        query = f"""
            UPDATE {self.table_name} 
            SET {', '.join(set_clauses)}
            WHERE id = ${param_count}
            RETURNING id, first_name, last_name, email, role, is_active, company_id, created_at
        """
        
        row = await db_manager.execute_one(query, *values)
        if row:
            user_result = dict(row)
            # Convert company_id to companyId for frontend compatibility
            if 'company_id' in user_result:
                user_result['companyId'] = user_result['company_id']
            return self._convert_to_camel_case(user_result)
        return None
    
    async def delete_user(self, user_id: str) -> bool:
        """Delete a user with cascade handling."""
        try:
            # First, unassign tasks assigned to this user
            await db_manager.execute("UPDATE tasks SET assignee_id = NULL WHERE assignee_id = $1", user_id)
            
            # Then delete the user
            result = await db_manager.execute(f"DELETE FROM {self.table_name} WHERE id = $1", user_id)
            return "DELETE 1" in result
        except Exception as e:
            print(f"Error deleting user {user_id}: {e}")
            return False
    
    async def assign_task(self, task_id: str, assignee_id: Optional[str]) -> Optional[Dict[str, Any]]:
        """Assign a task to a user."""
        query = "UPDATE tasks SET assignee_id = $1 WHERE id = $2 RETURNING *"
        row = await db_manager.execute_one(query, assignee_id, task_id)
        if row:
            return self._convert_to_camel_case(dict(row))
        return None


class CompanyRepository:
    """Repository for company operations."""
    
    def __init__(self):
        self.table_name = "companies"
    
    def _convert_to_camel_case(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """Convert snake_case keys to camelCase for frontend compatibility."""
        result = to_camel_case(data)
        return result if isinstance(result, dict) else data
    
    def _convert_from_camel_case(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """Convert camelCase keys to snake_case for database operations."""
        result = to_snake_case(data)
        return result if isinstance(result, dict) else data
    
    async def get_companies(self) -> List[Dict[str, Any]]:
        """Get all companies."""
        query = f"SELECT * FROM {self.table_name} ORDER BY name"
        rows = await db_manager.execute_query(query)
        return [self._convert_to_camel_case(dict(row)) for row in rows]
    
    async def get_company(self, company_id: str) -> Optional[Dict[str, Any]]:
        """Get company by ID."""
        query = f"SELECT * FROM {self.table_name} WHERE id = $1"
        row = await db_manager.execute_one(query, company_id)
        if row:
            return self._convert_to_camel_case(dict(row))
        return None
    
    async def create_company(self, company_data: Dict[str, Any]) -> Dict[str, Any]:
        """Create a new company."""
        company_id = str(uuid.uuid4())
        now = datetime.utcnow()
        
        data = self._convert_from_camel_case(company_data)
        
        query = f"""
            INSERT INTO {self.table_name} 
            (id, name, domain, industry, address, phone, email, created_at)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
            RETURNING *
        """
        
        row = await db_manager.execute_one(
            query, company_id, data.get('name'), data.get('domain'),
            data.get('industry'), data.get('address'), data.get('phone'),
            data.get('email'), now
        )
        return self._convert_to_camel_case(dict(row))
    
    async def update_company(self, company_id: str, company_data: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """Update an existing company."""
        data = self._convert_from_camel_case(company_data)
        
        if not data:
            return await self.get_company(company_id)
        
        set_clauses = []
        values = []
        param_count = 1
        
        for key, value in data.items():
            if key != 'id':  # Don't update ID
                set_clauses.append(f"{key} = ${param_count}")
                values.append(value)
                param_count += 1
        
        if not set_clauses:
            return await self.get_company(company_id)
        
        values.append(company_id)
        
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
    
    async def delete_company(self, company_id: str) -> bool:
        """Delete a company."""
        result = await db_manager.execute(f"DELETE FROM {self.table_name} WHERE id = $1", company_id)
        return "DELETE 1" in result


class RoleRepository:
    """Repository for role operations."""
    
    def __init__(self):
        self.table_name = "roles"
    
    def _convert_to_camel_case(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """Convert snake_case keys to camelCase for frontend compatibility."""
        result = to_camel_case(data)
        return result if isinstance(result, dict) else data
    
    def _convert_from_camel_case(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """Convert camelCase keys to snake_case for database operations."""
        result = to_snake_case(data)
        return result if isinstance(result, dict) else data
    
    async def get_roles(self) -> List[Dict[str, Any]]:
        """Get all roles."""
        query = f"SELECT * FROM {self.table_name} ORDER BY name"
        rows = await db_manager.execute_query(query)
        return [self._convert_to_camel_case(dict(row)) for row in rows]
    
    async def get_role(self, role_id: str) -> Optional[Dict[str, Any]]:
        """Get role by ID."""
        query = f"SELECT * FROM {self.table_name} WHERE id = $1"
        row = await db_manager.execute_one(query, role_id)
        if row:
            return self._convert_to_camel_case(dict(row))
        return None
    
    async def create_role(self, role_data: Dict[str, Any]) -> Dict[str, Any]:
        """Create a new role."""
        role_id = str(uuid.uuid4())
        now = datetime.utcnow()
        
        data = self._convert_from_camel_case(role_data)
        
        query = f"""
            INSERT INTO {self.table_name} 
            (id, name, description, permissions, company_id, created_at)
            VALUES ($1, $2, $3, $4, $5, $6)
            RETURNING *
        """
        
        row = await db_manager.execute_one(
            query, role_id, data.get('name'), data.get('description'),
            data.get('permissions', []), data.get('company_id'), now
        )
        return self._convert_to_camel_case(dict(row))
    
    async def update_role(self, role_id: str, role_data: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """Update an existing role."""
        data = self._convert_from_camel_case(role_data)
        
        if not data:
            return await self.get_role(role_id)
        
        set_clauses = []
        values = []
        param_count = 1
        
        for key, value in data.items():
            if key != 'id':  # Don't update ID
                set_clauses.append(f"{key} = ${param_count}")
                values.append(value)
                param_count += 1
        
        if not set_clauses:
            return await self.get_role(role_id)
        
        values.append(role_id)
        
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
    
    async def delete_role(self, role_id: str) -> bool:
        """Delete a role."""
        result = await db_manager.execute(f"DELETE FROM {self.table_name} WHERE id = $1", role_id)
        return "DELETE 1" in result
    
    async def get_permissions(self) -> List[Dict[str, Any]]:
        """Get all available permissions."""
        # For now, return a mock list of permissions
        # In a real system, this would come from a permissions table
        return [
            {"id": 1, "name": "view_dashboard", "description": "View dashboard"},
            {"id": 2, "name": "manage_users", "description": "Manage users"},
            {"id": 3, "name": "manage_projects", "description": "Manage projects"},
            {"id": 4, "name": "manage_tasks", "description": "Manage tasks"},
            {"id": 5, "name": "view_reports", "description": "View reports"},
            {"id": 6, "name": "admin_access", "description": "Administrative access"}
        ]


# Global repository instances
auth_repo = AuthRepository()
company_repo = CompanyRepository()
role_repo = RoleRepository()