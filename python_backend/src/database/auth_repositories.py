"""
Authentication and RBAC repositories for comprehensive user management.
Contains all authentication, user management, and company filtering functionality.
"""

import uuid
import asyncpg
import bcrypt
from datetime import datetime, timezone
from typing import List, Optional, Dict, Any, Tuple
from .connection import db_manager, get_db_pool
from ..models.user import User
from ..utils.data_conversion import to_camel_case, to_snake_case

# Module-level caches for information_schema introspection results.
# The database schema is stable at runtime, so these are populated once
# on first access and reused for all subsequent calls.

# Cache for AuthRepository._get_roles_column_info() -> (has_role_name, has_name, has_display_name, role_name_col)
_roles_column_info_cache: Optional[Tuple[bool, bool, bool, Optional[str]]] = None

# Cache for AuthRepository._has_assigned_project_column() -> bool
_has_assigned_project_cache: Optional[bool] = None

# Cache for users table column names (used in get_users / get_company_users for legacy role check)
_users_column_names_cache: Optional[List[str]] = None

# Cache for roles table full column list (used by RoleRepository)
_roles_table_columns_cache: Optional[List[str]] = None

# Cache for roles table existence check (used by RoleRepository.get_roles)
_roles_table_exists_cache: Optional[bool] = None


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
        # Dynamically detect roles table schema to handle both 'role_name' and 'name' columns
        has_role_name, has_name, has_display_name, role_name_col = await self._get_roles_column_info()

        # Check if assigned_project_id column exists (backwards compatibility)
        has_assigned_project = await self._has_assigned_project_column()
        assigned_project_select = ", u.assigned_project_id" if has_assigned_project else ""

        if role_name_col:
            # Build query based on available columns
            role_select = f"r.{role_name_col} as role_name"
            if has_display_name:
                role_select += ", r.display_name as role_display_name"
            else:
                role_select += f", r.{role_name_col} as role_display_name"

            query = f"""
                SELECT u.id, u.first_name, u.last_name, u.email, u.role_id,
                       u.company_id, u.is_root, u.created_at{assigned_project_select},
                       {role_select}
                FROM {self.table_name} u
                LEFT JOIN roles r ON u.role_id = r.id
                WHERE u.id = $1
            """
        else:
            # Fallback: no role info available
            query = f"""
                SELECT u.id, u.first_name, u.last_name, u.email, u.role_id,
                       u.company_id, u.is_root, u.created_at{assigned_project_select},
                       NULL as role_name, NULL as role_display_name
                FROM {self.table_name} u
                WHERE u.id = $1
            """
        
        row = await db_manager.execute_one(query, user_id)
        if row:
            user_data = dict(row)
            # Convert company_id to companyId for frontend compatibility
            if 'company_id' in user_data:
                user_data['companyId'] = user_data['company_id']
            # Convert is_root to isRoot for frontend compatibility
            if 'is_root' in user_data:
                user_data['isRoot'] = user_data['is_root']
            # Convert assigned_project_id to assignedProjectId for frontend compatibility
            if 'assigned_project_id' in user_data:
                user_data['assignedProjectId'] = user_data['assigned_project_id']
            # Use role from roles table (primary source)
            if user_data.get('role_name'):
                user_data['role'] = user_data['role_name']
            # Add roleId for frontend (primary identifier)
            if 'role_id' in user_data:
                user_data['roleId'] = user_data['role_id']
            return self._convert_to_camel_case(user_data)
        return None
    
    async def _get_roles_column_info(self) -> Tuple[bool, bool, bool, Optional[str]]:
        """Get information about which columns exist in the roles table.

        Results are cached at module level since the schema is stable at runtime.

        Returns:
            tuple: (has_role_name, has_name, has_display_name, role_name_col)
        """
        global _roles_column_info_cache
        if _roles_column_info_cache is not None:
            return _roles_column_info_cache

        columns_query = """
            SELECT column_name
            FROM information_schema.columns
            WHERE table_name = 'roles'
        """
        columns_result = await db_manager.execute_query(columns_query)
        column_names = [col['column_name'] for col in columns_result] if columns_result else []

        has_role_name = 'role_name' in column_names
        has_name = 'name' in column_names
        has_display_name = 'display_name' in column_names

        # Determine which column to use for role name
        role_name_col = 'role_name' if has_role_name else 'name' if has_name else None

        _roles_column_info_cache = (has_role_name, has_name, has_display_name, role_name_col)
        return _roles_column_info_cache

    async def _has_assigned_project_column(self) -> bool:
        """Check if users table has assigned_project_id column.

        Results are cached at module level since the schema is stable at runtime.
        This allows backwards compatibility when the column hasn't been added yet.
        """
        global _has_assigned_project_cache
        if _has_assigned_project_cache is not None:
            return _has_assigned_project_cache

        columns_query = """
            SELECT column_name
            FROM information_schema.columns
            WHERE table_name = 'users' AND column_name = 'assigned_project_id'
        """
        result = await db_manager.execute_query(columns_query)
        _has_assigned_project_cache = len(result) > 0
        return _has_assigned_project_cache

    async def _get_users_column_names(self) -> List[str]:
        """Get column names for the users table.

        Results are cached at module level since the schema is stable at runtime.
        """
        global _users_column_names_cache
        if _users_column_names_cache is not None:
            return _users_column_names_cache

        users_columns_query = """
            SELECT column_name
            FROM information_schema.columns
            WHERE table_name = 'users'
        """
        users_columns_result = await db_manager.execute_query(users_columns_query)
        _users_column_names_cache = [col['column_name'] for col in users_columns_result] if users_columns_result else []
        return _users_column_names_cache

    async def get_users(self) -> List[Dict[str, Any]]:
        """Get all users (without passwords)."""
        # Dynamically detect roles table schema to handle both 'role_name' and 'name' columns
        has_role_name, has_name, has_display_name, role_name_col = await self._get_roles_column_info()

        # Also check if users table has a legacy 'role' text column
        users_column_names = await self._get_users_column_names()
        has_legacy_role = 'role' in users_column_names

        # Check if assigned_project_id column exists (backwards compatibility)
        has_assigned_project = await self._has_assigned_project_column()
        assigned_project_select = ", u.assigned_project_id" if has_assigned_project else ""

        # Build the role selection part of the query
        if role_name_col:
            # Primary: Get role from roles table via JOIN
            role_select = f"r.{role_name_col} as role_name"
            if has_display_name:
                role_select += ", r.display_name as role_display_name"
            else:
                role_select += f", r.{role_name_col} as role_display_name"

            # If legacy role column exists, include it as fallback
            if has_legacy_role:
                role_select += ", u.role as legacy_role"

            query = f"""
                SELECT u.id, u.first_name, u.last_name, u.email, u.role_id,
                       u.company_id, u.is_active, u.is_root, u.created_at{assigned_project_select},
                       c.name as company_name,
                       {role_select}
                FROM {self.table_name} u
                LEFT JOIN companies c ON u.company_id::text = c.id::text
                LEFT JOIN roles r ON u.role_id::text = r.id::text
                ORDER BY u.first_name, u.last_name
            """
        elif has_legacy_role:
            # Fallback: Use legacy role column from users table
            query = f"""
                SELECT u.id, u.first_name, u.last_name, u.email, u.role_id,
                       u.company_id, u.is_active, u.is_root, u.created_at{assigned_project_select},
                       c.name as company_name,
                       u.role as role_name, u.role as role_display_name, u.role as legacy_role
                FROM {self.table_name} u
                LEFT JOIN companies c ON u.company_id::text = c.id::text
                ORDER BY u.first_name, u.last_name
            """
        else:
            # No role info available at all
            query = f"""
                SELECT u.id, u.first_name, u.last_name, u.email, u.role_id,
                       u.company_id, u.is_active, u.is_root, u.created_at{assigned_project_select},
                       c.name as company_name,
                       NULL as role_name, NULL as role_display_name
                FROM {self.table_name} u
                LEFT JOIN companies c ON u.company_id::text = c.id::text
                ORDER BY u.first_name, u.last_name
            """
        
        rows = await db_manager.execute_query(query)

        users = []
        for i, row in enumerate(rows):
            user_data = dict(row)

            # Convert company_id to companyId for frontend compatibility
            if 'company_id' in user_data:
                user_data['companyId'] = user_data['company_id']
            # Preserve company_name in both formats for frontend compatibility
            if 'company_name' in user_data and user_data['company_name']:
                user_data['companyName'] = user_data['company_name']
            # Convert is_active to isActive for frontend compatibility
            if 'is_active' in user_data:
                user_data['isActive'] = user_data['is_active']
            # Convert is_root to isRoot for frontend compatibility
            if 'is_root' in user_data:
                user_data['isRoot'] = user_data['is_root']
            # Convert assigned_project_id to assignedProjectId for frontend compatibility
            if 'assigned_project_id' in user_data:
                user_data['assignedProjectId'] = user_data['assigned_project_id']

            # Use role from roles table (primary source), fallback to legacy_role
            role_from_join = user_data.get('role_name')
            legacy_role = user_data.get('legacy_role')
            
            if role_from_join:
                user_data['role'] = role_from_join
                user_data['role_name'] = user_data.get('role_display_name') or role_from_join
            elif legacy_role:
                # Fallback to legacy role column from users table
                user_data['role'] = legacy_role
                user_data['role_name'] = legacy_role
            else:
                pass  # No role info available

            # Add roleId for frontend (primary identifier)
            if 'role_id' in user_data:
                user_data['roleId'] = user_data['role_id']
            
            # Clean up temporary fields
            if 'legacy_role' in user_data:
                del user_data['legacy_role']
            
            final_user = self._convert_to_camel_case(user_data)
            users.append(final_user)
        return users
    
    async def get_company_users(self, company_id: str) -> List[Dict[str, Any]]:
        """Get all users for a specific company."""
        # Dynamically detect roles table schema to handle both 'role_name' and 'name' columns
        has_role_name, has_name, has_display_name, role_name_col = await self._get_roles_column_info()

        # Also check if users table has a legacy 'role' text column (cached)
        users_column_names = await self._get_users_column_names()
        has_legacy_role = 'role' in users_column_names

        # Check if assigned_project_id column exists (backwards compatibility)
        has_assigned_project = await self._has_assigned_project_column()
        assigned_project_select = ", u.assigned_project_id" if has_assigned_project else ""

        # Build the role selection part of the query
        if role_name_col:
            role_select = f"r.{role_name_col} as role_name"
            if has_display_name:
                role_select += ", r.display_name as role_display_name"
            else:
                role_select += f", r.{role_name_col} as role_display_name"

            if has_legacy_role:
                role_select += ", u.role as legacy_role"

            query = f"""
                SELECT u.id, u.first_name, u.last_name, u.email, u.role_id,
                       u.company_id, u.is_active, u.is_root, u.created_at{assigned_project_select},
                       c.name as company_name,
                       {role_select}
                FROM {self.table_name} u
                LEFT JOIN companies c ON u.company_id::text = c.id::text
                LEFT JOIN roles r ON u.role_id::text = r.id::text
                WHERE u.company_id::text = $1::text
                ORDER BY u.first_name, u.last_name
            """
        elif has_legacy_role:
            query = f"""
                SELECT u.id, u.first_name, u.last_name, u.email, u.role_id,
                       u.company_id, u.is_active, u.is_root, u.created_at{assigned_project_select},
                       c.name as company_name,
                       u.role as role_name, u.role as role_display_name, u.role as legacy_role
                FROM {self.table_name} u
                LEFT JOIN companies c ON u.company_id::text = c.id::text
                WHERE u.company_id::text = $1::text
                ORDER BY u.first_name, u.last_name
            """
        else:
            query = f"""
                SELECT u.id, u.first_name, u.last_name, u.email, u.role_id,
                       u.company_id, u.is_active, u.is_root, u.created_at{assigned_project_select},
                       c.name as company_name,
                       NULL as role_name, NULL as role_display_name
                FROM {self.table_name} u
                LEFT JOIN companies c ON u.company_id::text = c.id::text
                WHERE u.company_id::text = $1::text
                ORDER BY u.first_name, u.last_name
            """
        
        rows = await db_manager.execute_query(query, company_id)

        users = []
        for i, row in enumerate(rows):
            user_data = dict(row)

            # Convert company_id to companyId for frontend compatibility
            if 'company_id' in user_data:
                user_data['companyId'] = user_data['company_id']
            # Preserve company_name in both formats for frontend compatibility
            if 'company_name' in user_data and user_data['company_name']:
                user_data['companyName'] = user_data['company_name']
            # Convert is_active to isActive for frontend compatibility
            if 'is_active' in user_data:
                user_data['isActive'] = user_data['is_active']
            # Convert is_root to isRoot for frontend compatibility
            if 'is_root' in user_data:
                user_data['isRoot'] = user_data['is_root']
            # Convert assigned_project_id to assignedProjectId for frontend compatibility
            if 'assigned_project_id' in user_data:
                user_data['assignedProjectId'] = user_data['assigned_project_id']

            # Use role from roles table (primary source), fallback to legacy_role
            role_from_join = user_data.get('role_name')
            legacy_role = user_data.get('legacy_role')

            if role_from_join:
                user_data['role'] = role_from_join
                user_data['role_name'] = user_data.get('role_display_name') or role_from_join
            elif legacy_role:
                user_data['role'] = legacy_role
                user_data['role_name'] = legacy_role

            # Add roleId for frontend (primary identifier)
            if 'role_id' in user_data:
                user_data['roleId'] = user_data['role_id']
            
            # Clean up temporary fields
            if 'legacy_role' in user_data:
                del user_data['legacy_role']
            
            users.append(self._convert_to_camel_case(user_data))
        return users
    
    async def create_rbac_user(self, user_data: Dict[str, Any]) -> Dict[str, Any]:
        """Create a new user for RBAC system."""
        user_id = str(uuid.uuid4())
        now = datetime.now(timezone.utc)
        
        # Convert camelCase to snake_case for database
        data = self._convert_from_camel_case(user_data)
        
        # Get role_id - must be provided
        role_id = data.get('role_id')
        if not role_id:
            raise ValueError("role_id is required for user creation")
        
        # Ensure role_id is an integer
        try:
            role_id = int(role_id)
        except (ValueError, TypeError):
            raise ValueError(f"role_id must be a valid integer, got: {role_id}")

        # Validate role_id exists in database (cast to text for comparison)
        role_exists = await db_manager.execute_one(
            "SELECT id FROM roles WHERE id::text = $1::text",
            str(role_id)
        )
        if not role_exists:
            raise ValueError(f"Invalid role_id: {role_id} does not exist in roles table")
        
        # Handle company_id
        # Root users MUST have NULL company_id, regular users must have company_id
        is_root = data.get('is_root', False)
        company_id = data.get('company_id')
        if is_root:
            company_id = None  # Root users cannot belong to a company
        elif company_id:
            company_id = str(company_id)  # Ensure it's a string for varchar column

        # Hash password if provided
        password_hash = None
        if data.get('password'):
            password_bytes = data['password'].encode('utf-8')
            password_hash = bcrypt.hashpw(password_bytes, bcrypt.gensalt()).decode('utf-8')
        
        if not password_hash and role_id != 4:  # Client role (4) uses magic link, no password
            raise ValueError("Password is required for user creation")
        
        # Get first_name and last_name
        first_name = data.get('first_name') or ''
        last_name = data.get('last_name') or ''
        email = data.get('email')
        is_active = data.get('is_active', True)

        # Check if assigned_project_id column exists (backwards compatibility)
        has_assigned_project_col = await self._has_assigned_project_column()

        # Handle assigned_project_id for client users (only if column exists)
        assigned_project_id = data.get('assigned_project_id') if has_assigned_project_col else None
        if has_assigned_project_col and assigned_project_id:
            # Get role name to validate only client role can have assigned project
            role_info = await db_manager.execute_one(
                "SELECT COALESCE(role_name, name) as role_name FROM roles WHERE id = $1",
                role_id
            )
            role_name = role_info['role_name'] if role_info else None
            if role_name and role_name.lower() != 'client':
                raise ValueError("Only client role users can be assigned to a project")

            # Validate project exists and belongs to the same company
            project_check = await db_manager.execute_one(
                "SELECT company_id FROM projects WHERE id = $1",
                assigned_project_id
            )
            if not project_check:
                raise ValueError(f"Assigned project {assigned_project_id} does not exist")
            if company_id and str(project_check['company_id']) != str(company_id):
                raise ValueError("Assigned project must belong to the same company as the user")

        # Verify only ONE root user allowed
        if is_root:
            # Verify no other root user exists
            existing_root = await db_manager.execute_one(
                "SELECT id FROM users WHERE is_root = true LIMIT 1"
            )
            if existing_root:
                raise ValueError("A root user already exists. Only ONE root user is allowed.")

        if has_assigned_project_col:
            query = f"""
                INSERT INTO {self.table_name}
                (id, first_name, last_name, email, password, role_id, company_id, is_active, is_root, assigned_project_id, created_at, updated_at)
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW(), NOW())
                RETURNING id, first_name, last_name, email, role_id, company_id, is_active, is_root, assigned_project_id, created_at
            """
            query_params = (user_id, first_name, last_name, email, password_hash, role_id, company_id, is_active, is_root, assigned_project_id)
        else:
            # Column doesn't exist yet - skip assigned_project_id
            query = f"""
                INSERT INTO {self.table_name}
                (id, first_name, last_name, email, password, role_id, company_id, is_active, is_root, created_at, updated_at)
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), NOW())
                RETURNING id, first_name, last_name, email, role_id, company_id, is_active, is_root, created_at
            """
            query_params = (user_id, first_name, last_name, email, password_hash, role_id, company_id, is_active, is_root)

        try:
            row = await db_manager.execute_one(query, *query_params)
        except Exception as e:
            raise
        
        # Fetch user with role information
        return await self.get_user(user_id) or dict(row)
    
    async def update_user(self, user_id: str, user_data: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """Update an existing user."""
        data = self._convert_from_camel_case(user_data)
        
        if not data:
            return await self.get_user(user_id)
        
        # Remove transition-specific fields handled at the endpoint level
        for key in ('sub_company_id', 'sub_company_name', 'sub_trade'):
            data.pop(key, None)

        # Handle role_id - if role name is provided, look up role_id
        role_id = data.get('role_id')
        if not role_id and data.get('role'):
            # Look up role_id by role name
            role_name = data.get('role')
            role_lookup = await db_manager.execute_one(
                "SELECT id FROM roles WHERE LOWER(role_name) = LOWER($1) OR LOWER(name) = LOWER($1) LIMIT 1",
                role_name
            )
            if role_lookup:
                role_id = role_lookup['id']
                data['role_id'] = role_id
        
        # Remove role text field - we only use role_id
        data.pop('role', None)
        
        # Hash password if being updated
        if 'password' in data and data['password']:
            password_bytes = data['password'].encode('utf-8')
            data['password'] = bcrypt.hashpw(password_bytes, bcrypt.gensalt()).decode('utf-8')

        # Check if assigned_project_id column exists (backwards compatibility)
        has_assigned_project = await self._has_assigned_project_column()

        # Validate assigned_project_id if being updated (only if column exists)
        if has_assigned_project:
            assigned_project_id = data.get('assigned_project_id')
            if assigned_project_id is not None:  # None means clear, empty string also clears
                if assigned_project_id:  # Non-empty value - validate it
                    # Get user's current role or the role being set
                    effective_role_id = role_id
                    if not effective_role_id:
                        user_info = await db_manager.execute_one(
                            "SELECT role_id, company_id FROM users WHERE id = $1", user_id
                        )
                        if user_info:
                            effective_role_id = user_info['role_id']
                            if not data.get('company_id'):
                                data['_user_company_id'] = user_info['company_id']

                    if effective_role_id:
                        role_info = await db_manager.execute_one(
                            "SELECT COALESCE(role_name, name) as role_name FROM roles WHERE id = $1",
                            effective_role_id
                        )
                        role_name = role_info['role_name'] if role_info else None
                        if role_name and role_name.lower() != 'client':
                            raise ValueError("Only client role users can be assigned to a project")

                    # Validate project exists and belongs to same company
                    company_id = data.get('company_id') or data.get('_user_company_id')
                    if company_id:
                        project_check = await db_manager.execute_one(
                            "SELECT company_id FROM projects WHERE id = $1",
                            assigned_project_id
                        )
                        if not project_check:
                            raise ValueError(f"Assigned project {assigned_project_id} does not exist")
                        if str(project_check['company_id']) != str(company_id):
                            raise ValueError("Assigned project must belong to the same company as the user")

                # Remove temporary field
                data.pop('_user_company_id', None)
        else:
            # Column doesn't exist - remove from data to avoid update errors
            data.pop('assigned_project_id', None)

        set_clauses = []
        values = []
        param_count = 1

        # Build allowed fields list dynamically based on column existence
        allowed_fields = ['first_name', 'last_name', 'email', 'password', 'role_id', 'company_id', 'is_active', 'username']
        if has_assigned_project:
            allowed_fields.append('assigned_project_id')

        for key, value in data.items():
            if key != 'id':  # Don't update ID
                # Only update fields that exist in the users table
                # Explicitly exclude 'name' and other invalid fields
                if key in allowed_fields:
                    set_clauses.append(f"{key} = ${param_count}")
                    values.append(value if value != '' else None)  # Convert empty string to NULL
                    param_count += 1
        
        # Always update updated_at
        set_clauses.append(f"updated_at = NOW()")
        
        if not set_clauses or len(set_clauses) == 1:  # Only updated_at
            return await self.get_user(user_id)
        
        values.append(user_id)
        
        query = f"""
            UPDATE {self.table_name} 
            SET {', '.join(set_clauses)}
            WHERE id = ${param_count}
            RETURNING id, first_name, last_name, email, role_id, is_active, company_id, created_at
        """
        
        await db_manager.execute_one(query, *values)
        # Return updated user with role information
        return await self.get_user(user_id)
    
    async def delete_user(self, user_id: str) -> bool:
        """Delete a user with cascade handling."""
        try:
            # Capture subcontractor_id before deletion so we can deactivate orphaned companies
            sub_row = await db_manager.execute_one(
                "SELECT subcontractor_id FROM users WHERE id = $1", user_id
            )
            sub_company_id = sub_row.get("subcontractor_id") if sub_row else None

            # First, unassign tasks assigned to this user
            await db_manager.execute("UPDATE tasks SET assignee_id = NULL WHERE assignee_id = $1", user_id)

            # Then delete the user
            result = await db_manager.execute(f"DELETE FROM {self.table_name} WHERE id = $1", user_id)
            deleted = "DELETE 1" in result

            # Deactivate orphaned subcontractor company if no other users reference it
            if deleted and sub_company_id:
                remaining = await db_manager.execute_one(
                    "SELECT COUNT(*) as cnt FROM users WHERE subcontractor_id = $1", sub_company_id
                )
                if remaining and remaining["cnt"] == 0:
                    await db_manager.execute(
                        "UPDATE subcontractors SET status = 'inactive', updated_at = NOW() WHERE id = $1",
                        sub_company_id,
                    )

            return deleted
        except Exception as e:
            code = getattr(e, 'sqlstate', None)
            if code == '23503':  # foreign_key_violation
                raise ValueError(
                    "This user has associated records (issues, posts, comments, etc.) and cannot be deleted. "
                    "Deactivate the user instead, or contact your administrator."
                )
            print(f"Error deleting user {user_id}: {e}")
            return False
    
    async def force_delete_user(self, user_id: str) -> bool:
        """Force-delete a user by cleaning up all FK references first.

        Root admin only. Uses safe_delete to skip tables that may not exist.
        Error codes caught: 42P01 = undefined_table, 42703 = undefined_column.
        """
        pool = await get_db_pool()
        async with pool.acquire() as conn:
            async with conn.transaction():
                async def safe_delete(query: str, *args):
                    try:
                        await conn.execute(query, *args)
                    except Exception as e:
                        code = getattr(e, 'sqlstate', None) or getattr(e, 'code', None)
                        if code in ('42P01', '42703', '42P07'):
                            pass  # table or column doesn't exist — skip
                        else:
                            raise

                # --- public schema ---
                await safe_delete("UPDATE tasks SET assignee_id = NULL WHERE assignee_id = $1", user_id)
                await safe_delete("DELETE FROM beta_invitations WHERE invited_by = $1", user_id)
                await safe_delete("DELETE FROM change_orders WHERE approved_by = $1", user_id)
                await safe_delete("DELETE FROM change_orders WHERE requested_by = $1", user_id)
                await safe_delete("DELETE FROM communications WHERE from_user_id = $1 OR to_user_id = $1", user_id)
                await safe_delete("DELETE FROM company_users WHERE user_id = $1", user_id)
                await safe_delete("DELETE FROM photos WHERE user_id = $1", user_id)
                await safe_delete("DELETE FROM project_logs WHERE user_id = $1", user_id)
                await safe_delete("DELETE FROM notifications WHERE user_id = $1", user_id)
                await safe_delete("DELETE FROM schedule_changes WHERE user_id = $1", user_id)
                await safe_delete("DELETE FROM time_entries WHERE user_id = $1", user_id)
                await safe_delete("UPDATE time_entries SET approved_by = NULL WHERE approved_by = $1", user_id)
                await safe_delete("DELETE FROM user_activities WHERE user_id = $1", user_id)
                await safe_delete("DELETE FROM user_effective_permissions WHERE user_id = $1", user_id)
                await safe_delete("DELETE FROM project_assignments WHERE user_id = $1", user_id)
                await safe_delete("UPDATE project_assignments SET granted_by_user_id = NULL WHERE granted_by_user_id = $1", user_id)
                await safe_delete("DELETE FROM risk_assessments WHERE assigned_to = $1 OR identified_by = $1", user_id)

                # --- sub module tables ---
                await safe_delete("DELETE FROM sub_task_documents WHERE uploaded_by = $1", user_id)
                await safe_delete("UPDATE sub_checklist_items SET completed_by = NULL WHERE completed_by = $1", user_id)
                await safe_delete("DELETE FROM sub_task_reviews WHERE reviewer_id = $1", user_id)
                await safe_delete("UPDATE sub_tasks SET assigned_user_id = NULL WHERE assigned_user_id = $1", user_id)
                await safe_delete("DELETE FROM sub_tasks WHERE created_by = $1", user_id)
                await safe_delete("DELETE FROM sub_checklist_templates WHERE created_by = $1", user_id)
                await safe_delete("DELETE FROM subcontractor_assignments WHERE assigned_by = $1 OR subcontractor_id = $1", user_id)

                # --- client_portal schema ---
                await safe_delete("DELETE FROM client_portal.issue_audit_log WHERE actor_id = $1", user_id)
                await safe_delete("DELETE FROM client_portal.issue_attachments WHERE uploaded_by = $1", user_id)
                await safe_delete("DELETE FROM client_portal.issue_comments WHERE author_id = $1", user_id)
                await safe_delete("UPDATE client_portal.issues SET assigned_to = NULL WHERE assigned_to = $1", user_id)
                await safe_delete("UPDATE client_portal.issues SET resolved_by = NULL WHERE resolved_by = $1", user_id)
                await safe_delete("DELETE FROM client_portal.issues WHERE created_by = $1", user_id)
                await safe_delete("DELETE FROM client_portal.forum_attachments WHERE uploaded_by = $1", user_id)
                await safe_delete("DELETE FROM client_portal.forum_messages WHERE author_id = $1", user_id)
                await safe_delete("DELETE FROM client_portal.forum_threads WHERE created_by = $1", user_id)
                await safe_delete("DELETE FROM client_portal.material_documents WHERE uploaded_by = $1", user_id)
                await safe_delete("DELETE FROM client_portal.material_items WHERE added_by = $1", user_id)
                await safe_delete("DELETE FROM client_portal.material_areas WHERE created_by = $1", user_id)
                await safe_delete("DELETE FROM client_portal.materials WHERE added_by = $1", user_id)
                await safe_delete("DELETE FROM client_portal.installment_files WHERE uploaded_by = $1", user_id)
                await safe_delete("DELETE FROM client_portal.notification_settings WHERE user_id = $1", user_id)
                await safe_delete("DELETE FROM client_portal.notifications WHERE user_id = $1", user_id)
                await safe_delete("DELETE FROM client_portal.pm_notification_prefs WHERE recipient_user_id = $1", user_id)
                await safe_delete("DELETE FROM client_portal.pm_notifications WHERE recipient_user_id = $1", user_id)
                await safe_delete("DELETE FROM client_portal.payment_documents WHERE uploaded_by = $1", user_id)
                await safe_delete("DELETE FROM client_portal.payment_events WHERE actor_id = $1", user_id)
                await safe_delete("DELETE FROM client_portal.payment_receipts WHERE uploaded_by = $1", user_id)
                await safe_delete("UPDATE client_portal.payment_installments SET created_by = NULL WHERE created_by = $1", user_id)
                await safe_delete("UPDATE client_portal.payment_installments SET updated_by = NULL WHERE updated_by = $1", user_id)
                await safe_delete("UPDATE client_portal.payment_schedules SET created_by = NULL WHERE created_by = $1", user_id)
                await safe_delete("UPDATE client_portal.payment_schedules SET updated_by = NULL WHERE updated_by = $1", user_id)
                await safe_delete("DELETE FROM client_portal.invoices WHERE created_by = $1", user_id)
                await safe_delete("DELETE FROM client_portal.project_stages WHERE created_by = $1", user_id)
                await safe_delete("DELETE FROM client_portal.client_invitations WHERE invited_by = $1", user_id)
                await safe_delete("DELETE FROM client_portal.client_invitations WHERE user_id = $1", user_id)
                await safe_delete("DELETE FROM client_portal.sub_invitations WHERE invited_by = $1", user_id)
                await safe_delete("DELETE FROM client_portal.sub_invitations WHERE user_id = $1", user_id)
                await safe_delete("DELETE FROM client_portal.magic_link_tokens WHERE user_id = $1", user_id)

                # --- agent schema ---
                await safe_delete("DELETE FROM agent.pending_confirmations WHERE user_id = $1", user_id)
                await safe_delete("UPDATE agent.tool_calls SET confirmed_by = NULL WHERE confirmed_by = $1", user_id)
                await safe_delete("DELETE FROM agent.tool_calls WHERE user_id = $1", user_id)
                await safe_delete("DELETE FROM agent.feedback WHERE user_id = $1", user_id)
                await safe_delete("UPDATE agent.metrics SET user_id = NULL WHERE user_id = $1", user_id)
                await safe_delete("DELETE FROM agent.conversations WHERE user_id = $1", user_id)

                # --- legacy public tables ---
                await safe_delete("DELETE FROM client_forum_messages WHERE author_id = $1", user_id)
                await safe_delete("DELETE FROM client_issues WHERE created_by = $1", user_id)
                await safe_delete("DELETE FROM client_materials WHERE added_by = $1", user_id)

                # --- sessions (sid/sess/expire format — no direct FK) ---
                await safe_delete("DELETE FROM sessions WHERE sess::jsonb->>'userId' = $1", str(user_id))
                await safe_delete("DELETE FROM sessions WHERE sess::jsonb->>'id' = $1", str(user_id))

                # Capture subcontractor_id before deletion
                sub_row = await conn.fetchrow(
                    "SELECT subcontractor_id FROM users WHERE id = $1", user_id
                )
                sub_company_id = sub_row["subcontractor_id"] if sub_row and sub_row["subcontractor_id"] else None

                # Finally delete the user
                result = await conn.execute("DELETE FROM users WHERE id = $1", user_id)
                deleted = "DELETE 1" in result

                # Deactivate orphaned subcontractor company if no other users reference it
                if deleted and sub_company_id:
                    remaining = await conn.fetchval(
                        "SELECT COUNT(*) FROM users WHERE subcontractor_id = $1", sub_company_id
                    )
                    if remaining == 0:
                        await conn.execute(
                            "UPDATE subcontractors SET status = 'inactive', updated_at = NOW() WHERE id = $1",
                            sub_company_id,
                        )

                return deleted

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
        now = datetime.now(timezone.utc)
        
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
        """Delete a company and all related records in proper FK dependency order.

        Uses safe_delete for every table since migrations may not have run and
        tables/columns may not exist.  Error codes caught:
          42P01 = undefined_table, 42703 = undefined_column, 42P07 = duplicate_table
        """
        pool = await get_db_pool()
        async with pool.acquire() as conn:
            async with conn.transaction():
                async def safe_delete(query: str, *args):
                    try:
                        await conn.execute(query, *args)
                    except Exception as e:
                        code = getattr(e, 'sqlstate', None) or getattr(e, 'code', None)
                        if code in ('42P01', '42703', '42P07'):
                            pass  # table or column doesn't exist — skip
                        else:
                            raise

                # Collect IDs for subquery-based deletes
                project_ids = [r['id'] for r in await conn.fetch(
                    "SELECT id FROM projects WHERE company_id = $1", company_id
                )]
                user_ids = [r['id'] for r in await conn.fetch(
                    "SELECT id FROM users WHERE company_id = $1", company_id
                )]

                if project_ids:
                    # --- client_portal: deepest leaf tables first ---
                    # Issues (comments/attachments CASCADE from issues)
                    await safe_delete(
                        "DELETE FROM client_portal.issue_comments WHERE issue_id IN "
                        "(SELECT id FROM client_portal.issues WHERE project_id = ANY($1))", project_ids)
                    await safe_delete(
                        "DELETE FROM client_portal.issue_attachments WHERE issue_id IN "
                        "(SELECT id FROM client_portal.issues WHERE project_id = ANY($1))", project_ids)
                    await safe_delete(
                        "DELETE FROM client_portal.issue_audit_log WHERE project_id = ANY($1)", project_ids)
                    await safe_delete(
                        "DELETE FROM client_portal.issues WHERE project_id = ANY($1)", project_ids)

                    # Forum (messages/attachments CASCADE from threads)
                    await safe_delete(
                        "DELETE FROM client_portal.forum_attachments WHERE message_id IN "
                        "(SELECT id FROM client_portal.forum_messages WHERE thread_id IN "
                        "(SELECT id FROM client_portal.forum_threads WHERE project_id = ANY($1)))", project_ids)
                    await safe_delete(
                        "DELETE FROM client_portal.forum_messages WHERE thread_id IN "
                        "(SELECT id FROM client_portal.forum_threads WHERE project_id = ANY($1))", project_ids)
                    await safe_delete(
                        "DELETE FROM client_portal.forum_threads WHERE project_id = ANY($1)", project_ids)

                    # Materials (items CASCADE from areas)
                    await safe_delete(
                        "DELETE FROM client_portal.material_items WHERE area_id IN "
                        "(SELECT id FROM client_portal.material_areas WHERE project_id = ANY($1))", project_ids)
                    await safe_delete(
                        "DELETE FROM client_portal.material_areas WHERE project_id = ANY($1)", project_ids)
                    await safe_delete(
                        "DELETE FROM client_portal.materials WHERE project_id = ANY($1)", project_ids)

                    # Payments — RESTRICT FKs require correct leaf-first order
                    await safe_delete(
                        "DELETE FROM client_portal.payment_events WHERE project_id = ANY($1)", project_ids)
                    await safe_delete(
                        "DELETE FROM client_portal.payment_receipts WHERE project_id = ANY($1)", project_ids)
                    await safe_delete(
                        "DELETE FROM client_portal.invoices WHERE project_id = ANY($1)", project_ids)
                    await safe_delete(
                        "DELETE FROM client_portal.payment_documents WHERE project_id = ANY($1)", project_ids)
                    await safe_delete(
                        "DELETE FROM client_portal.payment_installments WHERE project_id = ANY($1)", project_ids)
                    await safe_delete(
                        "DELETE FROM client_portal.payment_schedules WHERE project_id = ANY($1)", project_ids)

                    # Legacy installments (files CASCADE from installments)
                    await safe_delete(
                        "DELETE FROM client_portal.installment_files WHERE installment_id IN "
                        "(SELECT id FROM client_portal.installments WHERE project_id = ANY($1))", project_ids)
                    await safe_delete(
                        "DELETE FROM client_portal.installments WHERE project_id = ANY($1)", project_ids)

                    # Stages
                    await safe_delete(
                        "DELETE FROM client_portal.project_stages WHERE project_id = ANY($1)", project_ids)

                    # Notifications (project-scoped)
                    await safe_delete(
                        "DELETE FROM client_portal.notification_settings WHERE project_id = ANY($1)", project_ids)
                    await safe_delete(
                        "DELETE FROM client_portal.notifications WHERE project_id = ANY($1)", project_ids)
                    await safe_delete(
                        "DELETE FROM client_portal.pm_notifications WHERE project_id = ANY($1)", project_ids)

                    # Client invitations (project-scoped)
                    await safe_delete(
                        "DELETE FROM client_portal.client_invitations WHERE project_id = ANY($1)", project_ids)

                    # --- Public schema: project-scoped tables with NO ACTION FKs ---
                    await safe_delete("DELETE FROM schedule_changes WHERE task_id IN (SELECT id FROM tasks WHERE project_id = ANY($1))", project_ids)
                    await safe_delete("DELETE FROM time_entries WHERE project_id = ANY($1)", project_ids)
                    await safe_delete("DELETE FROM change_orders WHERE project_id = ANY($1)", project_ids)
                    await safe_delete("DELETE FROM communications WHERE project_id = ANY($1)", project_ids)
                    await safe_delete("DELETE FROM subcontractor_assignments WHERE project_id = ANY($1)", project_ids)
                    await safe_delete("DELETE FROM invoices WHERE project_id = ANY($1)", project_ids)
                    await safe_delete("DELETE FROM photos WHERE project_id = ANY($1)", project_ids)
                    await safe_delete("DELETE FROM project_logs WHERE project_id = ANY($1)", project_ids)
                    await safe_delete("DELETE FROM project_health_metrics WHERE project_id = ANY($1)", project_ids)
                    await safe_delete("DELETE FROM risk_assessments WHERE project_id = ANY($1)", project_ids)
                    # Legacy client_* tables
                    await safe_delete("DELETE FROM client_notification_settings WHERE project_id = ANY($1)", project_ids)
                    await safe_delete("DELETE FROM client_issues WHERE project_id = ANY($1)", project_ids)
                    await safe_delete("DELETE FROM client_materials WHERE project_id = ANY($1)", project_ids)
                    await safe_delete("DELETE FROM client_forum_messages WHERE project_id = ANY($1)", project_ids)
                    await safe_delete("DELETE FROM client_installments WHERE project_id = ANY($1)", project_ids)

                if user_ids:
                    # User-scoped client_portal tables
                    await safe_delete(
                        "DELETE FROM client_portal.magic_link_tokens WHERE user_id = ANY($1)", user_ids)
                    await safe_delete(
                        "DELETE FROM client_portal.client_invitations WHERE user_id = ANY($1)", user_ids)
                    await safe_delete(
                        "DELETE FROM client_portal.pm_notifications WHERE recipient_user_id = ANY($1)", user_ids)
                    await safe_delete(
                        "DELETE FROM client_portal.pm_notification_prefs WHERE recipient_user_id = ANY($1)", user_ids)
                    # Public user-scoped tables with NO ACTION FKs
                    await safe_delete("DELETE FROM notifications WHERE user_id = ANY($1)", user_ids)

                # --- Agent schema (CASCADE from conversations handles messages/tool_calls/etc.) ---
                await safe_delete("DELETE FROM agent.feedback WHERE company_id = $1", company_id)
                await safe_delete("DELETE FROM agent.metrics WHERE company_id = $1", company_id)
                await safe_delete("DELETE FROM agent.scheduled_jobs WHERE company_id = $1", company_id)
                await safe_delete("DELETE FROM agent.conversations WHERE company_id = $1", company_id)

                # --- RBAC tables (most have CASCADE from companies) ---
                await safe_delete("DELETE FROM project_assignments WHERE company_id = $1", company_id)
                await safe_delete("DELETE FROM user_effective_permissions WHERE company_id = $1", company_id)
                await safe_delete("DELETE FROM company_users WHERE company_id = $1", company_id)
                await safe_delete("DELETE FROM role_permissions WHERE company_id = $1", company_id)

                # --- Public schema: company-scoped ---
                await safe_delete("DELETE FROM audit_logs WHERE company_id = $1", company_id)
                await safe_delete("DELETE FROM user_activities WHERE company_id = $1", company_id)
                await safe_delete("DELETE FROM tasks WHERE company_id = $1", company_id)
                await safe_delete("DELETE FROM projects WHERE company_id = $1", company_id)

                # Sessions (no user_id column — sid/sess/expire only) then users
                if user_ids:
                    # Sessions store user data in JSONB 'sess'; delete by matching userId
                    for uid in user_ids:
                        await safe_delete("DELETE FROM sessions WHERE sess::jsonb->>'userId' = $1", str(uid))
                        await safe_delete("DELETE FROM sessions WHERE sess::jsonb->>'id' = $1", str(uid))
                await safe_delete("DELETE FROM users WHERE company_id = $1", company_id)

                # Finally delete the company
                result = await conn.execute(f"DELETE FROM {self.table_name} WHERE id = $1", company_id)
                return "DELETE 1" in result


class RoleRepository:
    """Repository for role operations."""
    
    def __init__(self):
        self.table_name = "roles"
    
    def _convert_to_camel_case(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """Convert snake_case keys to camelCase for frontend compatibility."""
        result = to_camel_case(data)
        if isinstance(result, dict):
            # Ensure 'id' field exists (preserve original 'id' from database)
            if 'id' not in result and 'id' in data:
                result['id'] = data['id']
            
            # Ensure 'name' field exists for frontend compatibility
            # Map role_name/roleName to name if name doesn't exist
            if 'name' not in result:
                if 'roleName' in result:
                    result['name'] = result['roleName']
                elif 'role_name' in result:
                    result['name'] = result['role_name']
            return result
        return data
    
    def _convert_from_camel_case(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """Convert camelCase keys to snake_case for database operations."""
        result = to_snake_case(data)
        return result if isinstance(result, dict) else data

    async def _get_roles_table_columns(self) -> List[str]:
        """Get column names for the roles table.

        Results are cached at module level since the schema is stable at runtime.
        """
        global _roles_table_columns_cache
        if _roles_table_columns_cache is not None:
            return _roles_table_columns_cache

        columns_query = """
            SELECT column_name
            FROM information_schema.columns
            WHERE table_name = 'roles'
            ORDER BY ordinal_position
        """
        columns_result = await db_manager.execute_query(columns_query)
        _roles_table_columns_cache = [col['column_name'] for col in columns_result] if columns_result else []
        return _roles_table_columns_cache

    async def _check_roles_table_exists(self) -> bool:
        """Check if the roles table exists in the public schema.

        Results are cached at module level since the schema is stable at runtime.
        """
        global _roles_table_exists_cache
        if _roles_table_exists_cache is not None:
            return _roles_table_exists_cache

        table_exists = await db_manager.execute_one("""
            SELECT EXISTS (
                SELECT 1
                FROM information_schema.tables
                WHERE table_schema = 'public'
                AND table_name = 'roles'
            )
        """)
        _roles_table_exists_cache = bool(table_exists and table_exists[0])
        return _roles_table_exists_cache

    async def _sync_roles_from_users(self) -> None:
        """Sync roles from users table to roles table if roles table is empty."""
        try:
            # Check if roles table has any data
            count_query = f"SELECT COUNT(*) FROM {self.table_name}"
            count_result = await db_manager.execute_one(count_query)
            role_count = count_result[0] if count_result else 0
            
            if role_count > 0:
                return  # Roles already exist, no need to sync
            
            print("Roles table is empty. Syncing roles from users table...")

            # Check which columns exist in roles table (cached)
            column_names = await self._get_roles_table_columns()

            has_company_id = 'company_id' in column_names
            has_role_name = 'role_name' in column_names
            has_name = 'name' in column_names
            has_display_name = 'display_name' in column_names
            has_is_active = 'is_active' in column_names
            
            # Get unique roles from users table
            # Try to get roles from role_id foreign key first, then fallback to text role field
            if has_role_name:
                # Simple roles table structure - get unique role_names from roles table via users
                unique_roles_query = """
                    SELECT DISTINCT r.role_name
                    FROM users u
                    JOIN roles r ON u.role_id = r.id
                    WHERE u.role_id IS NOT NULL
                    ORDER BY r.role_name
                """
            else:
                # Fallback: get from users.role text field
                unique_roles_query = """
                    SELECT DISTINCT role 
                    FROM users 
                    WHERE role IS NOT NULL AND role != ''
                    ORDER BY role
                """
            
            user_roles = await db_manager.execute_query(unique_roles_query)
            
            if not user_roles:
                # If no roles from users, create standard roles
                print("No roles found in users table. Creating standard roles...")
                standard_roles = [
                    ("admin", "Admin"),
                    ("office_manager", "Office Manager"),
                    ("project_manager", "Project Manager"),
                    ("client", "Client"),
                    ("crew", "Crew"),
                    ("subcontractor", "Subcontractor"),
                ]
                
                for role_name, display_name in standard_roles:
                    try:
                        if has_role_name:
                            # Simple roles table: role_name, display_name
                            insert_query = f"""
                                INSERT INTO {self.table_name} (role_name, display_name)
                                VALUES ($1, $2)
                                ON CONFLICT (role_name) DO NOTHING
                            """
                            await db_manager.execute(insert_query, role_name, display_name)
                        elif has_name and has_company_id:
                            # Complex roles table: need company_id
                            insert_query = f"""
                                INSERT INTO {self.table_name} (company_id, name, display_name)
                                VALUES ($1, $2, $3)
                                ON CONFLICT (company_id, name) DO NOTHING
                            """
                            await db_manager.execute(insert_query, None, role_name, display_name)
                        else:
                            print(f"⚠️  Cannot determine roles table structure for inserting {role_name}")
                            continue
                        print(f"Created standard role: {display_name}")
                    except Exception as e:
                        print(f"Error creating standard role {role_name}: {e}")
                        continue
                return
            
            # Role name mapping for display
            role_name_map = {
                'admin': 'Admin',
                'project_manager': 'Project Manager',
                'office_manager': 'Office Manager',
                'subcontractor': 'Subcontractor',
                'client': 'Client',
                'crew': 'Crew',
                'manager': 'Project Manager'  # Legacy
            }
            
            # Create roles for each unique role found
            for user_role_row in user_roles:
                if has_role_name:
                    role_string = user_role_row['role_name']
                else:
                    role_string = user_role_row['role']
                
                # Use mapped name or format the role string
                display_name = role_name_map.get(role_string, role_string.replace('_', ' ').title())
                
                # Check if role already exists
                if has_role_name:
                    check_query = f"SELECT id FROM {self.table_name} WHERE role_name = $1"
                    existing = await db_manager.execute_one(check_query, role_string)
                elif has_name:
                    check_query = f"SELECT id FROM {self.table_name} WHERE name = $1"
                    existing = await db_manager.execute_one(check_query, role_string)
                else:
                    continue
                
                if existing:
                    continue  # Role already exists, skip
                
                # Insert role based on table structure
                try:
                    if has_role_name and has_display_name:
                        # Simple roles table: role_name, display_name
                        insert_query = f"""
                            INSERT INTO {self.table_name} (role_name, display_name)
                            VALUES ($1, $2)
                            ON CONFLICT (role_name) DO NOTHING
                        """
                        await db_manager.execute(insert_query, role_string, display_name)
                        print(f"Created role: {display_name} (role_name: {role_string})")
                    elif has_name and has_company_id:
                        # Complex roles table: company_id, name, display_name
                        insert_query = f"""
                            INSERT INTO {self.table_name} (company_id, name, display_name)
                            VALUES ($1, $2, $3)
                            ON CONFLICT (company_id, name) DO NOTHING
                        """
                        await db_manager.execute(insert_query, None, role_string, display_name)
                        print(f"Created role: {display_name} for company None")
                    else:
                        print(f"⚠️  Cannot determine roles table structure for inserting {role_string}")
                        continue
                except Exception as e:
                    print(f"Error creating role {role_string}: {e}")
                    continue
            
            print(f"Synced {len(user_roles)} roles from users table.")
            
        except Exception as e:
            print(f"Error syncing roles from users: {e}")
            import traceback
            traceback.print_exc()
    
    async def get_roles(self) -> List[Dict[str, Any]]:
        """Get all roles. If roles table is empty, sync from users table."""
        try:
            # Check if roles table exists (cached)
            if not await self._check_roles_table_exists():
                print(f"WARNING: Table '{self.table_name}' does not exist. Run migration first.")
                return []

            # Check if roles table has any data
            count_query = f"SELECT COUNT(*) FROM {self.table_name}"
            count_result = await db_manager.execute_one(count_query)
            role_count = count_result[0] if count_result else 0

            if role_count == 0:
                # Try to sync roles from users table if roles table is empty
                await self._sync_roles_from_users()

            # Check which columns exist in roles table (cached)
            # The simple roles table (from fix_roles_table.py) has: id, role_name, display_name
            # The complex roles table (from create_roles_table.py) has: id, company_id, name, display_name, is_active, etc.
            column_names = await self._get_roles_table_columns()

            has_company_id = 'company_id' in column_names
            has_is_active = 'is_active' in column_names
            has_role_name = 'role_name' in column_names
            has_name = 'name' in column_names
            
            # Build query based on available columns
            if has_company_id and has_is_active:
                # Complex roles table structure
                query = f"""
                    SELECT r.*, c.name as company_name 
                    FROM {self.table_name} r
                    LEFT JOIN companies c ON r.company_id = c.id
                    WHERE r.is_active = TRUE
                    ORDER BY {f'r.role_name' if has_role_name else 'r.name'}
                """
            elif has_company_id:
                # Roles table with company_id but no is_active
                query = f"""
                    SELECT r.*, c.name as company_name 
                    FROM {self.table_name} r
                    LEFT JOIN companies c ON r.company_id = c.id
                    ORDER BY {f'r.role_name' if has_role_name else 'r.name'}
                """
            else:
                # Simple roles table (from fix_roles_table.py): id, role_name, display_name
                query = f"""
                    SELECT r.*, NULL as company_name 
                    FROM {self.table_name} r
                    ORDER BY r.role_name
                """
            rows = await db_manager.execute_query(query)
            roles = []
            for row in rows:
                try:
                    row_dict = dict(row)
                    camel_case_dict = self._convert_to_camel_case(row_dict)
                    roles.append(camel_case_dict)
                except Exception as e:
                    print(f"Error converting role row to camelCase: {e}")
                    print(f"Row data: {dict(row)}")
                    # Continue with next row instead of failing completely
                    continue
            return roles
        except Exception as e:
            error_msg = str(e)
            # Check if error is due to table not existing
            if "does not exist" in error_msg.lower() or "relation" in error_msg.lower() and "does not exist" in error_msg.lower():
                print(f"WARNING: Table '{self.table_name}' does not exist. Run migration first.")
                return []
            print(f"Error in get_roles: {error_msg}")
            import traceback
            traceback.print_exc()
            # Return empty list instead of raising to prevent 500 errors
            # The frontend can handle empty roles gracefully
            return []
    
    async def get_role(self, role_id: str) -> Optional[Dict[str, Any]]:
        """Get role by ID."""
        try:
            # Convert role_id to integer if needed (id column is SERIAL/INTEGER)
            try:
                role_id_int = int(role_id)
            except (ValueError, TypeError):
                return None
            
            query = f"SELECT * FROM {self.table_name} WHERE id = $1"
            row = await db_manager.execute_one(query, role_id_int)
            if row:
                return self._convert_to_camel_case(dict(row))
            return None
        except Exception as e:
            print(f"Error getting role {role_id}: {e}")
            return None
    
    async def create_role(self, role_data: Dict[str, Any], current_user: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        """Create a new role. Adapts to different roles table schemas."""
        try:
            # Check which columns exist in roles table (cached)
            column_names = await self._get_roles_table_columns()

            if not column_names:
                raise ValueError("Roles table does not exist or has no columns")

            has_company_id = 'company_id' in column_names
            has_name = 'name' in column_names
            has_role_name = 'role_name' in column_names
            has_display_name = 'display_name' in column_names
            has_description = 'description' in column_names
            has_permissions = 'permissions' in column_names
            has_custom_permissions = 'custom_permissions' in column_names
            has_is_active = 'is_active' in column_names
            has_created_at = 'created_at' in column_names

            data = self._convert_from_camel_case(role_data)

            # Get company_id - required for tables with company_id column
            company_id = data.get('company_id')
            if has_company_id and not company_id and current_user:
                # Get company_id from current user if not provided
                company_id = current_user.get('companyId') or current_user.get('company_id')
                if company_id:
                    company_id = str(company_id)

            if has_company_id and not company_id:
                raise ValueError("company_id is required for role creation")

            # Determine role name field
            role_name_field = 'name' if has_name else 'role_name' if has_role_name else None
            if not role_name_field:
                raise ValueError("Roles table must have either 'name' or 'role_name' column")
            
            role_name = data.get('name') or data.get('role_name')
            if not role_name:
                raise ValueError("Role name is required")
            
            # Build INSERT query based on available columns
            # Note: id is SERIAL (auto-increment), so we don't include it
            columns = []
            values = []
            
            if has_company_id:
                columns.append('company_id')
                values.append(company_id)
            
            if has_name:
                columns.append('name')
                values.append(role_name)
            elif has_role_name:
                columns.append('role_name')
                values.append(role_name)
            
            if has_display_name:
                display_name = data.get('display_name') or data.get('displayName') or role_name
                columns.append('display_name')
                values.append(display_name)
            
            if has_description:
                description = data.get('description')
                if description:
                    columns.append('description')
                    values.append(description)
            
            if has_permissions:
                permissions = data.get('permissions', [])
                columns.append('permissions')
                values.append(permissions if isinstance(permissions, list) else [])
            elif has_custom_permissions:
                permissions = data.get('permissions', [])
                columns.append('custom_permissions')
                values.append(permissions if isinstance(permissions, list) else [])
            
            if has_is_active:
                columns.append('is_active')
                values.append(data.get('is_active', True))
            
            if has_created_at:
                columns.append('created_at')
                values.append(datetime.now(timezone.utc))
            
            # Build parameterized query
            placeholders = ', '.join([f'${i+1}' for i in range(len(values))])
            columns_str = ', '.join(columns)
            
            query = f"""
                INSERT INTO {self.table_name} 
                ({columns_str})
                VALUES ({placeholders})
                RETURNING *
            """
            
            row = await db_manager.execute_one(query, *values)
            if not row:
                raise ValueError("Failed to create role - no data returned")
            
            return self._convert_to_camel_case(dict(row))
            
        except Exception as e:
            error_msg = str(e)
            print(f"Error creating role: {error_msg}")
            import traceback
            traceback.print_exc()
            raise ValueError(f"Failed to create role: {error_msg}")
    
    async def update_role(self, role_id: str, role_data: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """Update an existing role. Adapts to different roles table schemas."""
        try:
            # Convert role_id to integer if needed (id column is SERIAL/INTEGER)
            try:
                role_id_int = int(role_id)
            except (ValueError, TypeError):
                raise ValueError(f"Invalid role_id: {role_id} must be an integer")
            
            # Check which columns exist in roles table (cached)
            column_names = await self._get_roles_table_columns()

            if not column_names:
                raise ValueError("Roles table does not exist or has no columns")

            has_name = 'name' in column_names
            has_role_name = 'role_name' in column_names
            has_display_name = 'display_name' in column_names
            has_description = 'description' in column_names
            has_permissions = 'permissions' in column_names
            has_custom_permissions = 'custom_permissions' in column_names
            has_is_active = 'is_active' in column_names

            data = self._convert_from_camel_case(role_data)

            if not data:
                return await self.get_role(str(role_id_int))
            
            set_clauses = []
            values = []
            param_count = 1
            
            # Map input fields to actual database columns
            # Handle name/role_name - check both input and table schema
            role_name_value = data.get('name') or data.get('role_name')
            if role_name_value:
                if has_name:
                    set_clauses.append(f"name = ${param_count}")
                    values.append(role_name_value)
                    param_count += 1
                elif has_role_name:
                    set_clauses.append(f"role_name = ${param_count}")
                    values.append(role_name_value)
                    param_count += 1
            
            # Handle display_name
            if has_display_name and ('display_name' in data or 'displayName' in data):
                display_name = data.get('display_name') or data.get('displayName')
                if display_name:
                    set_clauses.append(f"display_name = ${param_count}")
                    values.append(display_name)
                    param_count += 1
            
            if 'description' in data and has_description:
                description = data.get('description')
                if description is not None:
                    set_clauses.append(f"description = ${param_count}")
                    values.append(description)
                    param_count += 1
            
            if 'permissions' in data:
                if has_permissions:
                    permissions = data.get('permissions', [])
                    set_clauses.append(f"permissions = ${param_count}")
                    values.append(permissions if isinstance(permissions, list) else [])
                    param_count += 1
                elif has_custom_permissions:
                    permissions = data.get('permissions', [])
                    set_clauses.append(f"custom_permissions = ${param_count}")
                    values.append(permissions if isinstance(permissions, list) else [])
                    param_count += 1
            
            if 'is_active' in data and has_is_active:
                set_clauses.append(f"is_active = ${param_count}")
                values.append(data.get('is_active', True))
                param_count += 1
            
            if not set_clauses:
                return await self.get_role(str(role_id_int))
            
            # Add role_id as the last parameter for WHERE clause
            values.append(role_id_int)
            
            query = f"""
                UPDATE {self.table_name} 
                SET {', '.join(set_clauses)}
                WHERE id = ${param_count}
                RETURNING *
            """
            
            row = await db_manager.execute_one(query, *values)
            if row:
                row_dict = dict(row)
                # Ensure 'id' is preserved (it should be in the row, but make sure)
                if 'id' not in row_dict:
                    row_dict['id'] = role_id_int
                return self._convert_to_camel_case(row_dict)
            return None
            
        except ValueError:
            raise
        except Exception as e:
            error_msg = str(e)
            print(f"Error updating role: {error_msg}")
            import traceback
            traceback.print_exc()
            raise ValueError(f"Failed to update role: {error_msg}")
    
    async def delete_role(self, role_id: str) -> bool:
        """Delete a role."""
        try:
            # Convert role_id to integer if needed (id column is SERIAL/INTEGER)
            try:
                role_id_int = int(role_id)
            except (ValueError, TypeError):
                print(f"Error: Invalid role_id format: {role_id}")
                return False
            
            result = await db_manager.execute(f"DELETE FROM {self.table_name} WHERE id = $1", role_id_int)
            return "DELETE 1" in result
        except Exception as e:
            print(f"Error deleting role {role_id}: {e}")
            import traceback
            traceback.print_exc()
            return False
    
    async def get_permissions(self) -> List[Dict[str, Any]]:
        """Get all available permissions from the database."""
        try:
            query = """
                SELECT id, name, resource, action, description, category
                FROM permissions
                ORDER BY category, resource, action
            """
            rows = await db_manager.execute_query(query)
            return [self._convert_to_camel_case(dict(row)) for row in rows]
        except Exception as e:
            print(f"Error getting permissions: {e}")
            # Fallback to empty list if table doesn't exist yet
            return []
    
    async def get_role_permissions(self, role_id: int) -> List[str]:
        """Get permission names for a specific role."""
        try:
            query = """
                SELECT p.name
                FROM permissions p
                JOIN role_permissions rp ON p.id = rp.permission_id
                WHERE rp.role_id = $1
            """
            rows = await db_manager.execute_query(query, role_id)
            return [row['name'] for row in rows]
        except Exception as e:
            print(f"Error getting role permissions for role {role_id}: {e}")
            return []
    
    async def get_user_permissions(self, user_id: str) -> List[str]:
        """Get all permission names for a user based on their role."""
        try:
            # Get user's role_id and is_root status
            user_query = "SELECT role_id, is_root FROM users WHERE id = $1"
            user = await db_manager.execute_one(user_query, user_id)
            
            if not user:
                return []
            
            # Root user has all permissions
            if user.get('is_root'):
                all_permissions = await self.get_permissions()
                return [p.get('name') for p in all_permissions if p.get('name')]
            
            role_id = user.get('role_id')
            if not role_id:
                return []
            
            return await self.get_role_permissions(role_id)
        except Exception as e:
            print(f"Error getting user permissions for user {user_id}: {e}")
            return []
    
    async def assign_permission_to_role(self, role_id: int, permission_id: int) -> bool:
        """Assign a permission to a role."""
        try:
            query = """
                INSERT INTO role_permissions (role_id, permission_id)
                VALUES ($1, $2)
                ON CONFLICT (role_id, permission_id) DO NOTHING
            """
            await db_manager.execute(query, role_id, permission_id)
            return True
        except Exception as e:
            print(f"Error assigning permission {permission_id} to role {role_id}: {e}")
            return False
    
    async def remove_permission_from_role(self, role_id: int, permission_id: int) -> bool:
        """Remove a permission from a role."""
        try:
            query = """
                DELETE FROM role_permissions
                WHERE role_id = $1 AND permission_id = $2
            """
            result = await db_manager.execute(query, role_id, permission_id)
            return "DELETE 1" in result
        except Exception as e:
            print(f"Error removing permission {permission_id} from role {role_id}: {e}")
            return False


# Global repository instances
auth_repo = AuthRepository()
company_repo = CompanyRepository()
role_repo = RoleRepository()