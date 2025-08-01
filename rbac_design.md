# Tower Flow RBAC System Design - REVISED

## Review of User Suggestions - All Adopted

**User suggestions are EXCELLENT and address real production concerns:**

1. ✅ **Company 0 for platform**: Simplifies RLS, eliminates special cases
2. ✅ **Global roles + project assignments**: Prevents role explosion 
3. ✅ **Role templates with inheritance**: Scalable permission management
4. ✅ **Integer permissions**: Performance + type safety
5. ✅ **Database RLS**: Defense in depth security
6. ✅ **Cached effective permissions**: Performance at scale
7. ✅ **Audit trails**: SOC-2/GDPR compliance
8. ✅ **ABAC for edge cases**: Handle complex business rules
9. ✅ **Strategic indexing**: Sub-millisecond lookups
10. ✅ **Security hygiene**: MFA, least privilege, opt-in elevation

## Revised Entity-Relationship Diagram

```
┌─────────────────┐    ┌─────────────────┐    
│    COMPANIES    │    │      USERS      │    
├─────────────────┤    ├─────────────────┤    
│ id (PK)         │    │ id (PK)         │    
│ name            │    │ email           │    
│ subscription_id │    │ first_name      │    
│ status          │    │ last_name       │    
│ is_platform     │    │ password_hash   │    
│ created_at      │    │ profile_image   │    
│ updated_at      │    │ mfa_enabled     │    
└─────────────────┘    │ created_at      │    
         │              │ updated_at      │    
         │              └─────────────────┘    
         │                       │             
         │                       │             
         │              ┌─────────────────────────────────┐
         │              │        COMPANY_USERS           │
         │              ├─────────────────────────────────┤
         │              │ id (PK)                        │
         │              │ company_id (FK) -- RLS KEY     │
         │              │ user_id (FK)                   │
         │              │ role_id (FK)                   │
         │              │ granted_by_user_id (FK)        │
         │              │ granted_at                     │
         │              │ expires_at                     │
         │              │ created_at                     │
         │              └─────────────────────────────────┘
                               │
                               │
              ┌─────────────────────────────────┐
              │           ROLES                │
              ├─────────────────────────────────┤
              │ id (PK)                        │
              │ company_id (FK) -- RLS KEY     │
              │ name                           │
              │ description                    │
              │ template_id (FK) -- INHERITANCE│
              │ is_template                    │
              │ created_at                     │
              └─────────────────────────────────┘
                               │
                               │
              ┌─────────────────────────────────┐
              │      ROLE_PERMISSIONS          │
              ├─────────────────────────────────┤
              │ id (PK)                        │
              │ company_id (FK) -- RLS KEY     │
              │ role_id (FK)                   │
              │ permission_id (FK)             │
              │ abac_rule (JSONB)              │
              │ created_at                     │
              └─────────────────────────────────┘
                               │
                               │
              ┌─────────────────────────────────┐
              │        PERMISSIONS             │
              ├─────────────────────────────────┤
              │ id (PK) -- INTEGER ENUM        │
              │ code (INT) -- APP CONSTANT     │
              │ name                           │
              │ resource                       │
              │ action                         │
              │ description                    │
              └─────────────────────────────────┘

              ┌─────────────────────────────────┐
              │   USER_EFFECTIVE_PERMISSIONS   │
              ├─────────────────────────────────┤
              │ id (PK)                        │
              │ company_id (FK) -- RLS KEY     │
              │ user_id (FK)                   │
              │ permissions (JSONB ARRAY)      │
              │ updated_at                     │
              └─────────────────────────────────┘

┌─────────────────┐    ┌─────────────────────────────────┐    ┌─────────────────┐
│    PROJECTS     │    │      PROJECT_ASSIGNMENTS      │    │      TASKS      │
├─────────────────┤    ├─────────────────────────────────┤    ├─────────────────┤
│ id (PK)         │    │ id (PK)                        │    │ id (PK)         │
│ company_id (FK) │◄───┤ company_id (FK) -- RLS KEY     │    │ company_id (FK) │
│ name            │    │ project_id (FK)                │    │ project_id (FK) │
│ description     │    │ user_id (FK)                   │    │ title           │
│ status          │    │ role_type                      │    │ description     │
│ budget          │    │ granted_by_user_id (FK)        │    │ status          │
│ budget_visible  │    │ granted_at                     │    │ priority        │
│ created_at      │    │ expires_at                     │    │ assigned_to     │
│ updated_at      │    │ created_at                     │    │ created_at      │
└─────────────────┘    └─────────────────────────────────┘    │ updated_at      │
                                                              └─────────────────┘
```

