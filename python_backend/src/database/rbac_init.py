"""
RBAC Database Initialization and Seeding
Sets up the complete RBAC system with predefined roles, permissions, and Company 0.
"""

import asyncio
import os
from typing import List, Dict, Any
import asyncpg

# Get database URL from environment
DATABASE_URL = os.getenv('DATABASE_URL')
if not DATABASE_URL:
    raise ValueError("DATABASE_URL environment variable is required")

# Predefined permission data
PERMISSION_DATA = [
    # Platform Admin (1-9) - Company 0 only
    {"id": 1, "name": "SYSTEM_ADMIN", "resource": "system", "action": "admin", "description": "Full system administration", "category": "platform", "requires_elevation": True},
    {"id": 2, "name": "IMPERSONATE_USER", "resource": "user", "action": "impersonate", "description": "Impersonate any user", "category": "platform", "requires_elevation": True},
    {"id": 3, "name": "MANAGE_COMPANIES", "resource": "company", "action": "manage", "description": "Create and manage companies", "category": "platform", "requires_elevation": False},
    {"id": 4, "name": "PLATFORM_ANALYTICS", "resource": "analytics", "action": "view", "description": "View platform-wide analytics", "category": "platform", "requires_elevation": False},
    
    # Company Admin (10-19)
    {"id": 10, "name": "MANAGE_USERS", "resource": "user", "action": "manage", "description": "Manage company users", "category": "company", "requires_elevation": False},
    {"id": 11, "name": "VIEW_FINANCIALS", "resource": "financial", "action": "view", "description": "View financial data", "category": "company", "requires_elevation": True},
    {"id": 12, "name": "EDIT_FINANCIALS", "resource": "financial", "action": "edit", "description": "Edit financial data", "category": "company", "requires_elevation": True},
    {"id": 13, "name": "CLONE_ROLES", "resource": "role", "action": "clone", "description": "Clone roles from templates", "category": "company", "requires_elevation": False},
    {"id": 14, "name": "COMPANY_SETTINGS", "resource": "settings", "action": "manage", "description": "Manage company settings", "category": "company", "requires_elevation": False},
    {"id": 15, "name": "EXPORT_DATA", "resource": "data", "action": "export", "description": "Export company data", "category": "company", "requires_elevation": False},
    
    # Project Manager (20-29)
    {"id": 20, "name": "VIEW_ALL_PROJECTS", "resource": "project", "action": "view_all", "description": "View all company projects", "category": "project", "requires_elevation": False},
    {"id": 21, "name": "MANAGE_TASKS", "resource": "task", "action": "manage", "description": "Create and manage tasks", "category": "project", "requires_elevation": False},
    {"id": 22, "name": "ASSIGN_SUBCONTRACTORS", "resource": "assignment", "action": "manage", "description": "Assign subcontractors to projects", "category": "project", "requires_elevation": False},
    {"id": 23, "name": "APPROVE_BUDGETS", "resource": "budget", "action": "approve", "description": "Approve project budgets", "category": "project", "requires_elevation": True},
    {"id": 24, "name": "PROJECT_REPORTS", "resource": "report", "action": "generate", "description": "Generate project reports", "category": "project", "requires_elevation": False},
    {"id": 25, "name": "SCHEDULE_MANAGEMENT", "resource": "schedule", "action": "manage", "description": "Manage project schedules", "category": "project", "requires_elevation": False},
    
    # Subcontractor (30-39)
    {"id": 30, "name": "VIEW_ASSIGNED_PROJECTS", "resource": "project", "action": "view_assigned", "description": "View assigned projects only", "category": "project", "requires_elevation": False},
    {"id": 31, "name": "UPDATE_TASK_STATUS", "resource": "task", "action": "update_status", "description": "Update task status", "category": "project", "requires_elevation": False},
    {"id": 32, "name": "UPLOAD_PHOTOS", "resource": "photo", "action": "upload", "description": "Upload project photos", "category": "project", "requires_elevation": False},
    {"id": 33, "name": "VIEW_PROJECT_DOCS", "resource": "document", "action": "view", "description": "View project documents", "category": "project", "requires_elevation": False},
    {"id": 34, "name": "SUBMIT_REPORTS", "resource": "report", "action": "submit", "description": "Submit progress reports", "category": "project", "requires_elevation": False},
    
    # Client (40-49)
    {"id": 40, "name": "VIEW_PROJECT_PROGRESS", "resource": "progress", "action": "view", "description": "View project progress", "category": "project", "requires_elevation": False},
    {"id": 41, "name": "VIEW_PHOTOS", "resource": "photo", "action": "view", "description": "View project photos", "category": "project", "requires_elevation": False},
    {"id": 42, "name": "COMMENT_ON_UPDATES", "resource": "comment", "action": "create", "description": "Comment on project updates", "category": "project", "requires_elevation": False},
    {"id": 43, "name": "REQUEST_CHANGES", "resource": "change_request", "action": "create", "description": "Request project changes", "category": "project", "requires_elevation": False},
    {"id": 44, "name": "DOWNLOAD_REPORTS", "resource": "report", "action": "download", "description": "Download project reports", "category": "project", "requires_elevation": False},
]

