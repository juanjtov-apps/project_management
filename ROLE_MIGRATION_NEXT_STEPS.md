# Role Migration - Next Steps Checklist

## ✅ Completed
- [x] Migration script created and tested
- [x] Application code updated to use `role_id`
- [x] Test script created and passing
- [x] All users have valid `role_id` values

## 📋 Next Steps

### Step 1: Manual Application Testing

Test the following operations in your application:

#### User Management
- [ ] **Create a new user**
  - Test: Create user via API/UI
  - Verify: User is created with correct `role_id`
  - Check: Role displays correctly in user list

- [ ] **Update user role**
  - Test: Change a user's role
  - Verify: `role_id` is updated correctly
  - Check: Role change is reflected immediately

- [ ] **List users**
  - Test: View all users
  - Verify: All users show correct roles
  - Check: Role filtering works (if implemented)

- [ ] **User login**
  - Test: Login with different role types
  - Verify: Permissions are correct based on role
  - Check: Navigation permissions match role

#### Role Operations
- [ ] **Assign role to user**
  - Test: Use role assignment endpoint
  - Verify: Role is assigned via `role_id`
  - Check: Invalid roles are rejected

- [ ] **Role-based access control**
  - Test: Access endpoints with different roles
  - Verify: Access is granted/denied correctly
  - Check: Admin-only endpoints work

#### Data Integrity
- [ ] **Verify all users have roles**
  ```sql
  SELECT COUNT(*) FROM users WHERE role_id IS NULL;
  ```
  - Should return 0 or handle NULL gracefully

- [ ] **Check for orphaned role_ids**
  ```sql
  SELECT COUNT(*) FROM users 
  WHERE role_id IS NOT NULL 
  AND role_id NOT IN (SELECT id FROM roles);
  ```
  - Should return 0

### Step 2: Production Readiness Check

Before dropping the text role column:

- [ ] **Application logs review**
  - Check for any role-related errors
  - Verify no queries are using text `role` column
  - Ensure all endpoints work correctly

- [ ] **Database backup**
  - Create a full database backup
  - Store backup in safe location
  - Verify backup is restorable

- [ ] **Staging environment test**
  - Run migration on staging
  - Test all critical user flows
  - Verify no regressions

### Step 3: Drop Old Text Role Column

**ONLY after all manual tests pass and you're confident everything works:**

```bash
cd python_backend
export DATABASE_URL="your_database_url"
python -m src.database.migrations.drop_text_role_column
```

This migration will:
- Verify all users have `role_id` set
- Validate all `role_id` values
- Drop the `users.role` text column
- Confirm removal

**⚠️ WARNING:** This is irreversible! Make sure you have a backup.

### Step 4: Post-Migration Verification

After dropping the text column:

- [ ] **Verify column is removed**
  ```sql
  SELECT column_name 
  FROM information_schema.columns 
  WHERE table_name = 'users' AND column_name = 'role';
  ```
  - Should return no rows

- [ ] **Test application again**
  - Run through critical user flows
  - Verify everything still works
  - Check application logs for errors

- [ ] **Monitor for issues**
  - Watch application logs for 24-48 hours
  - Check for any role-related errors
  - Verify user operations continue to work

## 🔍 Verification Queries

Run these to verify everything is working:

```sql
-- Check all users have role_id
SELECT 
    COUNT(*) as total_users,
    COUNT(role_id) as users_with_role_id,
    COUNT(*) - COUNT(role_id) as users_without_role_id
FROM users;

-- Sample users with roles
SELECT 
    u.id, 
    u.email, 
    u.role_id,
    COALESCE(r.name, r.role_name) as role_name
FROM users u
LEFT JOIN roles r ON u.role_id = r.id
LIMIT 10;

-- Check foreign key constraint
SELECT constraint_name, constraint_type
FROM information_schema.table_constraints
WHERE table_name = 'users' 
AND constraint_name = 'users_role_id_fkey';
```

## 📝 Testing Checklist

### API Endpoints to Test

1. **Authentication**
   - [ ] POST `/auth/login` - Login with different roles
   - [ ] GET `/auth/user` - Get current user with role

2. **User Management**
   - [ ] GET `/api/users` - List all users
   - [ ] GET `/api/users/{id}` - Get user by ID
   - [ ] POST `/api/users` - Create new user
   - [ ] PUT `/api/users/{id}` - Update user
   - [ ] PUT `/api/users/{id}/role` - Assign role

3. **Company Admin**
   - [ ] POST `/api/company-admin/users/invite` - Invite user
   - [ ] PUT `/api/company-admin/users/{id}/role` - Assign role

4. **Admin**
   - [ ] GET `/api/admin/users` - List users with role filter

### Frontend Testing

- [ ] User list displays correct roles
- [ ] Role assignment works
- [ ] Role-based UI elements show/hide correctly
- [ ] Permissions are enforced correctly

## 🐛 Troubleshooting

If you encounter issues:

1. **Users without role_id**
   ```sql
   -- Find users without role_id
   SELECT id, email FROM users WHERE role_id IS NULL;
   
   -- Assign default role
   UPDATE users 
   SET role_id = (SELECT id FROM roles WHERE name = 'crew' LIMIT 1)
   WHERE role_id IS NULL;
   ```

2. **Invalid role_id values**
   ```sql
   -- Find invalid role_ids
   SELECT u.id, u.email, u.role_id
   FROM users u
   WHERE u.role_id IS NOT NULL 
   AND u.role_id NOT IN (SELECT id FROM roles);
   
   -- Set to NULL
   UPDATE users 
   SET role_id = NULL 
   WHERE role_id NOT IN (SELECT id FROM roles);
   ```

3. **Application errors**
   - Check application logs
   - Verify roles table has all required roles
   - Ensure all code uses `role_id` not text `role`

## ✅ Success Criteria

You're ready to drop the text role column when:

- ✅ All manual tests pass
- ✅ No errors in application logs
- ✅ All users have valid `role_id` values
- ✅ Role-based access control works correctly
- ✅ Database backup created
- ✅ Staging environment tested (if applicable)

## 📞 Support

If you encounter any issues:
1. Check the troubleshooting section above
2. Review application logs
3. Run the test script again: `python test_role_migration.py`
4. Verify database state with the verification queries

