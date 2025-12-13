# Roles Endpoint Fix Summary

## Problem
Roles were not available when creating or editing users in the RBAC module. The endpoint `/api/v1/rbac/roles` was returning an empty array.

## Root Cause
The `get_roles()` method in `RoleRepository` was using SQL queries that assumed the roles table had `company_id` and `is_active` columns, but the simple roles table created by `fix_roles_table.py` only has:
- `id`
- `role_name`
- `display_name`

The query was failing because:
1. It tried to filter by `r.is_active = TRUE` (column doesn't exist)
2. It tried to join with companies using `r.company_id` (column doesn't exist)

## Fixes Applied

### 1. Fixed `get_roles()` method - Dynamic Query Building
**File**: `python_backend/src/database/auth_repositories.py` (lines 504-545)
- **Before**: Hardcoded query assuming `company_id` and `is_active` columns exist
- **After**: Dynamically detects which columns exist and builds appropriate query
- Handles three scenarios:
  - Complex roles table (with `company_id` and `is_active`)
  - Roles table with `company_id` but no `is_active`
  - Simple roles table (only `id`, `role_name`, `display_name`)

### 2. Fixed `_sync_roles_from_users()` method
**File**: `python_backend/src/database/auth_repositories.py` (lines 385-525)
- **Before**: Tried to insert roles with `company_id`, `name`, `is_active` columns
- **After**: Dynamically detects table structure and inserts accordingly
- Creates standard roles if roles table is empty
- Handles both simple and complex roles table structures

### 3. Fixed role lookup queries
**File**: `python_backend/src/database/auth_repositories.py` (lines 155, 164, 204)
- **Before**: `WHERE LOWER(name) = LOWER($1)`
- **After**: `WHERE LOWER(role_name) = LOWER($1) OR LOWER(name) = LOWER($1)`
- Supports both `role_name` (simple table) and `name` (complex table) columns

## Endpoints Affected

1. **`/api/v1/rbac/roles`** - Used by RBACAdmin frontend component
   - Now returns roles correctly regardless of table structure
   - Automatically syncs roles from users table if roles table is empty

2. **Role creation/editing** - When creating or updating users
   - Role lookups now work with both table structures

## Testing

To verify the fix:

1. **Restart the Python backend** to apply the changes
2. **Login as an admin user**
3. **Navigate to RBAC Admin page**
4. **Try to create/edit a user**
5. **Check that roles dropdown is populated**

### Expected Behavior
- Roles dropdown should show available roles
- Standard roles should be available: Admin, Office Manager, Project Manager, Client, Crew, Subcontractor
- Roles should be selectable when creating/editing users

### If Issues Persist

1. Check backend logs for SQL errors
2. Verify roles table exists and has data:
   ```sql
   SELECT * FROM roles;
   ```
3. If roles table is empty, the sync should automatically create standard roles
4. Verify the roles table structure matches one of:
   - Simple: `id`, `role_name`, `display_name`
   - Complex: `id`, `company_id`, `name`, `display_name`, `is_active`, etc.

## Related Files Modified

- `python_backend/src/database/auth_repositories.py`:
  - Fixed `get_roles()` method (dynamic query building)
  - Fixed `_sync_roles_from_users()` method (dynamic insert)
  - Fixed role lookup queries (support both column names)

## Notes

- The fix is backward compatible with both simple and complex roles table structures
- If roles table is empty, standard roles are automatically created
- The query dynamically adapts to the actual table structure at runtime

