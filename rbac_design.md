# Tower Flow RBAC System Design

## Entity-Relationship Diagram

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   APP_ADMINS    │    │    COMPANIES    │    │      USERS      │
├─────────────────┤    ├─────────────────┤    ├─────────────────┤
│ id (PK)         │    │ id (PK)         │    │ id (PK)         │
│ user_id (FK)    │    │ name            │    │ email           │
│ created_at      │    │ subscription_id │    │ first_name      │
│ updated_at      │    │ status          │    │ last_name       │
└─────────────────┘    │ created_at      │    │ password_hash   │
         │              │ updated_at      │    │ profile_image   │
         │              └─────────────────┘    │ created_at      │
         │                       │             │ updated_at      │
         │                       │             └─────────────────┘
         │                       │                      │
         │                       │                      │
         └───────────────────────┼──────────────────────┘
                                 │
                                 │
              ┌─────────────────────────────────┐
              │        COMPANY_USERS           │
              ├─────────────────────────────────┤
              │ id (PK)                        │
              │ company_id (FK)                │
              │ user_id (FK)                   │
              │ role_id (FK)                   │
              │ is_company_admin               │
              │ created_at                     │
              │ updated_at                     │
              └─────────────────────────────────┘
                               │
                               │
              ┌─────────────────────────────────┐
              │           ROLES                │
              ├─────────────────────────────────┤
              │ id (PK)                        │
              │ name                           │
              │ description                    │
              │ created_at                     │
              └─────────────────────────────────┘
                               │
                               │
              ┌─────────────────────────────────┐
              │      ROLE_PERMISSIONS          │
              ├─────────────────────────────────┤
              │ id (PK)                        │
              │ role_id (FK)                   │
              │ permission_id (FK)             │
              │ created_at                     │
              └─────────────────────────────────┘
                               │
                               │
              ┌─────────────────────────────────┐
              │        PERMISSIONS             │
              ├─────────────────────────────────┤
              │ id (PK)                        │
              │ name                           │
              │ resource                       │
              │ action                         │
              │ description                    │
              └─────────────────────────────────┘

┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│    PROJECTS     │    │   PROJECT_USERS │    │      TASKS      │
├─────────────────┤    ├─────────────────┤    ├─────────────────┤
│ id (PK)         │    │ id (PK)         │    │ id (PK)         │
│ company_id (FK) │◄───┤ project_id (FK) │    │ project_id (FK) │
│ name            │    │ user_id (FK)    │    │ title           │
│ description     │    │ role           │    │ description     │
│ status          │    │ created_at      │    │ status          │
│ budget          │    └─────────────────┘    │ priority        │
│ created_at      │                           │ assigned_to     │
│ updated_at      │                           │ created_at      │
└─────────────────┘                           │ updated_at      │
                                              └─────────────────┘
```

## Role Hierarchy & Permissions

### 1. APP_ADMIN (Root Developer)
- **Description**: You (app owner/developer)
- **Permissions**: 
  - Full system access
  - Manage all companies
  - System configuration
  - Global analytics
  - Billing oversight

### 2. COMPANY_ADMIN (Company Root Admin)
- **Description**: Company owner who purchased subscription
- **Permissions**:
  - Full company access
  - Manage all users in company
  - Financial information access
  - Assign/revoke permissions
  - Company settings

### 3. PROJECT_MANAGER
- **Description**: Manages multiple projects within company
- **Permissions**:
  - View all company projects
  - Manage tasks and assignments
  - Access project logs and photos
  - NO financial information access
  - Manage subcontractors

### 4. SUBCONTRACTOR
- **Description**: External contractors working on specific projects
- **Permissions**:
  - Access only to "Subs" module
  - View assigned tasks
  - Update task status
  - Upload photos for assigned tasks
  - Limited project information

### 5. CLIENT
- **Description**: Project owners/stakeholders
- **Permissions**:
  - Access only to their specific project(s)
  - View project progress
  - View photos and logs
  - NO task management
  - NO financial information

## Permission Structure

### Resources & Actions
```
PROJECTS: [view, create, edit, delete, view_financial]
TASKS: [view, create, edit, delete, assign]
USERS: [view, create, edit, delete, manage_permissions]
PHOTOS: [view, upload, delete]
LOGS: [view, create, edit, delete]
SUBCONTRACTORS: [view, create, edit, delete, assign_tasks]
FINANCIAL: [view, edit]
SYSTEM: [manage_companies, system_config]
```

## Database Schema Implementation

### Key Tables:
1. **companies**: Multi-tenant support
2. **users**: Global user base
3. **company_users**: Links users to companies with roles
4. **roles**: Predefined role templates
5. **permissions**: Granular permission system
6. **role_permissions**: Many-to-many role-permission mapping
7. **projects**: Company-specific projects
8. **project_users**: Project-level access control (for clients)

### Security Features:
- Company isolation (multi-tenant)
- Row-level security
- Permission inheritance
- Audit logging
- Session management per company context

## Implementation Notes:
- Users can belong to multiple companies with different roles
- Company admins can create custom roles within their company
- Project-level permissions override company-level for clients
- Subcontractors have limited cross-project visibility
- All permissions are checked at API level and UI level