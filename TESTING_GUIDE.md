# Comprehensive Testing Guide for Migration

This guide provides a systematic approach to testing the application after migrating from Node.js to Python FastAPI.

## Prerequisites

1. **Start the backend:**
   ```bash
   cd python_backend
   python3 main.py
   ```
   The backend should start on `http://127.0.0.1:8000`

2. **Start the frontend (optional for API testing):**
   ```bash
   npm run dev
   ```
   The frontend should start on `http://127.0.0.1:5000`

## Testing Strategy

### 1. Automated API Testing

Run the comprehensive test suite:

```bash
python test_migration_comprehensive.py
```

This script tests:
- ✅ Backend health and connectivity
- ✅ API versioning (`/api/v1/*` endpoints)
- ✅ Authentication endpoints
- ✅ All CRUD operations
- ✅ Object storage endpoints
- ✅ Company-scoped access control
- ✅ Error handling

**Expected Results:**
- All endpoints should return 200 (authenticated) or 401 (unauthenticated)
- No 404 errors (endpoints not found)
- No 500 errors (server errors)

### 2. Manual Frontend Testing

#### 2.1 Authentication Flow

1. **Login Test:**
   - Navigate to `http://localhost:5000/login`
   - Enter valid credentials
   - Verify redirect to dashboard
   - Check browser console for errors

2. **Session Persistence:**
   - Login successfully
   - Refresh the page
   - Verify you remain logged in
   - Check that user data loads correctly

3. **Logout Test:**
   - Click logout
   - Verify redirect to login page
   - Verify session is cleared

#### 2.2 Core Features Testing

**Projects:**
- [ ] View projects list (`/projects`)
- [ ] Create new project
- [ ] Edit existing project
- [ ] Delete project
- [ ] Filter/search projects
- [ ] View project details

**Tasks:**
- [ ] View tasks list (`/tasks`)
- [ ] Create new task
- [ ] Edit task (status, assignee, due date)
- [ ] Delete task
- [ ] Filter tasks by status, priority, assignee
- [ ] View task details

**Photos:**
- [ ] View photos gallery (`/photos`)
- [ ] Upload new photo
- [ ] View photo details
- [ ] Delete photo
- [ ] Filter photos by project/tag

**Project Logs:**
- [ ] View logs list (`/logs`)
- [ ] Create new log entry
- [ ] Edit log entry
- [ ] Delete log entry
- [ ] Upload images to log

**Dashboard:**
- [ ] View dashboard (`/dashboard`)
- [ ] Verify statistics load correctly
- [ ] Check recent activities
- [ ] Verify project health metrics

**RBAC (if you have admin access):**
- [ ] View companies list
- [ ] Create/edit company
- [ ] View users list
- [ ] Create/edit user
- [ ] Assign roles and permissions
- [ ] Verify company-scoped access

#### 2.3 Object Storage Testing

**Upload Flow:**
1. Navigate to Photos or Logs page
2. Click "Upload" button
3. Select an image file
4. Verify upload completes successfully
5. Check that image appears in the gallery

**Download Flow:**
1. Navigate to a page with downloadable files
2. Click download button
3. Verify file downloads correctly

### 3. Browser Console Testing

Open browser DevTools (F12) and check:

1. **Network Tab:**
   - All API requests should go to `/api/v1/*`
   - No 404 errors for API endpoints
   - No CORS errors
   - Response times are reasonable (< 1s for most requests)

2. **Console Tab:**
   - No JavaScript errors
   - No failed API calls (red errors)
   - Check for any warnings about deprecated endpoints

3. **Application Tab:**
   - Verify cookies are set correctly
   - Check session storage if used

### 4. API Endpoint Verification

Test each endpoint category manually using curl or Postman:

```bash
# Health check
curl http://127.0.0.1:8000/health

# Get current user (should return 401 if not authenticated)
curl -v http://127.0.0.1:8000/api/v1/auth/user

# Login (replace with actual credentials)
curl -X POST http://127.0.0.1:8000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"your@email.com","password":"yourpassword"}' \
  -c cookies.txt

# Get projects (with session cookie)
curl http://127.0.0.1:8000/api/v1/projects -b cookies.txt

# Test object storage upload URL
curl -X POST http://127.0.0.1:8000/api/v1/objects/upload \
  -b cookies.txt \
  -H "Content-Type: application/json"
```

