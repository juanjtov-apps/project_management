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
  getRoles(): Promise<any[]>;
  getPermissions(): Promise<any[]>;
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
               u.created_at, 'Unknown' as company_name, 'Unknown' as role_name
        FROM users u 
        ORDER BY u.email
      `);
      return result.rows.map(row => ({
        id: row.id,
        name: `${row.first_name || ''} ${row.last_name || ''}`.trim() || row.email,
        email: row.email,
        first_name: row.first_name,
        last_name: row.last_name,
        company_id: '1',
        role_id: '1',
        is_active: row.is_active,
        created_at: row.created_at,
        last_login: row.last_login_at,
        role_name: row.role_name,
        company_name: row.company_name,
        username: row.email,
        isActive: row.is_active
      }));
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
}

export const storage = new DatabaseStorage();