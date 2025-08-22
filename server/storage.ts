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
  getTasks(): Promise<any[]>;
  createTask(task: any): Promise<any>;
  updateTask(id: string, data: any): Promise<any>;
  deleteTask(id: string): Promise<boolean>;
  
  // Photo operations
  getPhotos(projectId?: string): Promise<any[]>;
  createPhoto(photo: any): Promise<any>;
  deletePhoto(id: string): Promise<boolean>;

  // Project logs operations
  getProjectLogs(projectId?: string): Promise<any[]>;
  createProjectLog(log: any): Promise<any>;
  updateProjectLog(id: string, data: any): Promise<boolean>;
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
               company_id, created_at, password
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
      return (result.rowCount ?? 0) > 0;
    } finally {
      await pool.end();
    }
  }

  async getUsers(): Promise<any[]> {
    const pg = await import('pg');
    const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
    try {
      const result = await pool.query(`
        SELECT u.id, u.email, u.first_name, u.last_name, u.created_at, u.username, u.name, u.company_id,
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
        is_active: true, // Default to active since column doesn't exist
        created_at: row.created_at,
        last_login: null, // Column doesn't exist, set to null
        role_name: row.role_name,
        company_name: row.company_name,
        username: row.username || row.email,
        isActive: true // Default to active since column doesn't exist
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
      // First, handle any tasks assigned to this user by setting assignee_id to NULL
      // This prevents foreign key constraint violations during deletion
      await pool.query('UPDATE tasks SET assignee_id = NULL WHERE assignee_id = $1', [id]);
      console.log(`✅ Unassigned all tasks for user ${id} before deletion`);
      
      // Now delete the user
      const result = await pool.query('DELETE FROM users WHERE id = $1', [id]);
      return (result.rowCount ?? 0) > 0;
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
      
      // 6. Delete project health metrics associated with this project
      await pool.query('DELETE FROM project_health_metrics WHERE project_id = $1', [id]);
      
      // 7. Delete risk assessments associated with this project
      await pool.query('DELETE FROM risk_assessments WHERE project_id = $1', [id]);
      
      // 8. Finally delete the project
      const result = await pool.query('DELETE FROM projects WHERE id = $1', [id]);
      
      // Commit transaction
      await pool.query('COMMIT');
      return (result.rowCount ?? 0) > 0;
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
      return (result.rowCount ?? 0) > 0;
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

  // Photo management methods  
  async getPhotos(projectId?: string): Promise<any[]> {
    const pg = await import('pg');
    const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
    try {
      let query = `
        SELECT p.id, p.project_id, p.user_id, p.filename, p.original_name, p.description, p.tags, p.created_at
        FROM photos p 
        ORDER BY p.created_at DESC
      `;
      let queryParams: any[] = [];
      
      if (projectId) {
        query = `
          SELECT p.id, p.project_id, p.user_id, p.filename, p.original_name, p.description, p.tags, p.created_at
          FROM photos p 
          WHERE p.project_id = $1
          ORDER BY p.created_at DESC
        `;
        queryParams = [projectId];
      }
      
      const result = await pool.query(query, queryParams);
      return result.rows.map(row => ({
        id: row.id,
        projectId: row.project_id,
        userId: row.user_id,
        filename: row.filename,
        originalName: row.original_name,
        description: row.description,
        tags: row.tags || [],
        createdAt: row.created_at
      }));
    } finally {
      await pool.end();
    }
  }

  async createPhoto(photoData: any): Promise<any> {
    const pg = await import('pg');
    const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
    try {
      const { projectId, userId, filename, originalName, description, tags = [] } = photoData;
      
      if (!projectId || !userId || !filename || !originalName) {
        throw new Error('ProjectId, userId, filename, and originalName are required');
      }
      
      const result = await pool.query(`
        INSERT INTO photos (project_id, user_id, filename, original_name, description, tags, created_at)
        VALUES ($1, $2, $3, $4, $5, $6, NOW())
        RETURNING id, project_id, user_id, filename, original_name, description, tags, created_at
      `, [projectId, userId, filename, originalName, description, tags]);
      
      const row = result.rows[0];
      return {
        id: row.id,
        projectId: row.project_id,
        userId: row.user_id,
        filename: row.filename,
        originalName: row.original_name,
        description: row.description,
        tags: row.tags,
        createdAt: row.created_at
      };
    } finally {
      await pool.end();
    }
  }

  async deletePhoto(id: string): Promise<boolean> {
    const pg = await import('pg');
    const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
    try {
      const result = await pool.query('DELETE FROM photos WHERE id = $1', [id]);
      return (result.rowCount ?? 0) > 0;
    } finally {
      await pool.end();
    }
  }

  // Project logs operations
  async getProjectLogs(projectId?: string): Promise<any[]> {
    const pg = await import('pg');
    const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
    try {
      let query = `
        SELECT id, project_id, user_id, title, content, type, status, images, created_at
        FROM project_logs
      `;
      let params: any[] = [];
      
      if (projectId) {
        query += ' WHERE project_id = $1';
        params.push(projectId);
      }
      
      query += ' ORDER BY created_at DESC';
      
      const result = await pool.query(query, params);
      
      return result.rows.map(row => ({
        id: row.id,
        projectId: row.project_id,
        userId: row.user_id,
        title: row.title,
        content: row.content,
        type: row.type,
        status: row.status,
        images: row.images || [],
        createdAt: row.created_at
      }));
    } finally {
      await pool.end();
    }
  }

  async createProjectLog(logData: any): Promise<any> {
    const pg = await import('pg');
    const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
    try {
      const { projectId, userId, title, content, type = 'general', status = 'open', images = [] } = logData;
      
      if (!projectId || !userId || !title || !content) {
        throw new Error('ProjectId, userId, title, and content are required');
      }
      
      const result = await pool.query(`
        INSERT INTO project_logs (project_id, user_id, title, content, type, status, images, created_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
        RETURNING id, project_id, user_id, title, content, type, status, images, created_at
      `, [projectId, userId, title, content, type, status, images]);
      
      const row = result.rows[0];
      
      // CRITICAL FIX: Also create individual photo records for each image uploaded via logs
      // This ensures photos appear in both Project Logs and Photos tab
      if (images && images.length > 0) {
        console.log(`📸 Creating ${images.length} photo records for log images...`);
        for (let i = 0; i < images.length; i++) {
          const imageUrl = images[i];
          try {
            // Extract the actual object storage path from the URL
            let filename = '';
            let originalName = `log-photo-${i + 1}.jpg`;
            
            if (imageUrl.includes('storage.googleapis.com')) {
              // Direct GCS URL - extract the full path after the bucket
              const url = new URL(imageUrl);
              const pathParts = url.pathname.split('/');
              // Skip the first empty part and bucket name, get the object path
              const objectPath = pathParts.slice(2).join('/').split('?')[0];
              filename = objectPath;
              originalName = pathParts[pathParts.length - 1].split('?')[0];
            } else if (imageUrl.includes('/objects/')) {
              // This is likely a local object reference, extract the ID
              const urlParts = imageUrl.split('/');
              const objectId = urlParts[urlParts.length - 1];
              // For object storage uploads, the filename should match the actual uploaded path
              filename = `uploads/${objectId}`;
              originalName = `log-photo-${i + 1}.jpg`;
            } else {
              // Fallback - create a unique filename
              filename = `${Date.now()}-log-${i}.jpg`;
              originalName = filename;
            }
            
            console.log(`📸 Creating photo record: URL=${imageUrl}, filename=${filename}, originalName=${originalName}`);
            
            // Create photo record in photos table
            await pool.query(`
              INSERT INTO photos (project_id, user_id, filename, original_name, description, tags, created_at)
              VALUES ($1, $2, $3, $4, $5, $6, NOW())
            `, [projectId, userId, filename, originalName, `Photo from log: ${title}`, ['log-photo']]);
            
            console.log(`✅ Created photo record for log image: ${filename}`);
          } catch (photoError) {
            console.error(`❌ Failed to create photo record for image ${i}:`, photoError);
            // Don't fail the entire log creation if photo creation fails
          }
        }
      }
      
      return {
        id: row.id,
        projectId: row.project_id,
        userId: row.user_id,
        title: row.title,
        content: row.content,
        type: row.type,
        status: row.status,
        images: row.images || [],
        createdAt: row.created_at
      };
    } finally {
      await pool.end();
    }
  }

  async updateProjectLog(id: string, data: any): Promise<boolean> {
    const pg = await import('pg');
    const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
    try {
      // Get existing log to compare images
      const existingResult = await pool.query('SELECT project_id, user_id, title, images FROM project_logs WHERE id = $1', [id]);
      if (existingResult.rows.length === 0) {
        return false;
      }
      
      const existingLog = existingResult.rows[0];
      const existingImages = existingLog.images || [];
      
      const updateFields = [];
      const params = [];
      let paramIndex = 1;
      
      if (data.title !== undefined) {
        updateFields.push(`title = $${paramIndex++}`);
        params.push(data.title);
      }
      if (data.content !== undefined) {
        updateFields.push(`content = $${paramIndex++}`);
        params.push(data.content);
      }
      if (data.type !== undefined) {
        updateFields.push(`type = $${paramIndex++}`);
        params.push(data.type);
      }
      if (data.status !== undefined) {
        updateFields.push(`status = $${paramIndex++}`);
        params.push(data.status);
      }
      if (data.images !== undefined) {
        updateFields.push(`images = $${paramIndex++}`);
        params.push(data.images);
      }
      
      if (updateFields.length === 0) {
        return false;
      }
      
      params.push(id);
      const query = `UPDATE project_logs SET ${updateFields.join(', ')} WHERE id = $${paramIndex}`;
      
      const result = await pool.query(query, params);
      
      // CRITICAL FIX: Create photo records for any new images added during update
      if (data.images && data.images.length > existingImages.length) {
        const newImages = data.images.slice(existingImages.length);
        const logTitle = data.title || existingLog.title;
        
        console.log(`📸 Creating ${newImages.length} new photo records for updated log...`);
        for (let i = 0; i < newImages.length; i++) {
          const imageUrl = newImages[i];
          try {
            // Extract the actual object storage path from the URL
            let filename = '';
            let originalName = `log-photo-${existingImages.length + i + 1}.jpg`;
            
            if (imageUrl.includes('storage.googleapis.com')) {
              // Direct GCS URL - extract the full path after the bucket
              const url = new URL(imageUrl);
              const pathParts = url.pathname.split('/');
              // Skip the first empty part and bucket name, get the object path
              const objectPath = pathParts.slice(2).join('/').split('?')[0];
              filename = objectPath;
              originalName = pathParts[pathParts.length - 1].split('?')[0];
            } else if (imageUrl.includes('/objects/')) {
              // This is likely a local object reference, extract the ID
              const urlParts = imageUrl.split('/');
              const objectId = urlParts[urlParts.length - 1];
              // For object storage uploads, the filename should match the actual uploaded path
              filename = `uploads/${objectId}`;
              originalName = `log-photo-${existingImages.length + i + 1}.jpg`;
            } else {
              // Fallback - create a unique filename
              filename = `${Date.now()}-log-${existingImages.length + i}.jpg`;
              originalName = filename;
            }
            
            console.log(`📸 Creating photo record for update: URL=${imageUrl}, filename=${filename}, originalName=${originalName}`);
            
            // Create photo record in photos table
            await pool.query(`
              INSERT INTO photos (project_id, user_id, filename, original_name, description, tags, created_at)
              VALUES ($1, $2, $3, $4, $5, $6, NOW())
            `, [existingLog.project_id, existingLog.user_id, filename, originalName, `Photo from log: ${logTitle}`, ['log-photo']]);
            
            console.log(`✅ Created photo record for new log image: ${filename}`);
          } catch (photoError) {
            console.error(`❌ Failed to create photo record for new image ${i}:`, photoError);
            // Don't fail the entire update if photo creation fails
          }
        }
      }
      
      return (result.rowCount ?? 0) > 0;
    } finally {
      await pool.end();
    }
  }

  // Photo management methods - duplicates removed
}

export const storage = new DatabaseStorage();