# RBAC Users Fix Summary

## Problem
Users were not showing in the RBAC module. The endpoint `/api/rbac/users` was likely returning 500 errors or empty results.

## Root Cause
The SQL queries in `auth_repositories.py` were using `r.name as role_name`, but the roles table actually has a `role_name` column (not `name`), as created by the migration `fix_roles_table.py`. This caused SQL errors when trying to fetch users.

## Fixes Applied

### 1. Fixed `auth_repositories.py` - `get_user()` method
**File**: `python_backend/src/database/auth_repositories.py` (line 44)
- **Before**: `r.name as role_name`
- **After**: `r.role_name`

### 2. Fixed `auth_repositories.py` - `get_users()` method
**File**: `python_backend/src/database/auth_repositories.py` (line 73)
- **Before**: `r.name as role_name, r.display_name as role_display_name`
- **After**: `r.role_name, r.display_name as role_display_name`

### 3. Fixed `auth_repositories.py` - `get_company_users()` method
**File**: `python_backend/src/database/auth_repositories.py` (line 108)
- **Before**: `r.name as role_name, r.display_name as role_display_name`
- **After**: `r.role_name, r.display_name as role_display_name`

### 4. Fixed `auth_repositories.py` - `get_roles()` method
**File**: `python_backend/src/database/auth_repositories.py` (line 509)
- **Before**: `ORDER BY r.name`
- **After**: `ORDER BY r.role_name`

## Endpoints Affected

1. **`/api/rbac/users`** - Used by RBACAdmin frontend component
   - Calls `auth_repo.get_users()` for root admins
   - Calls `auth_repo.get_company_users()` for company admins
   - Both methods now use correct `role_name` column

2. **`/api/v1/rbac/users`** - V1 API endpoint
   - Also uses `auth_repo.get_users()` and `auth_repo.get_company_users()`
   - Now works correctly

## Testing

To verify the fix:

1. **Restart the Python backend** to apply the changes
2. **Login as an admin user**
3. **Navigate to RBAC Admin page**
4. **Check that users are displayed**

### Expected Behavior
- Root admins should see all users from all companies
- Company admins should see only users from their company
- Each user should display:
  - Name, email
  - Role name (from roles table)
  - Company name
  - Active status

### If Issues Persist

1. Check backend logs for SQL errors
2. Verify database connection
3. Verify roles table has `role_name` column:
   ```sql
   SELECT column_name FROM information_schema.columns 
   WHERE table_name = 'roles';
   ```
4. Verify users have valid `role_id` values:
   ```sql
   SELECT COUNT(*) FROM users WHERE role_id IS NOT NULL;
   ```

## Related Files Modified

- `python_backend/src/database/auth_repositories.py` - Fixed 4 SQL queries
- All fixes use `r.role_name` instead of `r.name`

## Notes

- The roles table structure was changed by migration `fix_roles_table.py` to use `role_name` instead of `name`
- All queries now consistently use `role_name` column
- The fix maintains backward compatibility with the frontend's expected response format

