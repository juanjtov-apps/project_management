# Frontend RBAC Admin Page Integration Test Guide

## Overview

This guide explains how to test the frontend RBAC admin page integration after the migration to FastAPI.

## Prerequisites

1. **FastAPI Backend Running**: Port 8000
   ```bash
   cd python_backend
   python3 main.py
   ```

2. **Node.js Frontend Running**: Port 5000
   ```bash
   npm run dev
   ```

3. **Test User**: An admin user must exist in the database
   - Email: `admin@proesphere.com` (or update in test script)
   - Password: Must be set correctly
   - Role: Must have admin privileges

## Running the Test

### Automated Test Script

```bash
# Run the comprehensive integration test
python3 test_frontend_rbac_integration.py
```

This script tests:
- ✅ All RBAC endpoints used by the frontend
- ✅ Node.js proxy forwarding
- ✅ Response structures match frontend expectations
- ✅ CRUD operations (Create, Read, Update, Delete)

### Manual Testing in Browser

1. **Start both servers** (see Prerequisites)

2. **Login to the application**
   - Navigate to: http://localhost:5000
   - Login with admin credentials

3. **Access RBAC Admin Page**
   - Navigate to: http://localhost:5000/rbac-admin
   - Or click on "RBAC Admin" in the sidebar (if you have admin access)

4. **Test Each Tab**

   **Users Tab:**
   - ✅ View users list
   - ✅ Create new user
   - ✅ Edit existing user
   - ✅ Delete user
   - ✅ Filter by company (if company admin)

   **Roles Tab:**
   - ✅ View roles list
   - ✅ Create new role
   - ✅ Edit existing role
   - ✅ Delete role
   - ✅ View role permissions

   **Companies Tab:**
   - ✅ View companies list (root admin only)
   - ✅ Create new company (root admin only)
   - ✅ Edit company
   - ✅ Delete company (root admin only)
   - ✅ View company users

5. **Check Browser Console**
   - Open Developer Tools (F12)
   - Check Console tab for errors
   - Look for:
     - ✅ Successful API calls
     - ❌ Any 404, 500, or connection errors
     - ⚠️ Warnings about missing data

6. **Check Network Tab**
   - Open Developer Tools → Network tab
   - Filter by "rbac" or "companies"
   - Verify:
     - ✅ Requests go to `/api/rbac/*` or `/api/companies`
     - ✅ Responses have status 200 (or appropriate status)
     - ✅ Response data structure matches frontend expectations

## Expected Endpoints

The frontend RBAC admin page uses these endpoints:

### GET Endpoints
- `/api/rbac/permissions` → `/api/v1/rbac/permissions`
- `/api/rbac/roles` → `/api/v1/rbac/roles`
- `/api/rbac/users` → `/api/v1/rbac/users`
- `/api/rbac/companies` → `/api/v1/rbac/companies`
- `/api/companies` → `/api/v1/companies`
- `/api/rbac/companies/{id}/users` → `/api/v1/rbac/companies/{id}/users`

### POST Endpoints
- `/api/rbac/users` → `/api/v1/rbac/users` (create user)
- `/api/rbac/roles` → `/api/v1/rbac/roles` (create role)
- `/api/companies` → `/api/v1/companies` (create company)

### PATCH Endpoints
- `/api/rbac/users/{id}` → `/api/v1/rbac/users/{id}` (update user)
- `/api/rbac/roles/{id}` → `/api/v1/rbac/roles/{id}` (update role)
- `/api/rbac/companies/{id}` → `/api/v1/rbac/companies/{id}` (update company)
- `/api/companies/{id}` → `/api/v1/companies/{id}` (update company - legacy)

### DELETE Endpoints
- `/api/rbac/users/{id}` → `/api/v1/rbac/users/{id}` (delete user)
- `/api/rbac/roles/{id}` → `/api/v1/rbac/roles/{id}` (delete role)
- `/api/companies/{id}` → `/api/v1/companies/{id}` (delete company)

## Troubleshooting

### Issue: "Access Denied" on RBAC Admin Page

**Cause**: User doesn't have admin privileges

**Solution**:
1. Check user role in database
2. User must have `role = 'admin'` or be root admin
3. Root admin: email contains 'chacjjlegacy' or is 'admin@proesphere.com'

### Issue: "No roles found" or Empty Lists

**Cause**: 
- Backend not running
- Authentication failed
- No data in database

**Solution**:
1. Check FastAPI backend is running: `curl http://localhost:8000/health`
2. Check authentication: Verify session cookie
3. Check database has data
4. Check browser console for errors

### Issue: 404 Errors on API Calls

**Cause**: Endpoint not found or routing issue

**Solution**:
1. Verify Node.js is forwarding to FastAPI
2. Check FastAPI has the endpoint: `curl http://localhost:8000/api/v1/rbac/roles`
3. Verify endpoint path matches exactly
4. Check server logs for routing errors

### Issue: 500 Errors on API Calls

**Cause**: Backend error (database, validation, etc.)

**Solution**:
1. Check FastAPI logs for error details
2. Verify database connection
3. Check request payload matches expected schema
4. Verify user has permissions for the operation

### Issue: CORS Errors

**Cause**: CORS configuration issue

**Solution**:
1. Verify CORS is configured in FastAPI
2. Check Node.js proxy is forwarding headers correctly
3. Verify credentials are included in requests

## Verification Checklist

- [ ] FastAPI backend running on port 8000
- [ ] Node.js frontend running on port 5000
- [ ] Can login with admin user
- [ ] RBAC Admin page loads without errors
- [ ] Users tab shows user list
- [ ] Roles tab shows roles list
- [ ] Companies tab shows companies list (if root admin)
- [ ] Can create new user
- [ ] Can edit existing user
- [ ] Can delete user
- [ ] Can create new role
- [ ] Can edit existing role
- [ ] Can delete role
- [ ] Can create company (root admin only)
- [ ] Can edit company
- [ ] Can delete company (root admin only)
- [ ] No console errors
- [ ] All API calls return 200/201 status
- [ ] Response data structure is correct

## Test Results

After running tests, document:
- ✅ Which operations work correctly
- ❌ Which operations fail
- ⚠️ Any warnings or issues
- 📝 Response times
- 🔍 Any unexpected behavior

## Next Steps

If all tests pass:
- ✅ Frontend RBAC integration is working correctly
- ✅ Migration to FastAPI is successful
- ✅ Ready for production use

If tests fail:
- Review error messages
- Check server logs
- Verify database state
- Test endpoints directly with curl/Postman
- Review migration documentation

