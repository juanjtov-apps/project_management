-- ============================================================================
-- PROESPHERE SCHEMA UPDATE V2
-- Simplified RBAC: One user, one company, one role
-- ============================================================================
-- Run this migration to update the database schema to the new simplified model.
-- IMPORTANT: Backup your database before running this migration!
-- ============================================================================

BEGIN;

-- ============================================================================
-- 1. CREATE ROLES TABLE (if not exists)
-- ============================================================================

CREATE TABLE IF NOT EXISTS roles (
    id SERIAL PRIMARY KEY,
    company_id VARCHAR REFERENCES companies(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    display_name VARCHAR(255) NOT NULL,
    description TEXT,
    is_system_role BOOLEAN NOT NULL DEFAULT false,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for roles
CREATE INDEX IF NOT EXISTS roles_company_id_idx ON roles(company_id);
CREATE UNIQUE INDEX IF NOT EXISTS roles_company_name_idx ON roles(company_id, name);

-- ============================================================================
-- 2. CREATE PERMISSIONS TABLE (if not exists)
-- ============================================================================

CREATE TABLE IF NOT EXISTS permissions (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    resource VARCHAR(100) NOT NULL,
    action VARCHAR(100) NOT NULL,
    description TEXT,
    category VARCHAR(100) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for permissions
CREATE INDEX IF NOT EXISTS permissions_resource_idx ON permissions(resource);
CREATE INDEX IF NOT EXISTS permissions_category_idx ON permissions(category);
CREATE UNIQUE INDEX IF NOT EXISTS permissions_resource_action_idx ON permissions(resource, action);

-- ============================================================================
-- 3. CREATE ROLE_PERMISSIONS TABLE (if not exists)
-- ============================================================================

CREATE TABLE IF NOT EXISTS role_permissions (
    id SERIAL PRIMARY KEY,
    role_id INTEGER NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
    permission_id INTEGER NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for role_permissions
CREATE INDEX IF NOT EXISTS role_permissions_role_id_idx ON role_permissions(role_id);
CREATE INDEX IF NOT EXISTS role_permissions_permission_id_idx ON role_permissions(permission_id);
CREATE UNIQUE INDEX IF NOT EXISTS role_permissions_unique_idx ON role_permissions(role_id, permission_id);

-- ============================================================================
-- 4. CREATE AUDIT_LOGS TABLE (if not exists)
-- ============================================================================

CREATE TABLE IF NOT EXISTS audit_logs (
    id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id VARCHAR NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    user_id VARCHAR NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    action VARCHAR(100) NOT NULL,
    resource VARCHAR(100) NOT NULL,
    resource_id VARCHAR,
    old_values JSONB,
    new_values JSONB,
    ip_address VARCHAR(45),
    user_agent TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes for audit_logs
CREATE INDEX IF NOT EXISTS audit_logs_company_id_idx ON audit_logs(company_id);
CREATE INDEX IF NOT EXISTS audit_logs_user_id_idx ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS audit_logs_action_idx ON audit_logs(action);
CREATE INDEX IF NOT EXISTS audit_logs_created_at_idx ON audit_logs(created_at);

-- ============================================================================
-- 5. SEED DEFAULT PERMISSIONS
-- ============================================================================

INSERT INTO permissions (name, resource, action, description, category) VALUES
    -- User Management
    ('users.view', 'users', 'view', 'View users', 'user_management'),
    ('users.create', 'users', 'create', 'Create users', 'user_management'),
    ('users.edit', 'users', 'edit', 'Edit users', 'user_management'),
    ('users.delete', 'users', 'delete', 'Delete users', 'user_management'),
    
    -- Project Management
    ('projects.view', 'projects', 'view', 'View projects', 'project_management'),
    ('projects.create', 'projects', 'create', 'Create projects', 'project_management'),
    ('projects.edit', 'projects', 'edit', 'Edit projects', 'project_management'),
    ('projects.delete', 'projects', 'delete', 'Delete projects', 'project_management'),
    
    -- Task Management
    ('tasks.view', 'tasks', 'view', 'View tasks', 'task_management'),
    ('tasks.create', 'tasks', 'create', 'Create tasks', 'task_management'),
    ('tasks.edit', 'tasks', 'edit', 'Edit tasks', 'task_management'),
    ('tasks.delete', 'tasks', 'delete', 'Delete tasks', 'task_management'),
    ('tasks.assign', 'tasks', 'assign', 'Assign tasks', 'task_management'),
    
    -- Financial
    ('financials.view', 'financials', 'view', 'View financial data', 'financial'),
    ('financials.edit', 'financials', 'edit', 'Edit financial data', 'financial'),
    ('invoices.create', 'invoices', 'create', 'Create invoices', 'financial'),
    ('invoices.approve', 'invoices', 'approve', 'Approve invoices', 'financial'),
    
    -- Photos & Documents
    ('photos.view', 'photos', 'view', 'View photos', 'media'),
    ('photos.upload', 'photos', 'upload', 'Upload photos', 'media'),
    ('photos.delete', 'photos', 'delete', 'Delete photos', 'media'),
    
    -- Reports
    ('reports.view', 'reports', 'view', 'View reports', 'reports'),
    ('reports.export', 'reports', 'export', 'Export reports', 'reports'),
    
    -- Company Settings
    ('company.settings', 'company', 'settings', 'Manage company settings', 'administration'),
    ('roles.manage', 'roles', 'manage', 'Manage roles', 'administration'),
    
    -- Client Portal
    ('client_portal.view', 'client_portal', 'view', 'View client portal', 'client_portal'),
    ('client_portal.issues.create', 'client_portal', 'issues.create', 'Create issues in client portal', 'client_portal'),
    
    -- System Admin
    ('system.admin', 'system', 'admin', 'Full system administration', 'system'),
    ('companies.manage', 'companies', 'manage', 'Manage companies', 'system')
ON CONFLICT (name) DO NOTHING;

-- ============================================================================
-- 6. ADD role_id AND is_root TO USERS TABLE
-- ============================================================================

-- Add role_id column if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'users' AND column_name = 'role_id') THEN
        ALTER TABLE users ADD COLUMN role_id INTEGER;
    END IF;
END $$;

-- Add is_root column if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'users' AND column_name = 'is_root') THEN
        ALTER TABLE users ADD COLUMN is_root BOOLEAN NOT NULL DEFAULT false;
    END IF;
END $$;

-- Add last_login_at column if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'users' AND column_name = 'last_login_at') THEN
        ALTER TABLE users ADD COLUMN last_login_at TIMESTAMPTZ;
    END IF;
END $$;

-- ============================================================================
-- 7. CREATE DEFAULT ROLES FOR EACH COMPANY
-- ============================================================================

-- Insert default roles for each company (if they don't exist)
INSERT INTO roles (company_id, name, display_name, description, is_system_role)
SELECT 
    c.id,
    r.name,
    r.display_name,
    r.description,
    true
FROM companies c
CROSS JOIN (
    VALUES 
        ('admin', 'Administrator', 'Full access to all company features'),
        ('project_manager', 'Project Manager', 'Can manage projects, tasks, and team members'),
        ('office_manager', 'Office Manager', 'Can manage administrative tasks and reports'),
        ('crew', 'Crew Member', 'Can view and update assigned tasks'),
        ('subcontractor', 'Subcontractor', 'External contractor with limited access'),
        ('client', 'Client', 'Project stakeholder with read-only access')
) AS r(name, display_name, description)
WHERE NOT EXISTS (
    SELECT 1 FROM roles 
    WHERE roles.company_id = c.id AND roles.name = r.name
);

-- ============================================================================
-- 8. MIGRATE EXISTING USER ROLES
-- ============================================================================

-- Update users with legacy 'role' text field to use role_id
-- Map old role names to new role_id values
UPDATE users u
SET role_id = r.id
FROM roles r
WHERE u.company_id = r.company_id
  AND u.role_id IS NULL
  AND u.role IS NOT NULL
  AND (
    (LOWER(u.role) = 'admin' AND r.name = 'admin') OR
    (LOWER(u.role) IN ('manager', 'project_manager', 'pm') AND r.name = 'project_manager') OR
    (LOWER(u.role) IN ('office_manager', 'office') AND r.name = 'office_manager') OR
    (LOWER(u.role) IN ('crew', 'worker', 'employee') AND r.name = 'crew') OR
    (LOWER(u.role) IN ('subcontractor', 'sub', 'contractor') AND r.name = 'subcontractor') OR
    (LOWER(u.role) IN ('client', 'customer') AND r.name = 'client')
  );

-- Set default role (crew) for users without a role
UPDATE users u
SET role_id = r.id
FROM roles r
WHERE u.company_id = r.company_id
  AND u.role_id IS NULL
  AND r.name = 'crew';

-- ============================================================================
-- 9. ADD FOREIGN KEY CONSTRAINT
-- ============================================================================

-- Drop existing constraint if it exists
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_id_fkey;

-- Add foreign key constraint
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'users_role_id_fkey' AND table_name = 'users'
    ) THEN
        ALTER TABLE users 
        ADD CONSTRAINT users_role_id_fkey 
        FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE RESTRICT;
    END IF;
END $$;

-- ============================================================================
-- 10. CREATE INDEX ON role_id
-- ============================================================================

CREATE INDEX IF NOT EXISTS users_role_id_idx ON users(role_id);
CREATE INDEX IF NOT EXISTS users_is_root_idx ON users(is_root) WHERE is_root = true;

-- ============================================================================
-- 11. ASSIGN PERMISSIONS TO DEFAULT ROLES
-- ============================================================================

-- Admin role permissions (all permissions except system admin)
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
CROSS JOIN permissions p
WHERE r.name = 'admin'
  AND p.name IN (
    'users.view', 'users.create', 'users.edit', 'users.delete',
    'projects.view', 'projects.create', 'projects.edit', 'projects.delete',
    'tasks.view', 'tasks.create', 'tasks.edit', 'tasks.delete', 'tasks.assign',
    'financials.view', 'financials.edit', 'invoices.create', 'invoices.approve',
    'photos.view', 'photos.upload', 'photos.delete',
    'reports.view', 'reports.export',
    'company.settings', 'roles.manage',
    'client_portal.view', 'client_portal.issues.create'
  )
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- Project Manager permissions
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
CROSS JOIN permissions p
WHERE r.name = 'project_manager'
  AND p.name IN (
    'users.view',
    'projects.view', 'projects.create', 'projects.edit',
    'tasks.view', 'tasks.create', 'tasks.edit', 'tasks.delete', 'tasks.assign',
    'financials.view',
    'photos.view', 'photos.upload',
    'reports.view', 'reports.export',
    'client_portal.view', 'client_portal.issues.create'
  )
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- Office Manager permissions
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
CROSS JOIN permissions p
WHERE r.name = 'office_manager'
  AND p.name IN (
    'users.view',
    'projects.view',
    'tasks.view', 'tasks.create', 'tasks.edit',
    'financials.view', 'financials.edit', 'invoices.create',
    'photos.view',
    'reports.view', 'reports.export'
  )
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- Crew permissions
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
CROSS JOIN permissions p
WHERE r.name = 'crew'
  AND p.name IN (
    'projects.view',
    'tasks.view', 'tasks.edit',
    'photos.view', 'photos.upload'
  )
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- Subcontractor permissions
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
CROSS JOIN permissions p
WHERE r.name = 'subcontractor'
  AND p.name IN (
    'projects.view',
    'tasks.view', 'tasks.edit',
    'photos.view', 'photos.upload'
  )
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- Client permissions
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
CROSS JOIN permissions p
WHERE r.name = 'client'
  AND p.name IN (
    'projects.view',
    'photos.view',
    'client_portal.view', 'client_portal.issues.create'
  )
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- ============================================================================
-- 12. ADD MISSING INDEXES TO OTHER TABLES
-- ============================================================================

-- Companies indexes
CREATE INDEX IF NOT EXISTS companies_is_active_idx ON companies(is_active);
CREATE INDEX IF NOT EXISTS companies_plan_type_idx ON companies(plan_type);

-- Projects indexes
CREATE INDEX IF NOT EXISTS projects_company_id_idx ON projects(company_id);
CREATE INDEX IF NOT EXISTS projects_status_idx ON projects(status);
CREATE INDEX IF NOT EXISTS projects_due_date_idx ON projects(due_date);

-- Tasks indexes
CREATE INDEX IF NOT EXISTS tasks_company_id_idx ON tasks(company_id);
CREATE INDEX IF NOT EXISTS tasks_project_id_idx ON tasks(project_id);
CREATE INDEX IF NOT EXISTS tasks_assignee_id_idx ON tasks(assignee_id);
CREATE INDEX IF NOT EXISTS tasks_status_idx ON tasks(status);
CREATE INDEX IF NOT EXISTS tasks_due_date_idx ON tasks(due_date);

-- Photos indexes
CREATE INDEX IF NOT EXISTS photos_project_id_idx ON photos(project_id);
CREATE INDEX IF NOT EXISTS photos_user_id_idx ON photos(user_id);

-- Notifications indexes
CREATE INDEX IF NOT EXISTS notifications_user_id_idx ON notifications(user_id);
CREATE INDEX IF NOT EXISTS notifications_user_read_idx ON notifications(user_id, is_read);
CREATE INDEX IF NOT EXISTS notifications_created_at_idx ON notifications(created_at);

-- Project logs indexes
CREATE INDEX IF NOT EXISTS project_logs_project_id_idx ON project_logs(project_id);
CREATE INDEX IF NOT EXISTS project_logs_user_id_idx ON project_logs(user_id);

-- User activities indexes
CREATE INDEX IF NOT EXISTS user_activities_user_id_idx ON user_activities(user_id);
CREATE INDEX IF NOT EXISTS user_activities_company_id_idx ON user_activities(company_id);
CREATE INDEX IF NOT EXISTS user_activities_created_at_idx ON user_activities(created_at);

COMMIT;

-- ============================================================================
-- VERIFICATION QUERIES (run after migration)
-- ============================================================================

-- Check users with role_id
-- SELECT COUNT(*) as users_with_role FROM users WHERE role_id IS NOT NULL;

-- Check users without role_id
-- SELECT id, email, role FROM users WHERE role_id IS NULL;

-- Check roles per company
-- SELECT c.name as company, COUNT(r.id) as roles FROM companies c LEFT JOIN roles r ON c.id = r.company_id GROUP BY c.id;

-- Check permissions
-- SELECT COUNT(*) as total_permissions FROM permissions;

-- Check role_permissions
-- SELECT r.name as role, COUNT(rp.id) as permissions FROM roles r LEFT JOIN role_permissions rp ON r.id = rp.role_id GROUP BY r.id, r.name;
