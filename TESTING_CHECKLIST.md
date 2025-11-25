# Proesphere Multi-Tenant Testing Checklist

## Overview
This checklist ensures proper multi-tenant isolation, root user functionality, and organization context switching.

## Prerequisites
- [ ] Database migration completed (`add_is_root_field.py`)
- [ ] `ROOT_USER_EMAILS` environment variable configured
- [ ] At least 2 companies/organizations in database
- [ ] Users in different companies for testing

## 1. Root User Configuration

### 1.1 Root User Detection
- [ ] Root user can log in successfully
- [ ] Root user has `isRootAdmin: true` in user data
- [ ] Root user has `isRoot: true` in database
- [ ] Non-root users have `isRootAdmin: false`
- [ ] Root user detection works via `is_root` field
- [ ] Root user detection works via `id == "0"` (backward compatibility)
- [ ] Root user detection works via `ROOT_USER_EMAILS` env var

### 1.2 Root User Permissions
- [ ] Root user can access all modules
- [ ] Root user can see all companies in admin panel
- [ ] Root user can see all users across companies
- [ ] Root user can see all projects across companies

## 2. Organization Context Switching (Root Users Only)

### 2.1 Context Switching API
- [ ] `POST /api/v1/auth/set-organization-context` endpoint exists
- [ ] Only root users can call this endpoint (403 for non-root)
- [ ] Setting organization context validates organization exists
- [ ] Setting `null` clears context (shows all organizations)
- [ ] Context persists in session storage
- [ ] Context persists across page refreshes

### 2.2 Context Switching UI
- [ ] Organization selector appears in header for root users
- [ ] Organization selector hidden for non-root users
- [ ] Selector shows "All Organizations" when no context set
- [ ] Selector shows current organization name when context set
- [ ] Switching context updates UI immediately
- [ ] Switching context refreshes all data queries

### 2.3 Context Filtering
- [ ] Root user without context sees all projects
- [ ] Root user with context sees only selected organization's projects
- [ ] Root user with context sees only selected organization's tasks
- [ ] Root user with context sees only selected organization's users
- [ ] Root user with context sees only selected organization's photos
- [ ] Root user with context sees only selected organization's logs
- [ ] Clearing context (selecting "All") shows all data again

## 3. Company Admin Restrictions

### 3.1 User Management
- [ ] Company admin can see only their company's users
- [ ] Company admin can create users only in their company
- [ ] Company admin cannot create users in other companies
- [ ] Company admin can update only their company's users
- [ ] Company admin cannot update users from other companies
- [ ] Company admin can delete only their company's users
- [ ] Company admin cannot delete users from other companies
- [ ] Company admin cannot modify root admin users

### 3.2 Role Management
- [ ] Company admin can see only their company's roles
- [ ] Company admin can create roles only for their company
- [ ] Company admin cannot access other companies' roles

### 3.3 Project Management
- [ ] Company admin can see only their company's projects
- [ ] Company admin can create projects only in their company
- [ ] Company admin cannot access other companies' projects

## 4. Regular User Restrictions

### 4.1 Data Access
- [ ] Regular user sees only their company's projects
- [ ] Regular user sees only their company's tasks
- [ ] Regular user sees only their company's photos
- [ ] Regular user sees only their company's logs
- [ ] Regular user sees only their company's users
- [ ] Regular user cannot access other companies' data

### 4.2 Data Modification
- [ ] Regular user can create data only in their company
- [ ] Regular user cannot modify other companies' data
- [ ] Regular user cannot delete other companies' data

## 5. Multi-Tenant Data Isolation

### 5.1 Projects
- [ ] Projects are filtered by `company_id`
- [ ] Root user sees all projects (or filtered by context)
- [ ] Company users see only their company's projects
- [ ] Cannot access project from another company (403 error)

### 5.2 Tasks
- [ ] Tasks are filtered by `company_id` (via project)
- [ ] Root user sees all tasks (or filtered by context)
- [ ] Company users see only their company's tasks
- [ ] Cannot access task from another company (403 error)

### 5.3 Photos
- [ ] Photos are filtered by `project.company_id`
- [ ] Root user sees all photos (or filtered by context)
- [ ] Company users see only their company's photos
- [ ] Cannot access photo from another company (403 error)