## Role Hierarchy & Permissions (Revised)

### Global Role Templates (Company 0 - Platform):

### 1. PLATFORM_ADMIN (You - App Owner)
- **Company**: 0 (Platform)
- **MFA Required**: True
- **Permissions**: 
  - Full system access (Permission.SYSTEM_ADMIN = 1)
  - Impersonate any company (Permission.IMPERSONATE = 2)
  - Global analytics (Permission.VIEW_GLOBAL_ANALYTICS = 3)

### 2. COMPANY_ADMIN (Company Root Admin)
- **Template Role**: Can be cloned per company
- **MFA Required**: True
- **Default Mode**: View-only for financial data
- **Permissions**:
  - Manage company users (Permission.MANAGE_USERS = 10)
  - View financial data (Permission.VIEW_FINANCIALS = 11)
  - Edit financial data (Permission.EDIT_FINANCIALS = 12) - Requires elevation
  - Clone role templates (Permission.CLONE_ROLES = 13)

### 3. PROJECT_MANAGER (Template)
- **Permissions**:
  - View all company projects (Permission.VIEW_ALL_PROJECTS = 20)
  - Manage tasks (Permission.MANAGE_TASKS = 21)
  - Assign subcontractors (Permission.ASSIGN_SUBS = 22)
  - ABAC Rule: "Can edit only projects they created"

### 4. SUBCONTRACTOR (Template)  
- **Project Assignment Required**: True
- **Permissions**:
  - View assigned tasks only (Permission.VIEW_ASSIGNED_TASKS = 30)
  - Update task status (Permission.UPDATE_TASK_STATUS = 31)
  - Upload photos (Permission.UPLOAD_PHOTOS = 32)

### 5. CLIENT (Template)
- **Project Assignment Required**: True  
- **Permissions**:
  - View project progress (Permission.VIEW_PROJECT_PROGRESS = 40)
  - View photos/logs (Permission.VIEW_PROJECT_MEDIA = 41)
  - NO task management or financial access

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

## Key Implementation Improvements:

### 1. Company 0 Strategy
- Platform staff (you) belong to Company 0
- ALL tables have company_id (including Company 0)
- Single RLS rule: `company_id = current_setting('app.current_company')`
- Impersonation: Change session setting, stay in Company 0

### 2. Role Template System
```sql
-- Platform creates template
INSERT INTO roles (id, company_id, name, is_template) 
VALUES (1, 0, 'Project Manager', true);

-- Company admin clones template  
INSERT INTO roles (company_id, name, template_id)
VALUES (123, 'Site Supervisor', 1);
```

### 3. Integer Permissions (Type Safe)
```python
class Permission(IntEnum):
    SYSTEM_ADMIN = 1
    IMPERSONATE = 2
    VIEW_GLOBAL_ANALYTICS = 3
    MANAGE_USERS = 10
    VIEW_FINANCIALS = 11
    # ... etc
```

### 4. ABAC Edge Cases
```json
{
  "condition": "project.created_by == user.id",
  "resource": "project", 
  "action": "edit"
}
```

### 5. Performance Optimizations
- Cached effective permissions per user
- Strategic indexes: (company_id, user_id), (project_id, user_id)
- Materialized permission views

### 6. Audit & Security
- All access grants tracked with grantor, timestamp, expiry
- MFA required for admin roles
- Financial data requires explicit elevation
- Row-level security at database level

### 7. Scalability
- Project assignments prevent role explosion
- Template inheritance keeps role table manageable
- O(1) permission lookups via cached JSON arrays