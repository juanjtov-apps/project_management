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
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user;
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
               u.created_at, u.username, u.name,
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
        company_id: '0', // Default company since no relationship exists
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
      const { email, first_name, last_name, role, is_active = true, username } = userData;
      
      if (!email) {
        throw new Error('Email is required');
      }

      const userUsername = username || email.split('@')[0]; // Generate username from email if not provided
      const userRole = role || 'crew'; // Default role

      // Use a simple default password for now - in production this should be properly hashed
      const defaultPassword = 'password123';
      
      const result = await pool.query(`
        INSERT INTO users (email, first_name, last_name, username, role, is_active, password, created_at, updated_at, name)
        VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW(), $8)
        RETURNING id, email, first_name, last_name, username, role, is_active, created_at, name
      `, [
        email, 
        first_name, 
        last_name, 
        userUsername, 
        userRole, 
        is_active,
        defaultPassword,
        `${first_name || ''} ${last_name || ''}`.trim() || email
      ]);
      
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

  async updateUser(id: string, data: any): Promise<any> {
    const pg = await import('pg');
    const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
    try {
      const { email, first_name, last_name, role, is_active, username } = data;
      const userName = `${first_name || ''} ${last_name || ''}`.trim() || email;
      
      const result = await pool.query(`
        UPDATE users 
        SET email = $1, first_name = $2, last_name = $3, role = $4, is_active = $5, updated_at = NOW(), name = $6, username = $7
        WHERE id = $8
        RETURNING id, email, first_name, last_name, username, role, is_active, created_at, name
      `, [email, first_name, last_name, role, is_active, userName, username || email.split('@')[0], id]);
      
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
    return [
      { id: '1', name: 'Admin', description: 'Administrator', company_id: '1', permissions: ['1', '2'], is_template: false, created_at: new Date(), updated_at: new Date() },
      { id: '2', name: 'Manager', description: 'Project Manager', company_id: '1', permissions: ['1'], is_template: false, created_at: new Date(), updated_at: new Date() },
      { id: '3', name: 'User', description: 'Regular User', company_id: '1', permissions: [], is_template: false, created_at: new Date(), updated_at: new Date() }
    ];
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
               p.created_at
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
        createdAt: row.created_at
      }));
    } finally {
      await pool.end();
    }
  }

  async createProject(projectData: any): Promise<any> {
    const pg = await import('pg');
    const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
    try {
      const { name, description, location, status = 'active', dueDate } = projectData;
      
      if (!name) {
        throw new Error('Project name is required');
      }

      const result = await pool.query(`
        INSERT INTO projects (name, description, location, status, progress, due_date, created_at)
        VALUES ($1, $2, $3, $4, 0, $5, NOW())
        RETURNING id, name, description, location, status, progress, due_date, created_at
      `, [name, description, location, status, dueDate]);
      
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
      const result = await pool.query('DELETE FROM projects WHERE id = $1', [id]);
      return result.rowCount > 0;
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
               p.name as project_name,
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
        estimatedHours: row.estimated_hours
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
      const { title, description, projectId, assigneeId, status, priority, dueDate, category, isMilestone, estimatedHours } = data;
      const result = await pool.query(`
        UPDATE tasks 
        SET title = $1, description = $2, project_id = $3, assignee_id = $4, status = $5, 
            priority = $6, due_date = $7, category = $8, is_milestone = $9, estimated_hours = $10,
            completed_at = CASE WHEN $5 = 'completed' AND completed_at IS NULL THEN NOW() ELSE completed_at END
        WHERE id = $11
        RETURNING id, title, description, project_id, assignee_id, status, priority, 
                  due_date, completed_at, created_at, category, is_milestone, estimated_hours
      `, [title, description, projectId, assigneeId, status, priority, dueDate, category, isMilestone, estimatedHours, id]);
      
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

  // User CRUD operations
  async getUsers(): Promise<any[]> {
    const pg = await import('pg');
    const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
    try {
      const result = await pool.query(`
        SELECT id, username, name, email, role, is_active, created_at 
        FROM users 
        ORDER BY name
      `);
      return result.rows.map(row => ({
        id: row.id,
        username: row.username,
        name: row.name,
        email: row.email,
        role: row.role,
        isActive: row.is_active,
        createdAt: row.created_at
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
      const { username, name, email, role, isActive } = data;
      const result = await pool.query(`
        UPDATE users 
        SET username = $1, name = $2, email = $3, role = $4, is_active = $5, updated_at = NOW()
        WHERE id = $6
        RETURNING id, username, name, email, role, is_active, created_at
      `, [username, name, email, role, isActive, id]);
      
      if (result.rows.length === 0) return null;
      
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

      const result = await pool.query(`
        INSERT INTO companies (name, domain, status, settings, created_at)
        VALUES ($1, $2, $3, $4, NOW())
        RETURNING id, name, domain, status, settings, created_at
      `, [name, domain, status, JSON.stringify(settings)]);
      
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
}

export const storage = new DatabaseStorage();