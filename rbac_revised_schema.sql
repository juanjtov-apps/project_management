-- Tower Flow RBAC Schema - Production Ready
-- Incorporates all user suggestions for scalable SaaS architecture

-- Company 0 = Platform, Company 1+ = Customers
CREATE TABLE companies (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    subscription_id VARCHAR(255),
    status VARCHAR(50) DEFAULT 'active',
    is_platform BOOLEAN DEFAULT false, -- true for Company 0
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- All users belong to a company (including platform staff in Company 0)
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    first_name VARCHAR(255),
    last_name VARCHAR(255),
    password_hash VARCHAR(255) NOT NULL,
    profile_image VARCHAR(255),
    mfa_enabled BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Global role templates (Company 0) and company-specific clones
CREATE TABLE roles (
    id SERIAL PRIMARY KEY,
    company_id INTEGER REFERENCES companies(id),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    template_id INTEGER REFERENCES roles(id), -- inheritance chain
    is_template BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(company_id, name)
);

-- Integer permissions for type safety and performance
CREATE TABLE permissions (
    id SERIAL PRIMARY KEY,
    code INTEGER UNIQUE NOT NULL, -- matches app enum constants
    name VARCHAR(255) NOT NULL,
    resource VARCHAR(255) NOT NULL,
    action VARCHAR(255) NOT NULL,
    description TEXT
);

-- Role-permission mapping with ABAC rules for edge cases
CREATE TABLE role_permissions (
    id SERIAL PRIMARY KEY,
    company_id INTEGER REFERENCES companies(id),
    role_id INTEGER REFERENCES roles(id),
    permission_id INTEGER REFERENCES permissions(id),
    abac_rule JSONB, -- {"condition": "project.created_by == user.id"}
    created_at TIMESTAMP DEFAULT NOW()
);

-- User-company-role assignment with audit trail
CREATE TABLE company_users (
    id SERIAL PRIMARY KEY,
    company_id INTEGER REFERENCES companies(id),
    user_id INTEGER REFERENCES users(id),
    role_id INTEGER REFERENCES roles(id),
    granted_by_user_id INTEGER REFERENCES users(id),
    granted_at TIMESTAMP DEFAULT NOW(),
    expires_at TIMESTAMP, -- NULL = permanent
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(company_id, user_id, role_id)
);

-- Cached effective permissions for O(1) lookups
CREATE TABLE user_effective_permissions (
    id SERIAL PRIMARY KEY,
    company_id INTEGER REFERENCES companies(id),
    user_id INTEGER REFERENCES users(id),
    permissions JSONB NOT NULL, -- [1, 10, 11, 20, 21] array of permission codes
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(company_id, user_id)
);

-- Projects with financial visibility control
CREATE TABLE projects (
    id SERIAL PRIMARY KEY,
    company_id INTEGER REFERENCES companies(id),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    status VARCHAR(50) DEFAULT 'active',
    budget DECIMAL(15,2),
    budget_visible_to_roles INTEGER[] DEFAULT '{1,10}', -- only admin roles
    created_by INTEGER REFERENCES users(id),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Project-level access control to prevent role explosion
CREATE TABLE project_assignments (
    id SERIAL PRIMARY KEY,
    company_id INTEGER REFERENCES companies(id),
    project_id INTEGER REFERENCES projects(id),
    user_id INTEGER REFERENCES users(id),
    role_type VARCHAR(50) NOT NULL, -- 'client', 'subcontractor', 'manager'
    granted_by_user_id INTEGER REFERENCES users(id),
    granted_at TIMESTAMP DEFAULT NOW(),
    expires_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(company_id, project_id, user_id)
);

-- Tasks with company isolation
CREATE TABLE tasks (
    id SERIAL PRIMARY KEY,
    company_id INTEGER REFERENCES companies(id),
    project_id INTEGER REFERENCES projects(id),
    title VARCHAR(255) NOT NULL,
    description TEXT,
    status VARCHAR(50) DEFAULT 'pending',
    priority VARCHAR(50) DEFAULT 'medium',
    assigned_to INTEGER REFERENCES users(id),
    created_by INTEGER REFERENCES users(id),
    due_date TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Row-Level Security Policies
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE company_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_effective_permissions ENABLE ROW LEVEL SECURITY;

-- Universal RLS policy - filters by current company context
CREATE POLICY company_isolation_policy ON companies
    FOR ALL TO authenticated
    USING (id = CAST(current_setting('app.current_company', true) AS INTEGER));

CREATE POLICY company_isolation_policy ON company_users
    FOR ALL TO authenticated  
    USING (company_id = CAST(current_setting('app.current_company', true) AS INTEGER));

CREATE POLICY company_isolation_policy ON projects
    FOR ALL TO authenticated
    USING (company_id = CAST(current_setting('app.current_company', true) AS INTEGER));

CREATE POLICY company_isolation_policy ON tasks
    FOR ALL TO authenticated
    USING (company_id = CAST(current_setting('app.current_company', true) AS INTEGER));

CREATE POLICY company_isolation_policy ON project_assignments
    FOR ALL TO authenticated
    USING (company_id = CAST(current_setting('app.current_company', true) AS INTEGER));

CREATE POLICY company_isolation_policy ON user_effective_permissions
    FOR ALL TO authenticated
    USING (company_id = CAST(current_setting('app.current_company', true) AS INTEGER));

-- Performance Indexes
CREATE INDEX idx_company_users_lookup ON company_users(company_id, user_id);
CREATE INDEX idx_project_assignments_lookup ON project_assignments(company_id, project_id, user_id);
CREATE INDEX idx_role_permissions_lookup ON role_permissions(role_id, permission_id);
CREATE INDEX idx_effective_permissions_lookup ON user_effective_permissions(company_id, user_id);
CREATE INDEX idx_tasks_company_project ON tasks(company_id, project_id);
CREATE INDEX idx_projects_company_status ON projects(company_id, status);

-- Seed Platform Data (Company 0)
INSERT INTO companies (id, name, is_platform) VALUES (0, 'Tower Flow Platform', true);

-- Seed Permission Constants
INSERT INTO permissions (code, name, resource, action, description) VALUES
(1, 'System Admin', 'system', 'admin', 'Full platform administration'),
(2, 'Impersonate', 'system', 'impersonate', 'Impersonate customer accounts'),
(3, 'Global Analytics', 'system', 'analytics', 'View cross-company analytics'),
(10, 'Manage Users', 'users', 'manage', 'Add/remove company users'),
(11, 'View Financials', 'projects', 'view_financials', 'View budget information'),
(12, 'Edit Financials', 'projects', 'edit_financials', 'Modify budget information'),
(13, 'Clone Roles', 'roles', 'clone', 'Clone role templates'),
(20, 'View All Projects', 'projects', 'view_all', 'Access to all company projects'),
(21, 'Manage Tasks', 'tasks', 'manage', 'Create/edit/delete tasks'),
(22, 'Assign Subcontractors', 'tasks', 'assign', 'Assign tasks to subcontractors'),
(30, 'View Assigned Tasks', 'tasks', 'view_assigned', 'View only assigned tasks'),
(31, 'Update Task Status', 'tasks', 'update_status', 'Change task status'),
(32, 'Upload Photos', 'photos', 'upload', 'Upload project photos'),
(40, 'View Project Progress', 'projects', 'view_progress', 'View project status'),
(41, 'View Project Media', 'projects', 'view_media', 'View photos and logs');

-- Seed Role Templates (Company 0)
INSERT INTO roles (id, company_id, name, description, is_template) VALUES
(1, 0, 'Platform Admin', 'App owner/developer with full access', true),
(2, 0, 'Company Admin', 'Company owner with full company access', true),
(3, 0, 'Project Manager', 'Manages projects and tasks', true),
(4, 0, 'Subcontractor', 'External contractor with limited access', true),
(5, 0, 'Client', 'Project stakeholder with read access', true);

-- Seed Template Permissions
INSERT INTO role_permissions (company_id, role_id, permission_id) VALUES
-- Platform Admin (all permissions)
(0, 1, 1), (0, 1, 2), (0, 1, 3), (0, 1, 10), (0, 1, 11), (0, 1, 12), (0, 1, 13),
(0, 1, 20), (0, 1, 21), (0, 1, 22), (0, 1, 30), (0, 1, 31), (0, 1, 32), (0, 1, 40), (0, 1, 41),
-- Company Admin
(0, 2, 10), (0, 2, 11), (0, 2, 12), (0, 2, 13), (0, 2, 20), (0, 2, 21), (0, 2, 22), (0, 2, 32), (0, 2, 40), (0, 2, 41),
-- Project Manager
(0, 3, 20), (0, 3, 21), (0, 3, 22), (0, 3, 32), (0, 3, 40), (0, 3, 41),
-- Subcontractor
(0, 4, 30), (0, 4, 31), (0, 4, 32),
-- Client
(0, 5, 40), (0, 5, 41);

-- Add ABAC rule for Project Manager (can edit only projects they created)
UPDATE role_permissions 
SET abac_rule = '{"condition": "project.created_by == user.id", "resource": "project", "action": "edit"}'
WHERE role_id = 3 AND permission_id = 21;