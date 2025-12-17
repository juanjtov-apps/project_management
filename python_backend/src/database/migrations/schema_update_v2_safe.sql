-- ============================================================================
-- PROESPHERE SCHEMA UPDATE V2 - SAFE VERSION
-- Based on actual database inspection on Dec 12, 2024
-- ============================================================================
-- Current state:
-- - users table has role_id (all NULL) and is_root columns
-- - roles table has: id, role_name, display_name (6 roles exist)
-- - permissions table has: id, code, name, resource, action, description
-- - users.role (text) is still being used instead of role_id
-- ============================================================================

-- ============================================================================
-- 1. ADD MISSING COLUMNS TO ROLES TABLE
-- ============================================================================

-- Add name column (copy from role_name for consistency with new schema)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'roles' AND column_name = 'name') THEN
        ALTER TABLE roles ADD COLUMN name VARCHAR(100);
        UPDATE roles SET name = role_name;
        RAISE NOTICE 'Added name column to roles table and copied from role_name';
    END IF;
END $$;

-- Add company_id column (null = global role, applies to all companies)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'roles' AND column_name = 'company_id') THEN
        ALTER TABLE roles ADD COLUMN company_id VARCHAR REFERENCES companies(id) ON DELETE CASCADE;
        RAISE NOTICE 'Added company_id column to roles table';
    END IF;
END $$;

-- Add description column
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'roles' AND column_name = 'description') THEN
        ALTER TABLE roles ADD COLUMN description TEXT;
        -- Set default descriptions
        UPDATE roles SET description = 'Full access to all company features' WHERE role_name = 'admin';
        UPDATE roles SET description = 'Can manage projects, tasks, and team members' WHERE role_name = 'project_manager';
        UPDATE roles SET description = 'Can manage administrative tasks and reports' WHERE role_name = 'office_manager';
        UPDATE roles SET description = 'Can view and update assigned tasks' WHERE role_name = 'crew';
        UPDATE roles SET description = 'External contractor with limited access' WHERE role_name = 'subcontractor';
        UPDATE roles SET description = 'Project stakeholder with read-only access' WHERE role_name = 'client';
        RAISE NOTICE 'Added description column to roles table';
    END IF;
END $$;

-- Add is_system_role column
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'roles' AND column_name = 'is_system_role') THEN
        ALTER TABLE roles ADD COLUMN is_system_role BOOLEAN NOT NULL DEFAULT true;
        RAISE NOTICE 'Added is_system_role column to roles table';
    END IF;
END $$;

-- Add is_active column
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'roles' AND column_name = 'is_active') THEN
        ALTER TABLE roles ADD COLUMN is_active BOOLEAN NOT NULL DEFAULT true;
        RAISE NOTICE 'Added is_active column to roles table';
    END IF;
END $$;

-- Add timestamps to roles
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'roles' AND column_name = 'created_at') THEN
        ALTER TABLE roles ADD COLUMN created_at TIMESTAMPTZ DEFAULT NOW();
        RAISE NOTICE 'Added created_at column to roles table';
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'roles' AND column_name = 'updated_at') THEN
        ALTER TABLE roles ADD COLUMN updated_at TIMESTAMPTZ DEFAULT NOW();
        RAISE NOTICE 'Added updated_at column to roles table';
    END IF;
END $$;

-- ============================================================================
-- 2. ADD CATEGORY COLUMN TO PERMISSIONS TABLE
-- ============================================================================

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'permissions' AND column_name = 'category') THEN
        ALTER TABLE permissions ADD COLUMN category VARCHAR(100) DEFAULT 'general';
        RAISE NOTICE 'Added category column to permissions table';
    END IF;
END $$;

-- ============================================================================
-- 3. 🔴 CRITICAL: POPULATE users.role_id FROM users.role TEXT
-- ============================================================================

-- This updates all users who have a role text but no role_id
UPDATE users u
SET role_id = r.id
FROM roles r
WHERE u.role_id IS NULL
  AND u.role IS NOT NULL
  AND LOWER(u.role) = LOWER(r.role_name);

-- Report how many users were updated
DO $$
DECLARE
    updated_count INTEGER;
    still_null_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO updated_count FROM users WHERE role_id IS NOT NULL;
    SELECT COUNT(*) INTO still_null_count FROM users WHERE role_id IS NULL;
    RAISE NOTICE 'Users with role_id set: %', updated_count;
    RAISE NOTICE 'Users still missing role_id: %', still_null_count;
END $$;

-- For any users still without role_id, set them to 'crew' (id=5) as default
UPDATE users
SET role_id = 5
WHERE role_id IS NULL;

-- ============================================================================
-- 4. CREATE ROLE_PERMISSIONS TABLE IF NOT EXISTS
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
-- 5. CREATE AUDIT_LOGS TABLE IF NOT EXISTS
-- ============================================================================

CREATE TABLE IF NOT EXISTS audit_logs (
    id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id VARCHAR NOT NULL,
    user_id VARCHAR NOT NULL,
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
-- 6. ADD INDEXES TO EXISTING TABLES (if missing)
-- ============================================================================

-- Users indexes
CREATE INDEX IF NOT EXISTS users_company_id_idx ON users(company_id);
CREATE INDEX IF NOT EXISTS users_is_active_idx ON users(is_active);
CREATE INDEX IF NOT EXISTS users_is_root_idx ON users(is_root) WHERE is_root = true;

-- Roles indexes
CREATE INDEX IF NOT EXISTS roles_company_id_idx ON roles(company_id);
CREATE INDEX IF NOT EXISTS roles_is_active_idx ON roles(is_active);

-- Companies indexes
CREATE INDEX IF NOT EXISTS companies_is_active_idx ON companies(is_active);

-- Projects indexes (if projects table exists)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'projects') THEN
        EXECUTE 'CREATE INDEX IF NOT EXISTS projects_company_id_idx ON projects(company_id)';
        EXECUTE 'CREATE INDEX IF NOT EXISTS projects_status_idx ON projects(status)';
    END IF;
