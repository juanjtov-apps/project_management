import {
  users,
  type User,
  type UpsertUser,
  type InsertUser,
} from "@shared/schema";
import { db } from "./db";
import { eq } from "drizzle-orm";

// Interface for storage operations
export interface IStorage {
  // User operations
  // (IMPORTANT) these user operations are mandatory for Replit Auth.
  getUser(id: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;
  
  // Additional user operations for manual auth
  getUserByEmail(email: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  // RBAC operations
  getCompanies(): Promise<any[]>;
  createCompany(company: any): Promise<any>;
  updateCompany(id: string, data: any): Promise<any>;
  deleteCompany(id: string): Promise<boolean>;
  getUsers(): Promise<any[]>;
  createRBACUser(user: any): Promise<any>;
  updateUser(id: string, data: any): Promise<any>;
  deleteUser(id: string): Promise<boolean>;
  getRoles(): Promise<any[]>;
  getPermissions(): Promise<any[]>;
  
  // Projects operations
  getProjects(): Promise<any[]>;
  createProject(project: any): Promise<any>;
  updateProject(id: string, data: any): Promise<any>;
  deleteProject(id: string): Promise<boolean>;
  
  // Task operations
  assignTask(taskId: string, assigneeId: string | null): Promise<any>;
}

export class DatabaseStorage implements IStorage {
  // User operations
  // (IMPORTANT) these user operations are mandatory for Replit Auth.

  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(userData)
      .onConflictDoUpdate({
        target: users.id,
        set: {
          ...userData,
          updatedAt: new Date(),
        },
      })
      .returning();
    return user;
  }

  // Additional user operations for manual auth
  async getUserByEmail(email: string): Promise<User | undefined> {
    // Use direct SQL query to ensure we get the password field for authentication
    const pg = await import('pg');
    const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
    try {
      const result = await pool.query(`
        SELECT id, email, username, name, first_name, last_name, role, 
               company_id, is_active, created_at, password
        FROM users 
        WHERE email = $1
      `, [email]);
      
      if (result.rows.length === 0) {
        return undefined;
      }
      
      const row = result.rows[0];
      return {
        id: row.id,
        email: row.email,
        username: row.username,
        name: row.name,
        first_name: row.first_name,
        last_name: row.last_name,
        role: row.role,
        company_id: row.company_id,
        is_active: row.is_active,
        created_at: row.created_at,
        password: row.password // Include password for authentication
      } as any;
    } finally {
      await pool.end();
    }
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user;
  }

  async createUser(userData: InsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(userData)
      .returning();
    return user;
  }

  // RBAC operations using direct database queries
  async getCompanies(): Promise<any[]> {
    const pg = await import('pg');
    const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
    try {
      const result = await pool.query(`
        SELECT id, name, domain, status, settings, created_at, updated_at
        FROM companies 
        ORDER BY name
      `);
      return result.rows.map(row => ({
        id: row.id.toString(),
        name: row.name,
        domain: row.domain,
        status: row.status || 'active',
        settings: row.settings || {},
        created_at: row.created_at,
        is_active: row.status === 'active'
      }));
    } finally {
      await pool.end();
    }
  }

  async createCompany(companyData: any): Promise<any> {
    const pg = await import('pg');
    const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
    try {
      const { name, domain, status, settings } = companyData;
      const result = await pool.query(`
        INSERT INTO companies (name, domain, status, settings, created_at, updated_at)
        VALUES ($1, $2, $3, $4, NOW(), NOW())
        RETURNING id, name, domain, status, settings, created_at, updated_at
      `, [name, domain, status, JSON.stringify(settings)]);
      
      const row = result.rows[0];
      return {
        id: row.id.toString(),
        name: row.name,
        domain: row.domain,
        status: row.status,
        settings: row.settings,
        created_at: row.created_at,
        is_active: row.status === 'active'
      };
    } finally {
      await pool.end();
    }
  }

  async updateCompany(id: string, data: any): Promise<any> {
    const pg = await import('pg');
    const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
    try {
      const { name, domain, status, settings } = data;
      const result = await pool.query(`
        UPDATE companies 
        SET name = $1, domain = $2, status = $3, settings = $4, updated_at = NOW()
        WHERE id = $5
        RETURNING id, name, domain, status, settings, created_at, updated_at
      `, [name, domain, status, JSON.stringify(settings), parseInt(id)]);
      
      if (result.rows.length === 0) return null;
      
      const row = result.rows[0];
      return {
        id: row.id.toString(),
        name: row.name,
        domain: row.domain,
        status: row.status,
        settings: row.settings,
        created_at: row.created_at,
        is_active: row.status === 'active'
      };
    } finally {
      await pool.end();
    }
  }

  async deleteCompany(id: string): Promise<boolean> {
    const pg = await import('pg');
    const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
    try {
      const result = await pool.query('DELETE FROM companies WHERE id = $1', [parseInt(id)]);
      return result.rowCount > 0;
    } finally {
      await pool.end();
    }
  }

  async getUsers(): Promise<any[]> {
    const pg = await import('pg');
    const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
    try {
      const result = await pool.query(`
        SELECT u.id, u.email, u.first_name, u.last_name, u.is_active, u.last_login_at, u.mfa_enabled,
               u.created_at, u.username, u.name, u.company_id,
               COALESCE(u.role, 'User') as role_name,
               CASE 
                  WHEN u.role = 'admin' THEN 'Platform Administration'
                  WHEN u.role = 'manager' THEN 'Management Team'
                  WHEN u.role = 'crew' THEN 'Construction Crew'
                  WHEN u.role = 'subcontractor' THEN 'Subcontractors'
                  ELSE 'General Users'
               END as company_name
        FROM users u 
        ORDER BY u.email
      `);
      return result.rows.map(row => ({
        id: row.id,
        name: row.name || `${row.first_name || ''} ${row.last_name || ''}`.trim() || row.email,
        email: row.email,
        first_name: row.first_name,
        last_name: row.last_name,
        companyId: row.company_id || '0', // Use actual company_id from database
        role_id: '1',
        is_active: row.is_active,
        created_at: row.created_at,
        last_login: row.last_login_at,
        role_name: row.role_name,
        company_name: row.company_name,
        username: row.username || row.email,
        isActive: row.is_active
      }));
    } finally {
      await pool.end();
    }
  }

  async createRBACUser(userData: any): Promise<any> {
    const pg = await import('pg');
    const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
    try {
      const { 
        email, 
        first_name, 
        last_name, 
        name,
        company_id,
        role_id,
        password,
        is_active = true, 
        username 
      } = userData;
      
      if (!email) {
        throw new Error('Email is required');
      }
      if (!company_id) {
        throw new Error('Company is required');
      }
      if (!role_id) {
        throw new Error('Role is required');
      }

      const userUsername = username || email;
      const userName = name || `${first_name || ''} ${last_name || ''}`.trim() || email;
      const userPassword = password || 'password123';

      // Hash the password before storing
      const bcrypt = await import('bcrypt');
      const saltRounds = 10;
      const hashedPassword = await bcrypt.hash(userPassword, saltRounds);

      // Get role name from role_id
      const roleResult = await pool.query('SELECT name FROM roles WHERE id = $1', [role_id]);
      if (roleResult.rows.length === 0) {
        throw new Error('Invalid role selected');
      }
      const roleName = roleResult.rows[0].name;

      // Map role names to simple role codes for backwards compatibility
      const roleMapping: any = {
        'Platform Administrator': 'admin',
        'Company Administrator': 'admin', 
        'Project Manager': 'manager',
        'Office Manager': 'manager',
        'Client': 'crew',
        'Subcontractor': 'subcontractor',
        'Viewer': 'crew'
      };
      const userRole = roleMapping[roleName] || 'crew';
      
      const result = await pool.query(`
        INSERT INTO users (
          email, first_name, last_name, username, name, role, 
          company_id, is_active, password, created_at, updated_at
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), NOW())
        RETURNING id, email, first_name, last_name, username, name, role, company_id, is_active, created_at
      `, [
        email, 
        first_name, 
        last_name, 
        userUsername,
        userName,
        userRole,
        company_id,
        is_active,
        hashedPassword
      ]);
      
      const row = result.rows[0];

      // Get company name for response
      const companyResult = await pool.query('SELECT name FROM companies WHERE id = $1', [company_id]);
      const companyName = companyResult.rows[0]?.name || 'Unknown Company';

      return {
        id: row.id,
        username: row.username,
        name: row.name,
        email: row.email,
        role: row.role,
        isActive: row.is_active,
        createdAt: row.created_at
      };
    } finally {
      await pool.end();
    }
  }

  async updateUser(id: string, data: any): Promise<any> {
    const pg = await import('pg');
    const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
    try {
      const { email, first_name, last_name, role, is_active, username, password } = data;
      const userName = `${first_name || ''} ${last_name || ''}`.trim() || email;
      
      let queryText;
      let queryParams;
      
      if (password && password.trim() !== '') {
        // Hash the new password if provided
        const bcrypt = await import('bcrypt');
        const saltRounds = 10;
        const hashedPassword = await bcrypt.hash(password, saltRounds);
        
        queryText = `
          UPDATE users 
          SET email = $1, first_name = $2, last_name = $3, role = $4, is_active = $5, updated_at = NOW(), name = $6, username = $7, password = $8
          WHERE id = $9
          RETURNING id, email, first_name, last_name, username, role, is_active, created_at, name
        `;
        queryParams = [email, first_name, last_name, role, is_active, userName, username || email.split('@')[0], hashedPassword, id];
      } else {
        // Don't update password if not provided
        queryText = `
          UPDATE users 
          SET email = $1, first_name = $2, last_name = $3, role = $4, is_active = $5, updated_at = NOW(), name = $6, username = $7
          WHERE id = $8
          RETURNING id, email, first_name, last_name, username, role, is_active, created_at, name
        `;
        queryParams = [email, first_name, last_name, role, is_active, userName, username || email.split('@')[0], id];
      }
      
      const result = await pool.query(queryText, queryParams);
      
      if (result.rows.length === 0) return null;
      
      const row = result.rows[0];

      return {
        id: row.id,
        name: row.name || `${row.first_name || ''} ${row.last_name || ''}`.trim() || row.email,
        email: row.email,
        first_name: row.first_name,
        last_name: row.last_name,
        company_id: '0', // Default since no company relationship exists
        role_id: '1',
        is_active: row.is_active,
        created_at: row.created_at,
        role_name: row.role,
        company_name: 
          row.role === 'admin' ? 'Platform Administration' :
          row.role === 'manager' ? 'Management Team' :
          row.role === 'crew' ? 'Construction Crew' :
          row.role === 'subcontractor' ? 'Subcontractors' :
          'General Users',
        username: row.username,
        isActive: row.is_active
      };
    } finally {
      await pool.end();
    }
  }

  async deleteUser(id: string): Promise<boolean> {
    const pg = await import('pg');
    const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
    try {
      const result = await pool.query('DELETE FROM users WHERE id = $1', [id]);
      return result.rowCount > 0;
    } finally {
      await pool.end();
    }
  }

  async getRoles(): Promise<any[]> {
    const pg = await import('pg');
    const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
    try {
      const result = await pool.query(`
        SELECT r.id, r.name, r.description, r.company_id, r.is_template, r.created_at, r.updated_at,
               ARRAY_AGG(DISTINCT rp.permission_id) FILTER (WHERE rp.permission_id IS NOT NULL) as permissions
        FROM roles r
        LEFT JOIN role_permissions rp ON r.id = rp.role_id
        GROUP BY r.id, r.name, r.description, r.company_id, r.is_template, r.created_at, r.updated_at
        ORDER BY r.company_id NULLS FIRST, r.name
      `);
      
      return result.rows.map(row => ({
        id: row.id.toString(),
        name: row.name,
        description: row.description,
        company_id: row.company_id?.toString() || null,
        permissions: row.permissions || [],
        is_template: row.is_template || false,
        created_at: row.created_at,
        updated_at: row.updated_at
      }));
    } finally {
      await pool.end();
    }
  }

  async createRole(roleData: any): Promise<any> {
    // For now, return a mock created role since we don't have a roles table
    const newRole = {
      id: String(Date.now()),
      name: roleData.name,
      description: roleData.description,
      company_id: roleData.company_id,
      permissions: roleData.permissions || [],
      is_template: roleData.is_template || false,
      created_at: new Date(),
      updated_at: new Date()
    };
    
    console.log('✅ NODE.JS SUCCESS: Mock role created:', newRole);
    return newRole;
  }

  async updateRole(id: string, roleData: any): Promise<any> {
    // For now, return a mock updated role since we don't have a roles table
    const updatedRole = {
      id: id,
      name: roleData.name,
      description: roleData.description,
      company_id: roleData.company_id,
      permissions: roleData.permissions || [],
      is_template: roleData.is_template || false,
      created_at: new Date(Date.now() - 86400000), // Yesterday
      updated_at: new Date()
    };
    
    console.log('✅ NODE.JS SUCCESS: Mock role updated:', updatedRole);
    return updatedRole;
  }

  async deleteRole(id: string): Promise<boolean> {
    // For now, return success since we don't have a roles table
    console.log(`✅ NODE.JS SUCCESS: Mock role ${id} deleted`);
    return true;
  }

  async getPermissions(): Promise<any[]> {
    return [
      { id: '1', name: 'Create Projects', description: 'Can create new projects', category: 'project', resource_type: 'project', action: 'create', created_at: new Date() },
      { id: '2', name: 'Manage Users', description: 'Can manage users', category: 'user', resource_type: 'user', action: 'manage', created_at: new Date() },
      { id: '3', name: 'View Reports', description: 'Can view reports', category: 'report', resource_type: 'report', action: 'read', created_at: new Date() }
    ];
  }

  async getProjects(): Promise<any[]> {
    const pg = await import('pg');
    const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
    try {
      const result = await pool.query(`
        SELECT p.id, p.name, p.description, p.location, p.status, p.progress, p.due_date, 
               p.created_at, p.company_id
        FROM projects p 
        ORDER BY p.name
      `);
      return result.rows.map(row => ({
        id: row.id,
        name: row.name,
        description: row.description,
        location: row.location,
        status: row.status,
        progress: row.progress || 0,
        dueDate: row.due_date,
        createdAt: row.created_at,
        companyId: row.company_id || '0'
      }));
    } finally {
      await pool.end();
    }
  }

  async createProject(projectData: any): Promise<any> {
    const pg = await import('pg');
    const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
    try {
      const { name, description, location, status = 'active', dueDate, companyId } = projectData;
      
      if (!name) {
        throw new Error('Project name is required');
      }

      const result = await pool.query(`
        INSERT INTO projects (name, description, location, status, progress, due_date, created_at, company_id)
        VALUES ($1, $2, $3, $4, 0, $5, NOW(), $6)
        RETURNING id, name, description, location, status, progress, due_date, created_at, company_id
      `, [name, description, location, status, dueDate, companyId || '0']);
      
      const row = result.rows[0];

      return {
        id: row.id,
        name: row.name,
        description: row.description,
        location: row.location,
        status: row.status,
        progress: row.progress || 0,
        dueDate: row.due_date,
        createdAt: row.created_at,
        companyId: row.company_id || '0',
        companyId: row.company_id || '0'
      };
    } finally {
      await pool.end();
    }
  }

  async updateProject(id: string, data: any): Promise<any> {
    const pg = await import('pg');
    const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
    try {
      const { name, description, location, status, progress, dueDate } = data;
      const result = await pool.query(`
        UPDATE projects 
        SET name = $1, description = $2, location = $3, status = $4, progress = $5, due_date = $6
        WHERE id = $7
        RETURNING id, name, description, location, status, progress, due_date, created_at
      `, [name, description, location, status, progress, dueDate, id]);
      
      if (result.rows.length === 0) return null;
      
      const row = result.rows[0];

      return {
        id: row.id,
        name: row.name,
        description: row.description,
        location: row.location,
        status: row.status,
        progress: row.progress || 0,
        dueDate: row.due_date,
        createdAt: row.created_at
      };
    } finally {
      await pool.end();
    }
  }

  async deleteProject(id: string): Promise<boolean> {
    const pg = await import('pg');
    const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
    try {
      // Start transaction for atomic operation
      await pool.query('BEGIN');
      
      // 1. Delete schedule changes related to tasks in this project
      await pool.query(`
        DELETE FROM schedule_changes 
        WHERE task_id IN (SELECT id FROM tasks WHERE project_id = $1)
      `, [id]);
      
      // 2. Delete subcontractor assignments for this project
      await pool.query('DELETE FROM subcontractor_assignments WHERE project_id = $1', [id]);
      
      // 3. Delete all tasks associated with this project
      await pool.query('DELETE FROM tasks WHERE project_id = $1', [id]);
      
      // 4. Delete any photos associated with this project
      await pool.query('DELETE FROM photos WHERE project_id = $1', [id]);
      
      // 5. Delete any project logs associated with this project
      await pool.query('DELETE FROM project_logs WHERE project_id = $1', [id]);
      
      // 6. Finally delete the project
      const result = await pool.query('DELETE FROM projects WHERE id = $1', [id]);
      
      // Commit transaction
      await pool.query('COMMIT');
      return result.rowCount > 0;
    } catch (error) {
      // Rollback on error
      await pool.query('ROLLBACK');
      throw error;
    } finally {
      await pool.end();
    }
  }

  // Task CRUD operations
  async getTasks(): Promise<any[]> {
    const pg = await import('pg');
    const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
    try {
      const result = await pool.query(`
        SELECT t.id, t.title, t.description, t.project_id, t.assignee_id, t.status, 
               t.priority, t.due_date, t.completed_at, t.created_at, t.category, 
               t.is_milestone, t.estimated_hours,
               p.name as project_name, p.company_id,
               u.name as assignee_name
        FROM tasks t 
        LEFT JOIN projects p ON t.project_id = p.id
        LEFT JOIN users u ON t.assignee_id = u.id
        ORDER BY t.created_at DESC
      `);
      return result.rows.map(row => ({
        id: row.id,
        title: row.title,
        description: row.description,
        projectId: row.project_id,
        projectName: row.project_name,
        assigneeId: row.assignee_id,
        assigneeName: row.assignee_name,
        status: row.status,
        priority: row.priority,
        dueDate: row.due_date,
        completedAt: row.completed_at,
        createdAt: row.created_at,
        category: row.category,
        isMilestone: row.is_milestone,
        estimatedHours: row.estimated_hours,
        companyId: row.company_id || '0' // Inherit company from project
      }));
    } finally {
      await pool.end();
    }
  }

  async createTask(taskData: any): Promise<any> {
    const pg = await import('pg');
    const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
    try {
      const { 
        title, 
        description, 
        projectId, 
        assigneeId, 
        status = 'pending',
        priority = 'medium',
        dueDate,
        category = 'General',
        isMilestone = false,
        estimatedHours 
      } = taskData;
      
      if (!title) {
        throw new Error('Task title is required');
      }

      const result = await pool.query(`
        INSERT INTO tasks (title, description, project_id, assignee_id, status, priority, 
                          due_date, category, is_milestone, estimated_hours, created_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW())
        RETURNING id, title, description, project_id, assignee_id, status, priority, 
                  due_date, completed_at, created_at, category, is_milestone, estimated_hours
      `, [title, description, projectId, assigneeId, status, priority, dueDate, category, isMilestone, estimatedHours]);
      
      const row = result.rows[0];

      return {
        id: row.id,
        title: row.title,
        description: row.description,
        projectId: row.project_id,
        assigneeId: row.assignee_id,
        status: row.status,
        priority: row.priority,
        dueDate: row.due_date,
        completedAt: row.completed_at,
        createdAt: row.created_at,
        category: row.category,
        isMilestone: row.is_milestone,
        estimatedHours: row.estimated_hours
      };
    } finally {
      await pool.end();
    }
  }

  async updateTask(id: string, data: any): Promise<any> {
    const pg = await import('pg');
    const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
    try {
      // Build dynamic SQL based on provided fields
      const fields = [];
      const values = [];
      let paramIndex = 1;

      // Only update fields that are actually provided
      if (data.title !== undefined) {
        fields.push(`title = $${paramIndex++}`);
        values.push(data.title);
      }
      if (data.description !== undefined) {
        fields.push(`description = $${paramIndex++}`);
        values.push(data.description);
      }
      if (data.projectId !== undefined) {
        fields.push(`project_id = $${paramIndex++}`);
        values.push(data.projectId);
      }
      if (data.assigneeId !== undefined) {
        fields.push(`assignee_id = $${paramIndex++}`);
        values.push(data.assigneeId);
      }
      if (data.status !== undefined) {
        fields.push(`status = $${paramIndex++}`);
        values.push(data.status);
        // Auto-set completed_at when status changes to completed
        fields.push(`completed_at = CASE WHEN $${paramIndex-1} = 'completed' AND completed_at IS NULL THEN NOW() ELSE completed_at END`);
      }
      if (data.priority !== undefined) {
        fields.push(`priority = $${paramIndex++}`);
        values.push(data.priority);
      }
      if (data.dueDate !== undefined) {
        fields.push(`due_date = $${paramIndex++}`);
        values.push(data.dueDate);
      }
      if (data.category !== undefined) {
        fields.push(`category = $${paramIndex++}`);
        values.push(data.category);
      }
      if (data.isMilestone !== undefined) {
        fields.push(`is_milestone = $${paramIndex++}`);
        values.push(data.isMilestone);
      }
      if (data.estimatedHours !== undefined) {
        fields.push(`estimated_hours = $${paramIndex++}`);
        values.push(data.estimatedHours);
      }

      if (fields.length === 0) {
        throw new Error('No fields to update');
      }

      values.push(id); // Add ID as last parameter
      
      const result = await pool.query(`
        UPDATE tasks 
        SET ${fields.join(', ')}
        WHERE id = $${paramIndex}
        RETURNING id, title, description, project_id, assignee_id, status, priority, 
                  due_date, completed_at, created_at, category, is_milestone, estimated_hours
      `, values);
      
      if (result.rows.length === 0) return null;
      
      const row = result.rows[0];

      return {
        id: row.id,
        title: row.title,
        description: row.description,
        projectId: row.project_id,
        assigneeId: row.assignee_id,
        status: row.status,
        priority: row.priority,
        dueDate: row.due_date,
        completedAt: row.completed_at,
        createdAt: row.created_at,
        category: row.category,
        isMilestone: row.is_milestone,
        estimatedHours: row.estimated_hours
      };
    } finally {
      await pool.end();
    }
  }

  async deleteTask(id: string): Promise<boolean> {
    const pg = await import('pg');
    const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
    try {
      const result = await pool.query('DELETE FROM tasks WHERE id = $1', [id]);
      return result.rowCount > 0;
    } finally {
      await pool.end();
    }
  }

  async assignTask(taskId: string, assigneeId: string | null): Promise<any> {
    const pg = await import('pg');
    const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
    try {
      const result = await pool.query(`
        UPDATE tasks 
        SET assignee_id = $1
        WHERE id = $2
        RETURNING id, title, description, project_id, assignee_id, status, priority, 
                  due_date, completed_at, created_at, category, is_milestone, estimated_hours
      `, [assigneeId, taskId]);
      
      if (result.rows.length === 0) return null;
      
      const row = result.rows[0];
      return {
        id: row.id,
        title: row.title,
        description: row.description,
        projectId: row.project_id,
        assigneeId: row.assignee_id,
        status: row.status,
        priority: row.priority,
        dueDate: row.due_date,
        completedAt: row.completed_at,
        createdAt: row.created_at,
        category: row.category,
        isMilestone: row.is_milestone,
        estimatedHours: row.estimated_hours
      };
    } finally {
      await pool.end();
    }
  }

  // User CRUD operations
  async getUsers(): Promise<any[]> {
    const pg = await import('pg');
    const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
    try {
      const result = await pool.query(`
        SELECT u.id, u.username, u.name, u.email, u.role, u.is_active, u.created_at, 
               u.company_id, c.name as company_name
        FROM users u 
        LEFT JOIN companies c ON u.company_id = c.id::text
        ORDER BY c.name, u.name
      `);
      return result.rows.map(row => ({
        id: row.id,
        username: row.username,
        name: row.name,
        email: row.email,
        role: row.role,
        role_id: row.role === 'admin' ? '1' : row.role === 'manager' ? '2' : '3',
        isActive: row.is_active,
        is_active: row.is_active,
        createdAt: row.created_at,
        company_id: row.company_id || '0',
        company_name: row.company_name || 'Platform Administration'
      }));
    } finally {
      await pool.end();
    }
  }

  async createUser(userData: any): Promise<any> {
    const pg = await import('pg');
    const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
    try {
      const { username, name, email, role = 'crew', password, isActive = true } = userData;
      
      if (!username || !name || !email) {
        throw new Error('Username, name, and email are required');
      }

      // Hash password if provided
      let hashedPassword = null;
      if (password) {
        const bcrypt = await import('bcrypt');
        hashedPassword = await bcrypt.hash(password, 10);
      }

      const result = await pool.query(`
        INSERT INTO users (username, name, email, role, password, is_active, created_at)
        VALUES ($1, $2, $3, $4, $5, $6, NOW())
        RETURNING id, username, name, email, role, is_active, created_at
      `, [username, name, email, role, hashedPassword, isActive]);
      
      const row = result.rows[0];

      return {
        id: row.id,
        username: row.username,
        name: row.name,
        email: row.email,
        role: row.role,
        isActive: row.is_active,
        createdAt: row.created_at
      };
    } finally {
      await pool.end();
    }
  }

  async updateUser(id: string, data: any): Promise<any> {
    const pg = await import('pg');
    const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
    try {
      const { username, name, email, role, role_id, is_active, isActive } = data;
      
      // Handle role mapping - frontend sends role_id but we need role for the database
      let finalRole = role;
      if (role_id && !role) {
        // Map role_id to role name
        const roleMapping = { '1': 'admin', '2': 'manager', '3': 'crew' };
        finalRole = roleMapping[role_id] || 'crew';
      }
      
      const finalIsActive = is_active !== undefined ? is_active : isActive;
      
      const result = await pool.query(`
        UPDATE users 
        SET username = $1, name = $2, email = $3, role = $4, is_active = $5, updated_at = NOW()
        WHERE id = $6
        RETURNING id, username, name, email, role, is_active, created_at, company_id
      `, [username, name, email, finalRole, finalIsActive, id]);
      
      if (result.rows.length === 0) return null;
      
      const row = result.rows[0];
      return {
        id: row.id,
        username: row.username,
        name: row.name,
        email: row.email,
        role: row.role,
        isActive: row.is_active,
        createdAt: row.created_at,
        companyId: row.company_id || '0'
      };
    } finally {
      await pool.end();
    }
  }

  async deleteUser(id: string): Promise<boolean> {
    const pg = await import('pg');
    const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
    try {
      const result = await pool.query('DELETE FROM users WHERE id = $1', [id]);
      return result.rowCount > 0;
    } finally {
      await pool.end();
    }
  }

  // Company CRUD operations
  async getCompanies(): Promise<any[]> {
    const pg = await import('pg');
    const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
    try {
      const result = await pool.query(`
        SELECT id, name, domain, status, settings, created_at 
        FROM companies 
        ORDER BY name
      `);
      return result.rows.map(row => ({
        id: row.id,
        name: row.name,
        domain: row.domain,
        status: row.status,
        settings: row.settings,
        createdAt: row.created_at
      }));
    } finally {
      await pool.end();
    }
  }

  async createCompany(companyData: any): Promise<any> {
    const pg = await import('pg');
    const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
    try {
      const { name, domain, status = 'active', settings = {}, isActive = true } = companyData;
      
      if (!name) {
        throw new Error('Company name is required');
      }

      // Generate unique domain if not provided or empty
      let finalDomain = domain;
      if (!finalDomain || finalDomain.trim() === '') {
        const timestamp = Date.now().toString().slice(-8);
        const nameSlug = name.toLowerCase()
          .replace(/[^a-z0-9]/g, '')
          .slice(0, 12);
        finalDomain = `${nameSlug}-${timestamp}.com`;
      }

      const result = await pool.query(`
        INSERT INTO companies (name, domain, status, settings, created_at)
        VALUES ($1, $2, $3, $4, NOW())
        RETURNING id, name, domain, status, settings, created_at
      `, [name, finalDomain, status, JSON.stringify(settings)]);
      
      const row = result.rows[0];

      return {
        id: row.id,
        name: row.name,
        domain: row.domain,
        status: row.status,
        settings: row.settings,
        createdAt: row.created_at
      };
    } finally {
      await pool.end();
    }
  }

  async updateCompany(id: string, data: any): Promise<any> {
    const pg = await import('pg');
    const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
    try {
      const { name, domain, status, settings } = data;
      const result = await pool.query(`
        UPDATE companies 
        SET name = $1, domain = $2, status = $3, settings = $4, updated_at = NOW()
        WHERE id = $5
        RETURNING id, name, domain, status, settings, created_at
      `, [name, domain, status, JSON.stringify(settings), id]);
      
      if (result.rows.length === 0) return null;
      
      const row = result.rows[0];
      return {
        id: row.id,
        name: row.name,
        domain: row.domain,
        status: row.status,
        settings: row.settings,
        createdAt: row.created_at
      };
    } finally {
      await pool.end();
    }
  }

  async deleteCompany(id: string): Promise<boolean> {
    const pg = await import('pg');
    const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
    try {
      const result = await pool.query('DELETE FROM companies WHERE id = $1', [id]);
      return result.rowCount > 0;
    } finally {
      await pool.end();
    }
  }

  async getUserEmailById(userId: string): Promise<string | undefined> {
    const user = await this.getUser(userId);
    return user?.email;
  }
}

export const storage = new DatabaseStorage();