# Roles Table Migration Guide

## Overview

This migration creates a proper `roles` table in the database and migrates existing user roles from text fields to foreign key relationships. This is required for the RBAC (Role-Based Access Control) module to function correctly.

## What This Migration Does

1. **Creates `roles` table** with the following structure:
   - `id` (SERIAL PRIMARY KEY)
   - `company_id` (VARCHAR, references companies.id)
   - `name` (VARCHAR) - Internal role name (e.g., "admin", "project_manager")
   - `display_name` (VARCHAR) - Display name (e.g., "Admin", "Project Manager")
   - `description` (TEXT)
   - `is_active` (BOOLEAN)
   - `created_at`, `updated_at` (TIMESTAMP)

2. **Adds `role_id` column** to `users` table:
   - Foreign key reference to `roles.id`
   - Maintains backward compatibility with existing `role` text field

3. **Populates standard roles** for all companies:
   - `admin` - Company administrator
   - `office_manager` - Office manager
   - `project_manager` - Project manager
   - `client` - Client
   - `crew` - Crew member
   - `subcontractor` - Subcontractor

4. **Migrates existing user roles**:
   - Maps existing text roles to role_id foreign keys
   - Handles legacy role names (e.g., "manager" → "project_manager")

## Running the Migration

### Prerequisites

1. Ensure you have database access credentials configured
2. Backup your database before running the migration
3. Ensure the Python backend dependencies are installed

### Steps

1. **Navigate to the python_backend directory:**
   ```bash
   cd python_backend
   ```

2. **Run the migration:**
   ```bash
   python -m src.database.migrations.create_roles_table
   ```

   Or from the project root:
   ```bash
   cd python_backend && python -m src.database.migrations.create_roles_table
   ```

3. **Verify the migration:**
   - Check that the `roles` table exists
   - Verify that users have `role_id` populated
   - Check that standard roles are created for all companies

### Rollback (if needed)

If you need to rollback the migration:

```python
# Edit the migration file and run:
python -c "from src.database.migrations.create_roles_table import rollback_migration; import asyncio; from src.database.connection import get_db_pool; asyncio.run(rollback_migration(get_db_pool()))"
```

**WARNING:** Rollback will remove the `role_id` column and `roles` table. This is irreversible.

## Code Changes

### Backend Updates

1. **AuthRepository** (`python_backend/src/database/auth_repositories.py`):
   - Updated `get_user()`, `get_users()`, and `get_company_users()` to join with `roles` table
   - Returns both `role` (text) and `roleId` (integer) for backward compatibility
   - Uses role information from `roles` table when available

2. **CompanyAdmin API** (`python_backend/src/api/company_admin.py`):
   - Updated `assign_user_role()` to set both `role` text and `role_id` foreign key
   - Looks up role_id from roles table when assigning roles

3. **RoleRepository** (`python_backend/src/database/auth_repositories.py`):
   - Updated `get_roles()` to properly query the new roles table structure
   - Includes company information in role queries

## Database Schema Changes

### New Table: `roles`

```sql
CREATE TABLE roles (
    id SERIAL PRIMARY KEY,
    company_id VARCHAR REFERENCES companies(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    display_name VARCHAR(255) NOT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(company_id, name)
);
```

### Modified Table: `users`

```sql
ALTER TABLE users 
ADD COLUMN role_id INTEGER REFERENCES roles(id) ON DELETE SET NULL;
```

## Standard Roles

The migration creates the following standard roles for each company:

| Name | Display Name | Description |
|------|--------------|-------------|
| `admin` | Admin | Company administrator with full access |
| `office_manager` | Office Manager | Office manager with administrative access |
| `project_manager` | Project Manager | Project manager with project oversight |
| `client` | Client | Client with view-only access |
| `crew` | Crew | Crew member with task access |
| `subcontractor` | Subcontractor | Subcontractor with assigned project access |

## Role Name Mapping

The migration handles legacy role names:

- `manager` → `project_manager`
- `contractor` → `subcontractor`
- `office manager` → `office_manager`
- `project manager` → `project_manager`

## Backward Compatibility

The migration maintains backward compatibility:

1. **Text `role` field preserved**: The existing `role` text field in `users` table is kept for backward compatibility
2. **Dual role storage**: Both `role` (text) and `role_id` (integer) are maintained
3. **Fallback logic**: Code falls back to text role if `role_id` is not available

## Testing

After running the migration, verify:

1. ✅ Roles table exists and has data
2. ✅ Users have `role_id` populated
3. ✅ RBAC Admin module loads roles correctly
4. ✅ User role assignments work
5. ✅ All existing functionality continues to work

## Troubleshooting

### Issue: "Table 'roles' does not exist"

**Solution**: Run the migration script first.

### Issue: Users don't have role_id populated

**Solution**: The migration should handle this automatically. Check:
- Are users' `role` text fields populated?
- Are there corresponding roles in the `roles` table?
- Check migration logs for errors

### Issue: Role assignment fails

**Solution**: Ensure:
- The role exists in the `roles` table for the user's company
- The role is marked as `is_active = TRUE`
- The company_id matches

## Next Steps

After successful migration:

1. Test the RBAC Admin module in the frontend
2. Verify user role assignments work correctly
3. Test role-based access control throughout the application
4. Consider removing the text `role` field in a future migration (after full transition)

## Support

If you encounter issues:

1. Check the migration logs for error messages
2. Verify database connection and permissions
3. Ensure all dependencies are installed
4. Check that the companies table has data