END $$;

-- Tasks indexes (if tasks table exists)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'tasks') THEN
        EXECUTE 'CREATE INDEX IF NOT EXISTS tasks_company_id_idx ON tasks(company_id)';
        EXECUTE 'CREATE INDEX IF NOT EXISTS tasks_project_id_idx ON tasks(project_id)';
        EXECUTE 'CREATE INDEX IF NOT EXISTS tasks_assignee_id_idx ON tasks(assignee_id)';
        EXECUTE 'CREATE INDEX IF NOT EXISTS tasks_status_idx ON tasks(status)';
    END IF;
END $$;

-- ============================================================================
-- 7. SEED ROLE_PERMISSIONS (based on existing permissions table with codes)
-- ============================================================================

-- First, let's see what permissions exist and assign them to roles
-- The existing permissions table uses integer 'code' field

-- Admin gets ALL permissions
INSERT INTO role_permissions (role_id, permission_id)
SELECT 
    (SELECT id FROM roles WHERE role_name = 'admin'),
    p.id
FROM permissions p
WHERE NOT EXISTS (
    SELECT 1 FROM role_permissions rp 
    WHERE rp.role_id = (SELECT id FROM roles WHERE role_name = 'admin')
    AND rp.permission_id = p.id
);

-- Project Manager permissions (codes 20-29 plus some others)
INSERT INTO role_permissions (role_id, permission_id)
SELECT 
    (SELECT id FROM roles WHERE role_name = 'project_manager'),
    p.id
FROM permissions p
WHERE p.code IN (20, 21, 22, 23, 24, 25, 30, 31, 32, 33, 34)
  AND NOT EXISTS (
    SELECT 1 FROM role_permissions rp 
    WHERE rp.role_id = (SELECT id FROM roles WHERE role_name = 'project_manager')
    AND rp.permission_id = p.id
);

-- Office Manager permissions
INSERT INTO role_permissions (role_id, permission_id)
SELECT 
    (SELECT id FROM roles WHERE role_name = 'office_manager'),
    p.id
FROM permissions p
WHERE p.code IN (10, 11, 12, 15, 20, 21, 24)
  AND NOT EXISTS (
    SELECT 1 FROM role_permissions rp 
    WHERE rp.role_id = (SELECT id FROM roles WHERE role_name = 'office_manager')
    AND rp.permission_id = p.id
);

-- Crew permissions
INSERT INTO role_permissions (role_id, permission_id)
SELECT 
    (SELECT id FROM roles WHERE role_name = 'crew'),
    p.id
FROM permissions p
WHERE p.code IN (30, 31, 32, 33)
  AND NOT EXISTS (
    SELECT 1 FROM role_permissions rp 
    WHERE rp.role_id = (SELECT id FROM roles WHERE role_name = 'crew')
    AND rp.permission_id = p.id
);

-- Subcontractor permissions (same as crew)
INSERT INTO role_permissions (role_id, permission_id)
SELECT 
    (SELECT id FROM roles WHERE role_name = 'subcontractor'),
    p.id
FROM permissions p
WHERE p.code IN (30, 31, 32, 33, 34)
  AND NOT EXISTS (
    SELECT 1 FROM role_permissions rp 
    WHERE rp.role_id = (SELECT id FROM roles WHERE role_name = 'subcontractor')
    AND rp.permission_id = p.id
);

-- Client permissions
INSERT INTO role_permissions (role_id, permission_id)
SELECT 
    (SELECT id FROM roles WHERE role_name = 'client'),
    p.id
FROM permissions p
WHERE p.code IN (40, 41, 42, 43, 44, 45)
  AND NOT EXISTS (
    SELECT 1 FROM role_permissions rp 
    WHERE rp.role_id = (SELECT id FROM roles WHERE role_name = 'client')
    AND rp.permission_id = p.id
);

-- ============================================================================
-- 8. VERIFICATION SUMMARY
-- ============================================================================

DO $$
DECLARE
    roles_count INTEGER;
    permissions_count INTEGER;
    role_permissions_count INTEGER;
    users_with_role_id INTEGER;
    users_total INTEGER;
    users_is_root INTEGER;
BEGIN
    SELECT COUNT(*) INTO roles_count FROM roles;
    SELECT COUNT(*) INTO permissions_count FROM permissions;
    SELECT COUNT(*) INTO role_permissions_count FROM role_permissions;
    SELECT COUNT(*) INTO users_with_role_id FROM users WHERE role_id IS NOT NULL;
    SELECT COUNT(*) INTO users_total FROM users;
    SELECT COUNT(*) INTO users_is_root FROM users WHERE is_root = true;
    
    RAISE NOTICE '';
    RAISE NOTICE '============================================';
    RAISE NOTICE 'MIGRATION SUMMARY';
    RAISE NOTICE '============================================';
    RAISE NOTICE 'Total roles: %', roles_count;
    RAISE NOTICE 'Total permissions: %', permissions_count;
    RAISE NOTICE 'Role-Permission mappings: %', role_permissions_count;
    RAISE NOTICE 'Total users: %', users_total;
    RAISE NOTICE 'Users with role_id: %', users_with_role_id;
    RAISE NOTICE 'Root users: %', users_is_root;
    RAISE NOTICE '============================================';
    RAISE NOTICE '';
    RAISE NOTICE 'NEXT STEP: Set your root user with:';
    RAISE NOTICE 'UPDATE users SET is_root = true WHERE email = ''your-admin@email.com'';';
    RAISE NOTICE '============================================';
END $$;