### 5. Error Handling Testing

Test error scenarios:

1. **Unauthenticated Access:**
   - Try accessing protected endpoints without login
   - Should return 401 Unauthorized

2. **Invalid Data:**
   - Try creating project/task with invalid data
   - Should return 400 Bad Request with validation errors

3. **Not Found:**
   - Try accessing non-existent resource
   - Should return 404 Not Found

4. **Permission Denied:**
   - Try accessing another company's data
   - Should return 403 Forbidden

### 6. Performance Testing

1. **Load Time:**
   - Measure time to first API response
   - Check dashboard load time
   - Verify large lists (100+ items) load efficiently

2. **Concurrent Requests:**
   - Open multiple tabs
   - Verify no race conditions
   - Check session handling

### 7. Migration-Specific Tests

#### 7.1 API Versioning
- Verify all endpoints are accessible at `/api/v1/*`
- Test that old `/api/*` endpoints are rewritten to `/api/v1/*`
- Check OpenAPI docs at `http://127.0.0.1:8000/docs`

#### 7.2 Node.js Proxy
- Verify Node.js server forwards requests correctly
- Check that frontend is served correctly
- Verify no API routes are handled by Node.js

#### 7.3 Request Validation
- Test that Pydantic validation works
- Try sending invalid data types
- Verify error messages are clear

## Common Issues and Solutions

### Issue: 404 on API endpoints
**Solution:** Check that:
- Python backend is running on port 8000
- Routes are registered in `main.py`
- API versioning is correct (`/api/v1/*`)

### Issue: 401 Unauthorized
**Solution:** 
- Verify you're logged in
- Check session cookies are being sent
- Verify authentication middleware is working

### Issue: CORS errors
**Solution:**
- Check that Node.js proxy is forwarding requests
- Verify CORS middleware in FastAPI
- Check browser console for specific CORS errors

### Issue: Frontend not loading
**Solution:**
- Verify Node.js server is running on port 5000
- Check that frontend build exists
- Verify static file serving is configured

### Issue: Object storage not working
**Solution:**
- Check environment variables (DEFAULT_OBJECT_STORAGE_BUCKET_ID, PRIVATE_OBJECT_DIR)
- Verify Replit sidecar is accessible
- Check object storage endpoints are registered

## Test Checklist

Use this checklist to ensure comprehensive testing:

- [ ] Backend starts without errors
- [ ] Frontend starts without errors
- [ ] Health endpoint responds
- [ ] Login works
- [ ] Logout works
- [ ] Session persists across page refreshes
- [ ] All major pages load (Dashboard, Projects, Tasks, Photos, Logs)
- [ ] CRUD operations work for all entities
- [ ] File uploads work
- [ ] File downloads work
- [ ] Filters and search work
- [ ] Company-scoped access control works
- [ ] RBAC permissions work
- [ ] No console errors
- [ ] No 404 errors in network tab
- [ ] API responses are fast (< 1s)
- [ ] Mobile/responsive design works
- [ ] Browser back/forward buttons work

## Reporting Issues

When reporting issues, include:

1. **Error Message:** Full error text
2. **Endpoint:** The API endpoint that failed
3. **Request Details:** Method, URL, headers, body
4. **Response:** Status code and response body
5. **Steps to Reproduce:** Detailed steps
6. **Expected Behavior:** What should happen
7. **Actual Behavior:** What actually happened
8. **Browser/Environment:** Browser version, OS, etc.

## Next Steps

After completing all tests:

1. **Fix any failing tests**
2. **Document any known issues**
3. **Update API documentation** (`/docs` endpoint)
4. **Deploy to staging environment**
5. **Run tests in staging**
6. **Deploy to production**

## Additional Resources

- FastAPI Documentation: https://fastapi.tiangolo.com/
- API Documentation: http://127.0.0.1:8000/docs
- Replit Docs: https://docs.replit.com/