### 5.4 Logs
- [ ] Logs are filtered by `project.company_id`
- [ ] Root user sees all logs (or filtered by context)
- [ ] Company users see only their company's logs
- [ ] Cannot access log from another company (403 error)

### 5.5 Schedule Changes
- [ ] Schedule changes are filtered by `task.project.company_id`
- [ ] Root user sees all schedule changes (or filtered by context)
- [ ] Company users see only their company's schedule changes
- [ ] Cannot access schedule change from another company (403 error)

### 5.6 Activities
- [ ] Activities are filtered by company
- [ ] Root user sees all activities (or filtered by context)
- [ ] Company users see only their company's activities

### 5.7 Dashboard Stats
- [ ] Dashboard stats are filtered by company
- [ ] Root user sees all stats (or filtered by context)
- [ ] Company users see only their company's stats

### 5.8 Subcontractor Assignments
- [ ] Assignments are filtered by `project.company_id`
- [ ] Root user sees all assignments (or filtered by context)
- [ ] Company users see only their company's assignments
- [ ] Cannot access assignment from another company (403 error)

### 5.9 Project Health Metrics
- [ ] Health metrics are filtered by `project.company_id`
- [ ] Root user sees all metrics (or filtered by context)
- [ ] Company users see only their company's metrics
- [ ] Cannot access metrics from another company (403 error)

### 5.10 Risk Assessments
- [ ] Risk assessments are filtered by `project.company_id`
- [ ] Root user sees all risks (or filtered by context)
- [ ] Company users see only their company's risks
- [ ] Cannot access risk from another company (403 error)

## 6. Security Tests

### 6.1 Authentication
- [ ] Unauthenticated requests return 401
- [ ] Invalid session returns 401
- [ ] Expired session returns 401

### 6.2 Authorization
- [ ] Company admin cannot access root admin endpoints
- [ ] Regular user cannot access admin endpoints
- [ ] Users cannot access other companies' data via direct ID
- [ ] Users cannot modify other companies' data via direct ID

### 6.3 Data Leakage Prevention
- [ ] No company data appears in other company's responses
- [ ] No company IDs are exposed in error messages
- [ ] No cross-company data in API responses
- [ ] No cross-company data in frontend queries

## 7. Edge Cases

### 7.1 Missing Company ID
- [ ] User without `company_id` sees empty data
- [ ] User without `company_id` cannot create data
- [ ] Root user without context sees all data

### 7.2 Invalid Company ID
- [ ] Invalid `company_id` in request returns 403
- [ ] Non-existent organization context returns 404
- [ ] Invalid organization context is rejected

### 7.3 Session Management
- [ ] Organization context persists after page refresh
- [ ] Organization context clears on logout
- [ ] Organization context persists across tabs

## 8. Performance Tests

### 8.1 Query Performance
- [ ] Company-filtered queries are fast (< 100ms)
- [ ] Root user queries with context are fast
- [ ] Root user queries without context are acceptable

### 8.2 UI Performance
- [ ] Organization selector loads quickly
- [ ] Context switching is responsive (< 500ms)
- [ ] Data refresh after context switch is smooth

## 9. Integration Tests

### 9.1 End-to-End Flows
- [ ] Root user can switch context and see filtered data
- [ ] Company admin can manage their company's users
- [ ] Regular user can only see their company's data
- [ ] All modules respect organization context

### 9.2 Cross-Module Consistency
- [ ] Dashboard stats match filtered project/task counts
- [ ] Activity feed matches filtered data
- [ ] Notifications match filtered data

## 10. Documentation

### 10.1 Code Documentation
- [ ] All endpoints have proper docstrings
- [ ] Organization context logic is documented
- [ ] Root user detection is documented

### 10.2 User Documentation
- [ ] Root user guide for organization switching
- [ ] Company admin guide for user management
- [ ] Regular user guide for data access

## Test Results Summary

**Date**: _______________
**Tester**: _______________
**Environment**: _______________

**Total Tests**: _______________
**Passed**: _______________
**Failed**: _______________
**Skipped**: _______________

**Notes**:
_________________________________________________
_________________________________________________
_________________________________________________

