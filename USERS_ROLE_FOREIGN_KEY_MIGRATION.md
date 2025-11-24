# Users Role Foreign Key Migration

## Summary

This migration fixes the users table to properly use a foreign key relationship with the roles table, replacing the text-based role storage with integer role IDs.

## The Bug

A previous migration incorrectly added a `users.role_id` column alongside the existing `users.role` text column, creating confusion and inconsistency. The application code was using both columns inconsistently, and the `role_id` column was not properly set up as a foreign key.

## What Changed

### Database Schema

1. **Fixed `users.role_id` column:**
   - Ensured the column exists and is of type INTEGER
   - Added proper foreign key constraint: `users.role_id REFERENCES roles(id) ON DELETE SET NULL`
   - Created index on `role_id` for performance

2. **Migrated existing data:**
   - All text role values in `users.role` were mapped to corresponding `role_id` values by joining with `roles.name`
   - Handled legacy role name variations (e.g., "manager" → "project_manager")
   - Invalid or unmapped roles were set to NULL

3. **Text role column:**
   - The old `users.role` text column is preserved for backward compatibility
   - It can be dropped in a future migration once all code is verified to use `role_id`

### Application Code Changes

1. **AuthRepository (`python_backend/src/database/auth_repositories.py`):**
   - Updated `get_user()`, `get_users()`, and `get_company_users()` to join with `roles` table
   - Removed text role column from SELECT queries (now uses `role_id` and joins for role name)
   - Updated `create_rbac_user()` to accept and use `role_id` (with fallback to role name lookup)
   - Updated `update_user()` to use `role_id` instead of text role

2. **Company Admin API (`python_backend/src/api/company_admin.py`):**
   - Updated `assign_user_role()` to set `role_id` foreign key instead of text role
   - Improved role lookup to handle company-specific and global roles
   - Returns role name from joined `roles` table

3. **Auth API (`python_backend/src/api/auth.py`):**
   - Updated login and user endpoints to join with `roles` table
   - Uses `role_name` from roles table for permission checks
   - Maintains backward compatibility by setting `role` field from `role_name`

## Final Schema

### Users Table
```sql
users (
    id VARCHAR PRIMARY KEY,
    ...
    role_id INTEGER REFERENCES roles(id) ON DELETE SET NULL,  -- Primary role field
    role TEXT,  -- Legacy field (can be dropped later)
    ...
)
CREATE INDEX idx_users_role_id ON users(role_id);
```

### Roles Table (unchanged)
```sql
roles (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL UNIQUE,  -- e.g., "admin", "manager", "member"
    ...
)
```

## Running the Migration

### Prerequisites
1. Ensure the `roles` table exists and is populated
2. Backup your database
3. Ensure `DATABASE_URL` environment variable is set

### Steps

1. **Navigate to python_backend directory:**
   ```bash
   cd python_backend
   ```

2. **Activate virtual environment:**
   ```bash
   source venv/bin/activate  # or your venv activation method
   ```

3. **Set DATABASE_URL:**
   ```bash
   export DATABASE_URL="your_database_url_here"
   ```

4. **Run the migration:**
   ```bash
   python -m src.database.migrations.fix_users_role_foreign_key
   ```

5. **Verify the migration:**
   - Check that all users have valid `role_id` values
   - Verify foreign key constraint is in place
   - Test user creation and role assignment

### Rollback (if needed)

If you need to rollback:
```bash
python -c "from src.database.migrations.fix_users_role_foreign_key import rollback_migration; import asyncio; from src.database.connection import get_db_pool; asyncio.run(rollback_migration(get_db_pool()))"
```

**Note:** Rollback only removes the foreign key constraint, it does not drop the `role_id` column or revert data changes.

## Production Deployment

### Pre-deployment Checklist

1. ✅ Backup production database
2. ✅ Test migration on staging environment
3. ✅ Verify all users have valid `role_id` values
4. ✅ Test user creation with `role_id`
5. ✅ Test role assignment functionality
6. ✅ Verify authentication and authorization still work

### Deployment Steps

1. **Deploy code changes first** (so new code is ready to use `role_id`)
2. **Run migration during maintenance window:**
   ```bash
   python -m src.database.migrations.fix_users_role_foreign_key
   ```
3. **Verify migration success:**
   - Check migration output for errors
   - Query database to verify `role_id` values are set
   - Test critical user operations
4. **Monitor application logs** for any role-related errors

### Post-deployment

1. Monitor for any role-related errors
2. Verify user role assignments are working correctly
3. Once stable, consider dropping the old `role` text column in a future migration

## Validation Queries

After migration, run these queries to verify:

```sql
-- Check all users have role_id
SELECT COUNT(*) as total_users,
       COUNT(role_id) as users_with_role_id,
       COUNT(*) - COUNT(role_id) as users_without_role_id
FROM users;

-- Check for invalid role_id values
SELECT u.id, u.role_id, u.role
FROM users u
WHERE u.role_id IS NOT NULL 
AND u.role_id NOT IN (SELECT id FROM roles);

-- Verify foreign key constraint exists
SELECT constraint_name, constraint_type
FROM information_schema.table_constraints
WHERE table_name = 'users' 
AND constraint_name = 'users_role_id_fkey';
```

## Testing

### Test Cases

1. **User Creation:**
   - Create user with `role_id`
   - Create user with role name (should lookup `role_id`)
   - Verify role is correctly assigned

2. **Role Assignment:**
   - Assign role to existing user
   - Verify `role_id` is updated
   - Verify role name is correct in response

3. **User Retrieval:**
   - Get user by ID
   - Verify `roleId` and `role` fields are populated
   - Verify role name comes from `roles` table

4. **Authentication:**
   - Login with user
   - Verify permissions are based on role from `roles` table
   - Verify session contains correct role information

## Troubleshooting

### Issue: Users without role_id after migration

**Solution:** Manually assign roles:
```sql
UPDATE users 
SET role_id = (SELECT id FROM roles WHERE name = 'crew' LIMIT 1)
WHERE role_id IS NULL;
```

### Issue: Foreign key constraint violation

**Solution:** Check for invalid role_id values:
```sql
SELECT u.id, u.role_id 
FROM users u
WHERE u.role_id IS NOT NULL 
AND u.role_id NOT IN (SELECT id FROM roles);
```

Set invalid values to NULL or assign valid role_id.

### Issue: Application errors after migration

**Solution:** 
1. Check application logs for specific errors
2. Verify `roles` table has all required roles
3. Ensure application code is using `role_id` correctly
4. Check that role lookups are working (role name → role_id)

## Step 3: Drop Old Text Role Column

Once you've verified everything works correctly, you can drop the old text `role` column.

### Prerequisites
1. ✅ All application code has been updated to use `role_id`
2. ✅ All tests pass
3. ✅ All users have valid `role_id` values
4. ✅ Database backup created

### Run the Drop Migration

```bash
cd python_backend
python -m src.database.migrations.drop_text_role_column
```

This migration will:
- Verify all users have `role_id` set
- Verify all `role_id` values are valid
- Drop the `users.role` text column
- Confirm the column has been removed

**WARNING:** This is irreversible. Make sure you have a backup!

## Future Improvements

1. **Add NOT NULL constraint:** Consider making `role_id` NOT NULL after ensuring all users have roles
2. **Role validation:** Add application-level validation to ensure only valid role_ids are assigned
3. **Role creation API:** Ensure role creation endpoints properly populate the roles table