# Role templates data
ROLE_TEMPLATE_DATA = [
    {
        "name": "Platform Administrator",
        "description": "Full platform administration access",
        "category": "platform",
        "permission_set": [1, 2, 3, 4],
        "is_system_template": True
    },
    {
        "name": "Company Administrator",
        "description": "Full company administration access",
        "category": "company", 
        "permission_set": [10, 11, 12, 13, 14, 15, 20, 21, 22, 23, 24, 25],
        "is_system_template": True
    },
    {
        "name": "Project Manager",
        "description": "Project management and oversight",
        "category": "company",
        "permission_set": [20, 21, 22, 24, 25],
        "is_system_template": True
    },
    {
        "name": "Subcontractor",
        "description": "Limited access to assigned projects",
        "category": "project",
        "permission_set": [30, 31, 32, 33, 34],
        "is_system_template": True
    },
    {
        "name": "Client",
        "description": "View-only access to project progress",
        "category": "project",
        "permission_set": [40, 41, 42, 43, 44],
        "is_system_template": True
    },
    {
        "name": "Viewer",
        "description": "Read-only access to basic project information",
        "category": "project",
        "permission_set": [40, 41],
        "is_system_template": True
    }
]

class RBACInitializer:
    def __init__(self):
        self.conn = None
    
    async def connect(self):
        """Connect to the database"""
        self.conn = await asyncpg.connect(DATABASE_URL)
    
    async def disconnect(self):
        """Disconnect from the database"""
        if self.conn:
            await self.conn.close()
    
    async def create_rbac_tables(self):
        """Create all RBAC-related tables"""
        print("Creating RBAC tables...")
        
        # Create companies table
        await self.conn.execute("""
            CREATE TABLE IF NOT EXISTS companies (
                id SERIAL PRIMARY KEY,
                name VARCHAR(255) NOT NULL,
                domain VARCHAR(255) UNIQUE,
                status VARCHAR(50) NOT NULL DEFAULT 'active',
                settings JSONB DEFAULT '{}',
                created_at TIMESTAMP DEFAULT NOW(),
                updated_at TIMESTAMP DEFAULT NOW()
            );
            CREATE INDEX IF NOT EXISTS companies_status_idx ON companies(status);
        """)
        
        # Update users table for RBAC
        await self.conn.execute("""
            ALTER TABLE users 
            ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true,
            ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMP,
            ADD COLUMN IF NOT EXISTS mfa_enabled BOOLEAN DEFAULT false;
            
            CREATE INDEX IF NOT EXISTS users_email_idx ON users(email);
            CREATE INDEX IF NOT EXISTS users_active_idx ON users(is_active);
        """)
        
        # Create role templates table
        await self.conn.execute("""
            CREATE TABLE IF NOT EXISTS role_templates (
                id SERIAL PRIMARY KEY,
                name VARCHAR(255) NOT NULL,
                description TEXT,
                category VARCHAR(100) NOT NULL,
                permission_set INTEGER[] NOT NULL,
                is_system_template BOOLEAN DEFAULT false,
                created_at TIMESTAMP DEFAULT NOW(),
                updated_at TIMESTAMP DEFAULT NOW()
            );
            CREATE INDEX IF NOT EXISTS role_templates_category_idx ON role_templates(category);
            CREATE UNIQUE INDEX IF NOT EXISTS role_templates_name_category_idx ON role_templates(name, category);
        """)
        
        # Create roles table
        await self.conn.execute("""
            CREATE TABLE IF NOT EXISTS roles (
                id SERIAL PRIMARY KEY,
                company_id INTEGER REFERENCES companies(id) NOT NULL,
                name VARCHAR(255) NOT NULL,
                description TEXT,
                template_id INTEGER REFERENCES role_templates(id),
                custom_permissions INTEGER[] DEFAULT '{}',
                is_template BOOLEAN DEFAULT false,
                is_active BOOLEAN DEFAULT true,
                created_at TIMESTAMP DEFAULT NOW(),
                updated_at TIMESTAMP DEFAULT NOW()
            );
            CREATE INDEX IF NOT EXISTS roles_company_idx ON roles(company_id);
            CREATE INDEX IF NOT EXISTS roles_template_idx ON roles(template_id);
            CREATE UNIQUE INDEX IF NOT EXISTS roles_company_name_idx ON roles(company_id, name);
        """)
        
        # Create permissions table
        await self.conn.execute("""
            CREATE TABLE IF NOT EXISTS permissions (
                id INTEGER PRIMARY KEY,
                name VARCHAR(255) NOT NULL UNIQUE,
                resource VARCHAR(100) NOT NULL,
                action VARCHAR(100) NOT NULL,
                description TEXT,
                category VARCHAR(100) NOT NULL,
                requires_elevation BOOLEAN DEFAULT false,
                created_at TIMESTAMP DEFAULT NOW()
            );
            CREATE INDEX IF NOT EXISTS permissions_category_idx ON permissions(category);
            CREATE INDEX IF NOT EXISTS permissions_resource_action_idx ON permissions(resource, action);
        """)
        
        # Create company_users table
        await self.conn.execute("""
            CREATE TABLE IF NOT EXISTS company_users (
                id SERIAL PRIMARY KEY,
                company_id INTEGER REFERENCES companies(id) NOT NULL,
                user_id VARCHAR REFERENCES users(id) NOT NULL,
                role_id INTEGER REFERENCES roles(id) NOT NULL,
                granted_by_user_id VARCHAR REFERENCES users(id),
                granted_at TIMESTAMP DEFAULT NOW(),
                expires_at TIMESTAMP,
                is_active BOOLEAN DEFAULT true,
                created_at TIMESTAMP DEFAULT NOW()
            );
            CREATE INDEX IF NOT EXISTS company_users_company_idx ON company_users(company_id);
            CREATE INDEX IF NOT EXISTS company_users_user_idx ON company_users(user_id);
            CREATE INDEX IF NOT EXISTS company_users_role_idx ON company_users(role_id);
            CREATE UNIQUE INDEX IF NOT EXISTS company_users_unique_idx ON company_users(company_id, user_id, role_id);
        """)
        
        # Create role_permissions table
        await self.conn.execute("""
            CREATE TABLE IF NOT EXISTS role_permissions (
                id SERIAL PRIMARY KEY,
                company_id INTEGER REFERENCES companies(id) NOT NULL,
                role_id INTEGER REFERENCES roles(id) NOT NULL,
                permission_id INTEGER REFERENCES permissions(id) NOT NULL,
                abac_rule JSONB,
                granted_by_user_id VARCHAR REFERENCES users(id),
                granted_at TIMESTAMP DEFAULT NOW(),
                expires_at TIMESTAMP,
                is_active BOOLEAN DEFAULT true,
                created_at TIMESTAMP DEFAULT NOW()
            );
            CREATE INDEX IF NOT EXISTS role_permissions_company_idx ON role_permissions(company_id);
            CREATE INDEX IF NOT EXISTS role_permissions_role_idx ON role_permissions(role_id);
            CREATE INDEX IF NOT EXISTS role_permissions_permission_idx ON role_permissions(permission_id);
            CREATE UNIQUE INDEX IF NOT EXISTS role_permissions_unique_idx ON role_permissions(company_id, role_id, permission_id);
        """)
        
        # Create user_effective_permissions table
        await self.conn.execute("""
            CREATE TABLE IF NOT EXISTS user_effective_permissions (
                id SERIAL PRIMARY KEY,
                company_id INTEGER REFERENCES companies(id) NOT NULL,
                user_id VARCHAR REFERENCES users(id) NOT NULL,
                permissions JSONB NOT NULL,
                role_ids INTEGER[] NOT NULL,
                computed_at TIMESTAMP DEFAULT NOW(),
                expires_at TIMESTAMP NOT NULL,
                updated_at TIMESTAMP DEFAULT NOW()
            );
            CREATE INDEX IF NOT EXISTS user_effective_permissions_lookup_idx ON user_effective_permissions(company_id, user_id);
            CREATE INDEX IF NOT EXISTS user_effective_permissions_expires_idx ON user_effective_permissions(expires_at);
            CREATE UNIQUE INDEX IF NOT EXISTS user_effective_permissions_unique_idx ON user_effective_permissions(company_id, user_id);
        """)
        
        # Create project_assignments table
        await self.conn.execute("""
            CREATE TABLE IF NOT EXISTS project_assignments (
                id SERIAL PRIMARY KEY,
                company_id INTEGER REFERENCES companies(id) NOT NULL,
                project_id INTEGER NOT NULL,
                user_id VARCHAR REFERENCES users(id) NOT NULL,
                role_id INTEGER REFERENCES roles(id) NOT NULL,
                permissions INTEGER[] DEFAULT '{}',
                granted_by_user_id VARCHAR REFERENCES users(id),
                granted_at TIMESTAMP DEFAULT NOW(),
                expires_at TIMESTAMP,
                is_active BOOLEAN DEFAULT true,
                created_at TIMESTAMP DEFAULT NOW()
            );
            CREATE INDEX IF NOT EXISTS project_assignments_company_idx ON project_assignments(company_id);
            CREATE INDEX IF NOT EXISTS project_assignments_project_idx ON project_assignments(project_id);
            CREATE INDEX IF NOT EXISTS project_assignments_user_idx ON project_assignments(user_id);
            CREATE UNIQUE INDEX IF NOT EXISTS project_assignments_unique_idx ON project_assignments(company_id, project_id, user_id);
        """)
        
        # Create audit_logs table
        await self.conn.execute("""
            CREATE TABLE IF NOT EXISTS audit_logs (
                id SERIAL PRIMARY KEY,
                company_id INTEGER REFERENCES companies(id) NOT NULL,
                user_id VARCHAR REFERENCES users(id) NOT NULL,
                action VARCHAR(100) NOT NULL,
                resource VARCHAR(100) NOT NULL,
                resource_id VARCHAR,
                old_values JSONB,
                new_values JSONB,
                ip_address VARCHAR(45),
                user_agent TEXT,
                session_id VARCHAR,
                created_at TIMESTAMP DEFAULT NOW()
            );
            CREATE INDEX IF NOT EXISTS audit_logs_company_idx ON audit_logs(company_id);
            CREATE INDEX IF NOT EXISTS audit_logs_user_idx ON audit_logs(user_id);
            CREATE INDEX IF NOT EXISTS audit_logs_action_idx ON audit_logs(action);
            CREATE INDEX IF NOT EXISTS audit_logs_created_idx ON audit_logs(created_at);
        """)
        
        print("RBAC tables created successfully!")
    
    async def create_rls_policies(self):
        """Create Row Level Security policies"""
        print("Creating RLS policies...")
        
        # Enable RLS on all company-scoped tables
        tables_with_rls = [
            'roles', 'company_users', 'role_permissions', 
            'user_effective_permissions', 'project_assignments', 'audit_logs'
        ]
        
        for table in tables_with_rls:
            # Validate table name is from our allowed list for extra safety
            if table not in ['roles', 'company_users', 'role_permissions', 
                           'user_effective_permissions', 'project_assignments', 'audit_logs']:
                raise ValueError(f"Invalid table name for RLS policy: {table}")
            
            # Use quoted identifier to prevent any potential issues with table names
            await self.conn.execute(f'ALTER TABLE "{table}" ENABLE ROW LEVEL SECURITY;')
            
            # Create policy that filters by company_id
            policy_name = f"{table}_company_isolation"
            await self.conn.execute(f"""
                DROP POLICY IF EXISTS "{policy_name}" ON "{table}";
                CREATE POLICY "{policy_name}" ON "{table}"
                    FOR ALL
                    USING (company_id::text = current_setting('app.current_company', true));
            """)
        
        print("RLS policies created successfully!")
    
    async def seed_permissions(self):
        """Seed the permissions table with predefined permissions"""
        print("Seeding permissions...")
        
        for perm in PERMISSION_DATA:
            await self.conn.execute("""
                INSERT INTO permissions (id, name, resource, action, description, category, requires_elevation)
                VALUES ($1, $2, $3, $4, $5, $6, $7)
                ON CONFLICT (id) DO UPDATE SET
                    name = EXCLUDED.name,
                    resource = EXCLUDED.resource,
                    action = EXCLUDED.action,
                    description = EXCLUDED.description,
                    category = EXCLUDED.category,
                    requires_elevation = EXCLUDED.requires_elevation;
            """, perm["id"], perm["name"], perm["resource"], perm["action"], 
                 perm["description"], perm["category"], perm["requires_elevation"])
        
        print(f"Seeded {len(PERMISSION_DATA)} permissions!")
    
    async def seed_role_templates(self):
        """Seed the role templates table"""
        print("Seeding role templates...")
        
        for template in ROLE_TEMPLATE_DATA:
            await self.conn.execute("""
                INSERT INTO role_templates (name, description, category, permission_set, is_system_template)
                VALUES ($1, $2, $3, $4, $5)
                ON CONFLICT (name, category) DO UPDATE SET
                    description = EXCLUDED.description,
                    permission_set = EXCLUDED.permission_set,
                    is_system_template = EXCLUDED.is_system_template,
                    updated_at = NOW();
            """, template["name"], template["description"], template["category"],
                 template["permission_set"], template["is_system_template"])
        
        print(f"Seeded {len(ROLE_TEMPLATE_DATA)} role templates!")
    
    async def create_company_0(self):
        """Create Company 0 (Platform) if it doesn't exist"""
        print("Creating Company 0 (Platform)...")
        
        # Insert Company 0
        await self.conn.execute("""
            INSERT INTO companies (id, name, domain, status, settings)
            VALUES (0, 'Platform Administration', 'platform.towerflow.com', 'active', '{"isPlatform": true}')
            ON CONFLICT (id) DO UPDATE SET
                name = EXCLUDED.name,
                domain = EXCLUDED.domain,
                status = EXCLUDED.status,
                settings = EXCLUDED.settings,
                updated_at = NOW();
        """)
        
        # Create platform admin role for Company 0
        platform_admin_template = await self.conn.fetchrow(
            "SELECT id FROM role_templates WHERE name = 'Platform Administrator'"
        )
        
        if platform_admin_template:
            await self.conn.execute("""
                INSERT INTO roles (company_id, name, description, template_id, is_active)
                VALUES (0, 'Platform Administrator', 'Full platform administration access', $1, true)
                ON CONFLICT (company_id, name) DO UPDATE SET
                    description = EXCLUDED.description,
                    template_id = EXCLUDED.template_id,
                    is_active = EXCLUDED.is_active,
                    updated_at = NOW();
            """, platform_admin_template['id'])
        
        print("Company 0 created successfully!")
    
    async def create_demo_company(self):
        """Create a demo company with sample data"""
        print("Creating demo company...")
        
        # Create TowerFlow Construction Company
        company_id = await self.conn.fetchval("""
            INSERT INTO companies (name, domain, status, settings)
            VALUES ('TowerFlow Construction', 'towerflow.construction', 'active', '{"mfaRequired": false}')
            ON CONFLICT (domain) DO UPDATE SET
                name = EXCLUDED.name,
                status = EXCLUDED.status,
                settings = EXCLUDED.settings,
                updated_at = NOW()
            RETURNING id;
        """)
        
        # Create roles based on templates
        templates = await self.conn.fetch("SELECT * FROM role_templates WHERE is_system_template = true")
        
        for template in templates:
            if template['category'] != 'platform':  # Skip platform-only templates
                await self.conn.execute("""
                    INSERT INTO roles (company_id, name, description, template_id, is_active)
                    VALUES ($1, $2, $3, $4, true)
                    ON CONFLICT (company_id, name) DO UPDATE SET
                        description = EXCLUDED.description,
                        template_id = EXCLUDED.template_id,
                        updated_at = NOW();
                """, company_id, template['name'], template['description'], template['id'])
        
        print(f"Demo company created with ID: {company_id}")
        return company_id
    
    async def initialize_full_rbac(self):
        """Initialize the complete RBAC system"""
        try:
            await self.connect()
            
            print("🚀 Starting RBAC initialization...")
            
            # Create all tables
            await self.create_rbac_tables()
            
            # Create RLS policies
            await self.create_rls_policies()
            
            # Seed permissions
            await self.seed_permissions()
            
            # Seed role templates
            await self.seed_role_templates()
            
            # Create Company 0
            await self.create_company_0()
            
            # Create demo company
            demo_company_id = await self.create_demo_company()
            
            print("✅ RBAC initialization completed successfully!")
            print(f"📋 Summary:")
            print(f"   - {len(PERMISSION_DATA)} permissions created")
            print(f"   - {len(ROLE_TEMPLATE_DATA)} role templates created")
            print(f"   - Company 0 (Platform) initialized")
            print(f"   - Demo company created (ID: {demo_company_id})")
            print(f"   - RLS policies enabled for data isolation")
            
            return True
            
        except Exception as e:
            print(f"❌ Error during RBAC initialization: {e}")
            return False
        finally:
            await self.disconnect()

async def main():
    """Main function to run RBAC initialization"""
    initializer = RBACInitializer()
    success = await initializer.initialize_full_rbac()
    
    if success:
        print("\n🎉 RBAC system is ready!")
        print("Next steps:")
        print("1. Assign users to Company 0 for platform administration")
        print("2. Create company-specific roles and user assignments")
        print("3. Configure project-specific access as needed")
    else:
        print("\n💥 RBAC initialization failed. Check the logs above.")

if __name__ == "__main__":
    asyncio.run(main())