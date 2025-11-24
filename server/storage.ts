import {
  users,
  type User,
  type UpsertUser,
  type InsertUser,
} from "@shared/schema";
import { db, createDbPool } from "./db";
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
  getCompanyUsers(companyId: string): Promise<any[]>;
  createRBACUser(user: any): Promise<any>;
  updateUser(id: string, data: any): Promise<any>;
  deleteUser(id: string): Promise<boolean>;
  getRoles(): Promise<any[]>;
  createRole(role: any): Promise<any>;
  updateRole(id: string, data: any): Promise<any>;
  deleteRole(id: string): Promise<boolean>;
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
  
  // Activity operations
  getActivities(companyId: string, limit?: number): Promise<any[]>;
  createActivity(activity: any): Promise<any>;
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
    // Use createDbPool() to get a pool with proper SSL configuration
    const pool = createDbPool();
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
    // Use createDbPool() to get a pool with proper SSL configuration
    const pool = createDbPool();
    try {
      const result = await pool.query(`
        SELECT id, name, domain, is_active, settings, created_at, updated_at
        FROM companies 
        ORDER BY name
      `);
      return result.rows.map(row => ({
        id: row.id.toString(),
        name: row.name,
        domain: row.domain,
        status: row.is_active ? 'active' : 'inactive',
        settings: row.settings || {},
        created_at: row.created_at,
        is_active: row.is_active
      }));
    } finally {
      await pool.end();
    }
  }

  async createCompany(companyData: any): Promise<any> {
    // Use createDbPool() to get a pool with proper SSL configuration
    const pool = createDbPool();
    try {
      const { name, domain, settings } = companyData;
      const is_active = companyData.status !== 'inactive';
      const result = await pool.query(`
        INSERT INTO companies (name, domain, is_active, settings, created_at, updated_at)
        VALUES ($1, $2, $3, $4, NOW(), NOW())
        RETURNING id, name, domain, is_active, settings, created_at, updated_at
      `, [name, domain, is_active, JSON.stringify(settings)]);
      
      const row = result.rows[0];
      return {
        id: row.id.toString(),
        name: row.name,
        domain: row.domain,
        status: row.is_active ? 'active' : 'inactive',
        settings: row.settings,
        created_at: row.created_at,
        is_active: row.is_active
      };
    } finally {
      await pool.end();
    }
  }

  async updateCompany(id: string, data: any): Promise<any> {
    // Use createDbPool() to get a pool with proper SSL configuration
    const pool = createDbPool();
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
    // Use createDbPool() to get a pool with proper SSL configuration
    const pool = createDbPool();
    try {
      // First, delete all user activities for this company
      await pool.query('DELETE FROM user_activities WHERE company_id = $1', [id]);
      console.log(`✅ Deleted all activities for company ${id} before deletion`);
      
      // Then, handle tasks - set company_id to NULL for tasks belonging to this company
      await pool.query('UPDATE tasks SET company_id = NULL WHERE company_id = $1', [id]);
      console.log(`✅ Unassigned all tasks for company ${id} before deletion`);
      
      // Handle projects - set company_id to NULL for projects belonging to this company
      await pool.query('UPDATE projects SET company_id = NULL WHERE company_id = $1', [id]);
      console.log(`✅ Unassigned all projects for company ${id} before deletion`);
      
      // Finally, handle users - reassign to the first existing company to maintain referential integrity
      // Find an existing company that's not the one being deleted
      const fallbackCompanyResult = await pool.query('SELECT id FROM companies WHERE id != $1 LIMIT 1', [id]);
      if (fallbackCompanyResult.rows.length > 0) {
        const fallbackCompanyId = fallbackCompanyResult.rows[0].id;
        await pool.query('UPDATE users SET company_id = $1 WHERE company_id = $2', [fallbackCompanyId, id]);
        console.log(`✅ Reassigned all users from company ${id} to company ${fallbackCompanyId} before deletion`);
      } else {
        // If no other companies exist, we cannot safely delete this company
        throw new Error('Cannot delete the last remaining company - at least one company must exist');
      }
      
      // Now we can safely delete the company (use string ID, not parseInt)
      const result = await pool.query('DELETE FROM companies WHERE id = $1', [id]);
      console.log(`✅ Company ${id} deleted successfully`);
      return (result.rowCount ?? 0) > 0;
    } finally {
      await pool.end();
    }
  }

  async getUsers(): Promise<any[]> {
    // Use createDbPool() to get a pool with proper SSL configuration
    const pool = createDbPool();
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

  async getCompanyUsers(companyId: string): Promise<any[]> {
    // Use createDbPool() to get a pool with proper SSL configuration
    const pool = createDbPool();
    try {
      console.log(`✅ Fetching users for company ${companyId}`);
      const result = await pool.query(`
        SELECT u.id, u.email, u.first_name, u.last_name, u.created_at, u.username, u.name, u.company_id,
               COALESCE(u.role, 'User') as role_name,
               c.name as company_name,
               CASE 
                  WHEN u.company_id IS NOT NULL THEN true
                  ELSE false
               END as is_active
        FROM users u 
        LEFT JOIN companies c ON c.id = u.company_id
        WHERE u.company_id = $1
        ORDER BY u.email
      `, [companyId]);
      
      const users = result.rows.map(row => ({
        id: row.id,
        name: row.name || `${row.first_name || ''} ${row.last_name || ''}`.trim() || row.email,
        email: row.email,
        first_name: row.first_name,
        last_name: row.last_name,
        companyId: row.company_id,
        role_id: '1',
        is_active: row.is_active,
        created_at: row.created_at,
        last_login: null,
        role_name: row.role_name,
        company_name: row.company_name,
        username: row.username || row.email,
        isActive: row.is_active
      }));
      
      console.log(`✅ Found ${users.length} users for company ${companyId}`);
      return users;
    } finally {
      await pool.end();
    }
  }

  async createRBACUser(userData: any): Promise<any> {
    // Use createDbPool() to get a pool with proper SSL configuration
    const pool = createDbPool();
    try {
      const { 
        email, 
        first_name, 
        last_name, 
        name,
        company_id,
        password,
        username 
      } = userData;
      
      if (!email) {
        throw new Error('Email is required');
      }
      if (!company_id) {
        throw new Error('Company is required');
      }
      
      // Handle role_id or role - if role is provided, look up role_id
      let role_id = userData.role_id;
      if (!role_id && userData.role) {
        // Try to look up role_id from roles table
        try {
          const roleLookup = await pool.query(`
            SELECT id FROM roles 
            WHERE LOWER(role_name) = LOWER($1) OR LOWER(name) = LOWER($1)
            LIMIT 1
          `, [userData.role]);
          if (roleLookup.rows.length > 0) {
            role_id = roleLookup.rows[0].id;
          } else {
            // Fallback to role mapping if roles table doesn't have the role
            const roleMapping: any = {
              'admin': '1',
              'project_manager': '2',
              'office_manager': '3',
              'subcontractor': '4',
              'client': '5',
              'crew': '6'
            };
            role_id = roleMapping[userData.role.toLowerCase()] || '6'; // Default to crew
          }
        } catch (err) {
          // If lookup fails, use role mapping
          const roleMapping: any = {
            'admin': '1',
            'project_manager': '2',
            'office_manager': '3',
            'subcontractor': '4',
            'client': '5',
            'crew': '6'
          };
          role_id = roleMapping[userData.role.toLowerCase()] || '6'; // Default to crew
        }
      }
      
      if (!role_id) {
        // Default to crew role if nothing provided
        role_id = '6';
      }

      const userUsername = username || email.split('@')[0];
      const userName = name || `${first_name || ''} ${last_name || ''}`.trim() || email;
      const userPassword = password || 'password123';

      // Hash the password before storing
      const bcryptModule = await import('bcrypt');
      const saltRounds = 10;
      const hashedPassword = await bcryptModule.hash(userPassword, saltRounds);

      // Generate user ID
      const cryptoModule = await import('crypto');
      const userId = cryptoModule.randomUUID().replace(/-/g, '').substring(0, 8);
      
      // Check if users table has role_id column (new schema) or role column (old schema)
      let hasRoleId = false;
      try {
        const checkSchema = await pool.query(`
          SELECT column_name 
          FROM information_schema.columns 
          WHERE table_name = 'users' AND column_name IN ('role_id', 'role')
          LIMIT 1
        `);
        hasRoleId = checkSchema.rows.some((row: any) => row.column_name === 'role_id');
      } catch (err) {
        // If schema check fails, assume old schema
        console.log('Schema check failed, assuming old schema:', err);
      }
      
      let insertQuery: string;
      let insertParams: any[];
      
      if (hasRoleId) {
        // New schema: use role_id directly
        insertQuery = `
          INSERT INTO users (
            id, email, first_name, last_name, username, name, role_id, 
            company_id, password, is_active, created_at, updated_at
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW(), NOW())
          RETURNING id, email, first_name, last_name, username, name, role_id, company_id, is_active, created_at
        `;
        insertParams = [
          userId,
          email, 
          first_name, 
          last_name, 
          userUsername,
          userName,
          role_id,
          company_id,
          hashedPassword,
          true
        ];
      } else {
        // Old schema: map role_id to role string
        const roleMapping: any = {
          '1': 'admin',
          '2': 'project_manager',
          '3': 'office_manager',
          '4': 'subcontractor',
          '5': 'client',
          '6': 'crew'
        };
        const userRole = roleMapping[role_id] || 'crew';
        
        insertQuery = `
          INSERT INTO users (
            id, email, first_name, last_name, username, name, role, 
            company_id, password, is_active, created_at, updated_at
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW(), NOW())
          RETURNING id, email, first_name, last_name, username, name, role, company_id, is_active, created_at
        `;
        insertParams = [
          userId,
          email, 
          first_name, 
          last_name, 
          userUsername,
          userName,
          userRole,
          company_id,
          hashedPassword,
          true
        ];
      }
      
      const result = await pool.query(insertQuery, insertParams);
      const row = result.rows[0];

      // Create company_users entry if table exists
      try {
        try {
          await pool.query(`
            INSERT INTO company_users (user_id, company_id, role_id, created_at)
            VALUES ($1, $2, $3, NOW())
            ON CONFLICT (company_id, user_id, role_id) DO NOTHING
          `, [userId, company_id, role_id]);
        } catch (conflictErr: any) {
          // If unique constraint doesn't exist, try without ON CONFLICT
          if (conflictErr.code === '42704' || conflictErr.code === '23505') {
            await pool.query(`
              INSERT INTO company_users (user_id, company_id, role_id, created_at)
              VALUES ($1, $2, $3, NOW())
            `, [userId, company_id, role_id]);
          } else {
            throw conflictErr;
          }
        }
      } catch (err: any) {
        // Table might not exist, that's okay
        if (err.code !== '42P01' && err.code !== '42703') {
          console.log('Note: company_users table not found or error inserting:', err.message);
        }
      }

      // Get company name and role name for response
      const companyResult = await pool.query('SELECT name FROM companies WHERE id = $1', [company_id]);
      const companyName = companyResult.rows[0]?.name || 'Unknown Company';
      
      let roleName = '';
      try {
        const roleResult = await pool.query('SELECT role_name, display_name FROM roles WHERE id = $1', [role_id]);
        if (roleResult.rows[0]) {
          roleName = roleResult.rows[0].display_name || roleResult.rows[0].role_name || '';
        }
      } catch (err) {
        // Roles table might not exist
      }

      return {
        id: row.id,
        username: row.username,
        name: row.name,
        email: row.email,
        first_name: row.first_name,
        last_name: row.last_name,
        role_id: hasRoleId ? row.role_id : role_id,
        role: hasRoleId ? roleName : row.role,
        role_name: roleName || (hasRoleId ? '' : row.role),
        company_id: row.company_id,
        company_name: companyName,
        is_active: row.is_active !== undefined ? row.is_active : true,
        created_at: row.created_at
      };
    } finally {
      await pool.end();
    }
  }

  async updateUser(id: string, data: any): Promise<any> {
    // Use createDbPool() to get a pool with proper SSL configuration
    const pool = createDbPool();
    try {
      const { email, first_name, last_name, role, company_id, is_active, username, password } = data;
      let role_id = data.role_id;
      
      if (!id) {
        throw new Error('User ID is required');
      }
      
      // Get current user to preserve values if not being updated
      const currentUserResult = await pool.query(
        'SELECT id, email, first_name, last_name, company_id, role_id, role, is_active, username FROM users WHERE id = $1',
        [id]
      );
      
      if (currentUserResult.rows.length === 0) {
        throw new Error('User not found');
      }
      
      const currentUser = currentUserResult.rows[0];
      const currentCompanyId = currentUser.company_id;
      const currentRoleId = currentUser.role_id;
      const currentRole = currentUser.role;
      
      // Use provided values or fall back to current values
      const finalEmail = email || currentUser.email;
      const finalFirstName = first_name !== undefined ? first_name : currentUser.first_name;
      const finalLastName = last_name !== undefined ? last_name : currentUser.last_name;
      const finalCompanyId = company_id || currentCompanyId;
      const finalIsActive = is_active !== undefined ? is_active : (currentUser.is_active !== undefined ? currentUser.is_active : true);
      const finalUsername = username || finalEmail.split('@')[0];
      const userName = `${finalFirstName || ''} ${finalLastName || ''}`.trim() || finalEmail;
      
      // Determine role_id and role
      let finalRoleId = role_id;
      let finalRole = role;
      
      // Check if users table has role_id column (new schema) or role column (old schema)
      let hasRoleId = false;
      try {
        const checkSchema = await pool.query(`
          SELECT column_name 
          FROM information_schema.columns 
          WHERE table_name = 'users' AND column_name IN ('role_id', 'role')
        `);
        hasRoleId = checkSchema.rows.some((row: any) => row.column_name === 'role_id');
      } catch (err) {
        // If schema check fails, assume old schema
        console.log('Schema check failed, assuming old schema:', err);
      }
      
      // If role_id is provided, use it. Otherwise, if role string is provided, map it to role_id
      if (!finalRoleId && finalRole) {
        const roleMapping: any = {
          'admin': '1',
          'project_manager': '2',
          'office_manager': '3',
          'subcontractor': '4',
          'client': '5',
          'crew': '6'
        };
        finalRoleId = roleMapping[finalRole.toLowerCase()] || currentRoleId;
      }
      
      if (!finalRoleId) {
        finalRoleId = currentRoleId;
      }
      
      // If we have role_id but need role string for old schema
      if (!finalRole && finalRoleId && !hasRoleId) {
        const roleMapping: any = {
          '1': 'admin',
          '2': 'project_manager',
          '3': 'office_manager',
          '4': 'subcontractor',
          '5': 'client',
          '6': 'crew'
        };
        finalRole = roleMapping[finalRoleId.toString()] || currentRole || 'crew';
      }
      
      // Build update query based on schema
      let queryText: string;
      let queryParams: any[];
      
      if (password && password.trim() !== '') {
        // Hash the new password if provided
        const bcrypt = await import('bcrypt');
        const saltRounds = 10;
        const hashedPassword = await bcrypt.hash(password, saltRounds);
        
        if (hasRoleId) {
          // New schema: use role_id
          queryText = `
            UPDATE users 
            SET email = $1, first_name = $2, last_name = $3, role_id = $4, company_id = $5, is_active = $6, 
                updated_at = NOW(), name = $7, username = $8, password = $9
            WHERE id = $10
            RETURNING id, email, first_name, last_name, username, role_id, company_id, is_active, created_at, name
          `;
          queryParams = [finalEmail, finalFirstName, finalLastName, finalRoleId, finalCompanyId, finalIsActive, userName, finalUsername, hashedPassword, id];
        } else {
          // Old schema: use role string
          queryText = `
            UPDATE users 
            SET email = $1, first_name = $2, last_name = $3, role = $4, company_id = $5, is_active = $6, 
                updated_at = NOW(), name = $7, username = $8, password = $9
            WHERE id = $10
            RETURNING id, email, first_name, last_name, username, role, company_id, is_active, created_at, name
          `;
          queryParams = [finalEmail, finalFirstName, finalLastName, finalRole, finalCompanyId, finalIsActive, userName, finalUsername, hashedPassword, id];
        }
      } else {
        // Don't update password if not provided
        if (hasRoleId) {
          // New schema: use role_id
          queryText = `
            UPDATE users 
            SET email = $1, first_name = $2, last_name = $3, role_id = $4, company_id = $5, is_active = $6, 
                updated_at = NOW(), name = $7, username = $8
            WHERE id = $9
            RETURNING id, email, first_name, last_name, username, role_id, company_id, is_active, created_at, name
          `;
          queryParams = [finalEmail, finalFirstName, finalLastName, finalRoleId, finalCompanyId, finalIsActive, userName, finalUsername, id];
        } else {
          // Old schema: use role string
          queryText = `
            UPDATE users 
            SET email = $1, first_name = $2, last_name = $3, role = $4, company_id = $5, is_active = $6, 
                updated_at = NOW(), name = $7, username = $8
            WHERE id = $9
            RETURNING id, email, first_name, last_name, username, role, company_id, is_active, created_at, name
          `;
          queryParams = [finalEmail, finalFirstName, finalLastName, finalRole, finalCompanyId, finalIsActive, userName, finalUsername, id];
        }
      }
      
      const result = await pool.query(queryText, queryParams);
      
      if (result.rows.length === 0) {
        throw new Error('Failed to update user - no rows affected');
      }
      
      const row = result.rows[0];
      
      // Update company_users table if it exists and company_id or role_id changed
      if (finalCompanyId && finalRoleId) {
        try {
          // Try to update company_users - handle both with and without unique constraint
          try {
            await pool.query(`
              INSERT INTO company_users (user_id, company_id, role_id, created_at)
              VALUES ($1, $2, $3, NOW())
              ON CONFLICT (company_id, user_id, role_id) 
              DO UPDATE SET role_id = EXCLUDED.role_id, created_at = NOW()
            `, [id, finalCompanyId, finalRoleId]);
          } catch (conflictErr: any) {
            // If unique constraint doesn't exist or conflict error, try delete + insert
            if (conflictErr.code === '42704' || conflictErr.code === '23505' || conflictErr.message.includes('constraint')) {
              await pool.query(`
                DELETE FROM company_users WHERE user_id = $1 AND company_id = $2;
                INSERT INTO company_users (user_id, company_id, role_id, created_at)
                VALUES ($1, $2, $3, NOW())
              `, [id, finalCompanyId, finalRoleId]);
            } else {
              throw conflictErr;
            }
          }
        } catch (err: any) {
          // Table might not exist, that's okay - just log it
          if (err.code !== '42P01' && err.code !== '42703') {
            console.log('Note: company_users table operation failed:', err.message);
          }
        }
      }

      // Get company name and role name for response
      const companyResult = await pool.query('SELECT name FROM companies WHERE id = $1', [finalCompanyId || currentCompanyId]);
      const companyName = companyResult.rows[0]?.name || 'Unknown Company';
      
      let roleName = '';
      if (hasRoleId && finalRoleId) {
        try {
          const roleResult = await pool.query('SELECT role_name, display_name FROM roles WHERE id = $1', [finalRoleId]);
          if (roleResult.rows[0]) {
            roleName = roleResult.rows[0].display_name || roleResult.rows[0].role_name || '';
          }
        } catch (err) {
          // Roles table might not exist
        }
      }

      return {
        id: row.id,
        name: row.name || `${row.first_name || ''} ${row.last_name || ''}`.trim() || row.email,
        email: row.email,
        first_name: row.first_name,
        last_name: row.last_name,
        company_id: row.company_id || finalCompanyId,
        company_name: companyName,
        role_id: hasRoleId ? (row.role_id || finalRoleId) : finalRoleId,
        role: hasRoleId ? (roleName || finalRole) : (row.role || finalRole),
        role_name: roleName || (hasRoleId ? '' : (row.role || finalRole)),
        is_active: row.is_active !== undefined ? row.is_active : true,
        isActive: row.is_active !== undefined ? row.is_active : true,
        created_at: row.created_at,
        username: row.username
      };
    } finally {
      await pool.end();
    }
  }

  async deleteUser(id: string): Promise<boolean> {
    // Use createDbPool() to get a pool with proper SSL configuration
    const pool = createDbPool();
    
    // Helper function to safely delete from a table
    const safeDelete = async (query: string, params: any[], description: string) => {
      try {
        await pool.query(query, params);
        console.log(`✅ ${description}`);
      } catch (err: any) {
        // Only log if it's not a "column/table doesn't exist" error
        if (err.code !== '42703' && err.code !== '42P01') {
          console.log(`⚠️ ${description} - skipped: ${err.message}`);
        }
      }
    };
    
    try {
      // First, handle any tasks assigned to this user by setting assignee_id to NULL
      await pool.query('UPDATE tasks SET assignee_id = NULL WHERE assignee_id = $1', [id]);
      console.log(`✅ Unassigned all tasks for user ${id} before deletion`);
      
      // Delete all user activities
      await pool.query('DELETE FROM user_activities WHERE user_id = $1', [id]);
      console.log(`✅ Deleted all activities for user ${id} before deletion`);
      
      // Clean up client portal data - use safeDelete to avoid breaking on missing columns
      
      // Delete payment receipts (uploaded_by column)
      await safeDelete(
        'DELETE FROM client_portal.payment_receipts WHERE uploaded_by = $1',
        [id],
        `Deleted payment receipts for user ${id}`
      );
      
      // Delete payment documents (uploaded_by column)
      await safeDelete(
        'DELETE FROM client_portal.payment_documents WHERE uploaded_by = $1',
        [id],
        `Deleted payment documents for user ${id}`
      );
      
      // Delete payment installments for schedules created by this user
      await safeDelete(
        `DELETE FROM client_portal.payment_installments 
         WHERE schedule_id IN (
           SELECT id FROM client_portal.payment_schedules WHERE created_by = $1
         )`,
        [id],
        `Deleted payment installments for user ${id}`
      );
      
      // Delete payment schedules created by this user
      await safeDelete(
        'DELETE FROM client_portal.payment_schedules WHERE created_by = $1',
        [id],
        `Deleted payment schedules for user ${id}`
      );
      
      // Delete material items for areas created by this user
      await safeDelete(
        `DELETE FROM client_portal.material_items 
         WHERE area_id IN (
           SELECT id FROM client_portal.material_areas WHERE created_by = $1
         )`,
        [id],
        `Deleted material items for user ${id}`
      );
      
      // Delete material areas created by this user
      await safeDelete(
        'DELETE FROM client_portal.material_areas WHERE created_by = $1',
        [id],
        `Deleted material areas for user ${id}`
      );
      
      // Delete issue comments by this user
      await safeDelete(
        'DELETE FROM client_portal.issue_comments WHERE user_id = $1',
        [id],
        `Deleted issue comments for user ${id}`
      );
      
      // Delete issues created by this user
      await safeDelete(
        'DELETE FROM client_portal.issues WHERE created_by = $1',
        [id],
        `Deleted issues for user ${id}`
      );
      
      // Delete forum messages by this user
      await safeDelete(
        'DELETE FROM client_portal.messages WHERE user_id = $1',
        [id],
        `Deleted forum messages for user ${id}`
      );
      
      // Now delete the user
      const result = await pool.query('DELETE FROM users WHERE id = $1', [id]);
      return (result.rowCount ?? 0) > 0;
    } catch (error) {
      console.error('Error deleting user:', error);
      throw error;
    } finally {
      await pool.end();
    }
  }

  async getRoles(): Promise<any[]> {
    // Return predefined roles instead of querying non-existent roles table
    const predefinedRoles = [
      {
        id: '1',
        name: 'Admin',
        description: 'Full system access - only root users can create',
        company_id: null,
        permissions: ['create_projects', 'manage_users', 'manage_companies', 'view_all'],
        is_template: true,
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        id: '2',
        name: 'Project Manager',
        description: 'Manages projects, tasks, and team members',
        company_id: null,
        permissions: ['create_projects', 'manage_tasks', 'view_reports'],
        is_template: true,
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        id: '3',
        name: 'Office Manager',
        description: 'Handles administrative tasks and scheduling',
        company_id: null,
        permissions: ['manage_schedule', 'view_reports', 'manage_communications'],
        is_template: true,
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        id: '4',
        name: 'Subcontractor',
        description: 'External contractor with limited access',
        company_id: null,
        permissions: ['view_assigned_tasks', 'update_task_status'],
        is_template: true,
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        id: '5',
        name: 'Client',
        description: 'Client with read-only access to their projects',
        company_id: null,
        permissions: ['view_own_projects', 'view_progress'],
        is_template: true,
        created_at: new Date(),
        updated_at: new Date()
      }
    ];
    
    console.log('✅ NODE.JS SUCCESS: Retrieved predefined roles');
    return predefinedRoles;
  }

  async createRole(roleData: any): Promise<any> {
    // Since we use predefined roles, just return success
    // In a real system, this would add the role to the predefined list or database
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
    
    console.log('✅ NODE.JS SUCCESS: Role created (predefined system):', newRole);
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
    // Use createDbPool() to get a pool with proper SSL configuration
    const pool = createDbPool();
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
    // Use createDbPool() to get a pool with proper SSL configuration
    const pool = createDbPool();
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
    // Use createDbPool() to get a pool with proper SSL configuration
    const pool = createDbPool();
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
    // Use createDbPool() to get a pool with proper SSL configuration
    const pool = createDbPool();
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
    // Use createDbPool() to get a pool with proper SSL configuration
    const pool = createDbPool();
    try {
      const result = await pool.query(`
        SELECT t.id, t.title, t.description, t.project_id, t.assignee_id, t.status, 
               t.priority, t.due_date, t.completed_at, t.created_at, t.category, 
               t.is_milestone, t.estimated_hours, t.company_id,
               p.name as project_name, p.company_id as project_company_id,
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
        companyId: row.company_id || row.project_company_id || '0' // Use task company_id first, then project company_id
      }));
    } finally {
      await pool.end();
    }
  }

  async createTask(taskData: any): Promise<any> {
    // Use createDbPool() to get a pool with proper SSL configuration
    const pool = createDbPool();
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
        estimatedHours,
        companyId 
      } = taskData;
      
      if (!title) {
        throw new Error('Task title is required');
      }

      const result = await pool.query(`
        INSERT INTO tasks (title, description, project_id, assignee_id, status, priority, 
                          due_date, category, is_milestone, estimated_hours, company_id, created_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW())
        RETURNING id, title, description, project_id, assignee_id, status, priority, 
                  due_date, completed_at, created_at, category, is_milestone, estimated_hours, company_id
      `, [title, description, projectId, assigneeId, status, priority, dueDate, category, isMilestone, estimatedHours, companyId]);
      
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
        estimatedHours: row.estimated_hours,
        companyId: row.company_id
      };
    } finally {
      await pool.end();
    }
  }

  async updateTask(id: string, data: any): Promise<any> {
    // Use createDbPool() to get a pool with proper SSL configuration
    const pool = createDbPool();
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
    // Use createDbPool() to get a pool with proper SSL configuration
    const pool = createDbPool();
    try {
      const result = await pool.query('DELETE FROM tasks WHERE id = $1', [id]);
      return (result.rowCount ?? 0) > 0;
    } finally {
      await pool.end();
    }
  }

  async assignTask(taskId: string, assigneeId: string | null): Promise<any> {
    // Use createDbPool() to get a pool with proper SSL configuration
    const pool = createDbPool();
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
    // Use createDbPool() to get a pool with proper SSL configuration
    const pool = createDbPool();
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
    // Use createDbPool() to get a pool with proper SSL configuration
    const pool = createDbPool();
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
    // Use createDbPool() to get a pool with proper SSL configuration
    const pool = createDbPool();
    try {
      const result = await pool.query('DELETE FROM photos WHERE id = $1', [id]);
      return (result.rowCount ?? 0) > 0;
    } finally {
      await pool.end();
    }
  }

  // Project logs operations
  async getProjectLogs(projectId?: string): Promise<any[]> {
    // Use createDbPool() to get a pool with proper SSL configuration
    const pool = createDbPool();
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
    // Use createDbPool() to get a pool with proper SSL configuration
    const pool = createDbPool();
    try {
      const { projectId, userId, title, content, type = 'general', status = 'open', images = [] } = logData;
      

      if (!projectId || !userId || !title) {
        throw new Error('ProjectId, userId, and title are required');

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
            // Extract filename from object storage URL
            let filename = '';
            let originalName = `log-photo-${i + 1}.jpg`;
            
            if (imageUrl.includes('storage.googleapis.com')) {
              // Direct GCS URL - extract just the filename from the end of the path
              const url = new URL(imageUrl);
              const pathParts = url.pathname.split('/');
              filename = pathParts[pathParts.length - 1].split('?')[0];
              originalName = filename;
            } else if (imageUrl.includes('/objects/')) {
              // This is likely a local object reference, extract the ID
              const urlParts = imageUrl.split('/');
              const objectId = urlParts[urlParts.length - 1];
              filename = `${objectId}.jpg`;
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
            `, [projectId, userId, filename, originalName, title, ['log-photo']]);
            
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
    // Use createDbPool() to get a pool with proper SSL configuration
    const pool = createDbPool();
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
            // Extract filename from object storage URL
            let filename = '';
            let originalName = `log-photo-${existingImages.length + i + 1}.jpg`;
            
            if (imageUrl.includes('storage.googleapis.com')) {
              // Direct GCS URL - extract just the filename from the end of the path
              const url = new URL(imageUrl);
              const pathParts = url.pathname.split('/');
              filename = pathParts[pathParts.length - 1].split('?')[0];
              originalName = filename;
            } else if (imageUrl.includes('/objects/')) {
              // This is likely a local object reference, extract the ID
              const urlParts = imageUrl.split('/');
              const objectId = urlParts[urlParts.length - 1];
              filename = `${objectId}.jpg`;
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
            `, [existingLog.project_id, existingLog.user_id, filename, originalName, logTitle, ['log-photo']]);
            
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


  async deleteProjectLog(id: string): Promise<boolean> {
    // Use createDbPool() to get a pool with proper SSL configuration
    const pool = createDbPool();
    try {
      // Start transaction for atomic operation
      await pool.query('BEGIN');
      
      // First, delete any associated photos from the photos table
      // Get the log to find its images
      const logResult = await pool.query('SELECT images FROM project_logs WHERE id = $1', [id]);
      if (logResult.rows.length > 0) {
        const logImages = logResult.rows[0].images || [];
        
        // For each image in the log, find and delete corresponding photo records
        for (const imageUrl of logImages) {
          try {
            // Extract object ID from the Google Cloud Storage URL
            let objectId;
            if (imageUrl.includes('storage.googleapis.com')) {
              const urlPath = new URL(imageUrl).pathname;
              const pathParts = urlPath.split('/');
              objectId = pathParts[pathParts.length - 1]; 
            } else {
              objectId = imageUrl;
            }
            
            // Delete photo records that match this image
            await pool.query(`
              DELETE FROM photos 
              WHERE filename = $1 OR filename LIKE $2
            `, [objectId, `%${objectId}%`]);
            
            console.log(`🗑️ Deleted photo records for: ${objectId}`);
          } catch (photoError) {
            console.error(`❌ Failed to delete photo records for image:`, photoError);
            // Continue with other images
          }
        }
      }
      
      // Delete the project log
      const result = await pool.query('DELETE FROM project_logs WHERE id = $1', [id]);
      
      // Commit transaction
      await pool.query('COMMIT');
      console.log(`🗑️ Deleted project log: ${id}`);
      return (result.rowCount ?? 0) > 0;
    } catch (error) {
      // Rollback on error
      await pool.query('ROLLBACK');
      console.error('❌ Failed to delete project log:', error);
      throw error;

    } finally {
      await pool.end();
    }
  }


  // Communications methods
  async getCommunications(): Promise<any[]> {
    // Use createDbPool() to get a pool with proper SSL configuration
    const pool = createDbPool();
    try {
      const result = await pool.query(`
        SELECT * FROM communications
        ORDER BY created_at DESC
      `);
      return result.rows;
    } finally {
      await pool.end();
    }
  }

  async createCommunication(data: any): Promise<any> {
    // Use createDbPool() to get a pool with proper SSL configuration
    const pool = createDbPool();
    try {
      const result = await pool.query(`
        INSERT INTO communications (project_id, from_email, subject, message, type, priority, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())
        RETURNING *
      `, [data.projectId, data.fromEmail || 'internal@tiento.com', data.subject, data.message, data.type, data.priority]);
      return result.rows[0];
    } finally {
      await pool.end();
    }
  }

  // Change Orders methods
  async getChangeOrders(): Promise<any[]> {
    // Use createDbPool() to get a pool with proper SSL configuration
    const pool = createDbPool();
    try {
      const result = await pool.query(`
        SELECT * FROM change_orders
        ORDER BY created_at DESC
      `);
      return result.rows;
    } finally {
      await pool.end();
    }
  }

  async createChangeOrder(data: any): Promise<any> {
    // Use createDbPool() to get a pool with proper SSL configuration
    const pool = createDbPool();
    try {
      const result = await pool.query(`
        INSERT INTO change_orders (project_id, requested_by, title, description, cost_impact, time_impact, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())
        RETURNING *
      `, [data.projectId, data.requestedBy || 'default-user', data.title, data.description, data.costImpact || 0, data.timeImpact || 0]);
      return result.rows[0];
    } finally {
      await pool.end();
    }
  }

  async updateChangeOrder(id: string, updates: any): Promise<any> {
    // Use createDbPool() to get a pool with proper SSL configuration
    const pool = createDbPool();
    try {
      const setPairs = [];
      const values = [];
      let paramIndex = 1;

      for (const [key, value] of Object.entries(updates)) {
        if (key === 'status') {
          setPairs.push(`status = $${paramIndex}`);
          values.push(value);
          paramIndex++;
        }
        if (key === 'reason') {
          setPairs.push(`reason = $${paramIndex}`);
          values.push(value);
          paramIndex++;
        }
      }

      if (setPairs.length === 0) return null;

      setPairs.push(`updated_at = NOW()`);
      values.push(id);

      const result = await pool.query(`
        UPDATE change_orders 
        SET ${setPairs.join(', ')}
        WHERE id = $${paramIndex}
        RETURNING *
      `, values);

      return result.rows[0] || null;
    } finally {
      await pool.end();
    }
  }

  // Time Entries methods
  async getTimeEntries(): Promise<any[]> {
    // Use createDbPool() to get a pool with proper SSL configuration
    const pool = createDbPool();
    try {
      const result = await pool.query(`
        SELECT * FROM time_entries
        ORDER BY created_at DESC
      `);
      return result.rows;
    } finally {
      await pool.end();
    }
  }

  async createTimeEntry(data: any): Promise<any> {
    // Use createDbPool() to get a pool with proper SSL configuration
    const pool = createDbPool();
    try {
      const result = await pool.query(`
        INSERT INTO time_entries (user_id, project_id, task_id, description, start_time, end_time, total_hours, created_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
        RETURNING *
      `, [data.userId, data.projectId, data.taskId, data.description, data.startTime, data.endTime, data.totalHours]);
      return result.rows[0];
    } finally {
      await pool.end();
    }
  }

  // Invoices methods
  async getInvoices(): Promise<any[]> {
    // Use createDbPool() to get a pool with proper SSL configuration
    const pool = createDbPool();
    try {
      const result = await pool.query(`
        SELECT * FROM invoices
        ORDER BY created_at DESC
      `);
      return result.rows;
    } finally {
      await pool.end();
    }
  }

  async createInvoice(data: any): Promise<any> {
    // Use createDbPool() to get a pool with proper SSL configuration
    const pool = createDbPool();
    try {
      const result = await pool.query(`
        INSERT INTO invoices (project_id, invoice_number, client_name, client_email, amount, tax, total, status, due_date, items, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW(), NOW())
        RETURNING *
      `, [data.projectId, data.invoiceNumber, data.clientName, data.clientEmail, data.amount, data.tax || 0, data.total, data.status || 'draft', data.dueDate, JSON.stringify(data.items)]);
      return result.rows[0];
    } finally {
      await pool.end();
    }
  }

  // Activity tracking methods
  async getActivities(companyId: string, limit: number = 10): Promise<any[]> {
    // Use createDbPool() to get a pool with proper SSL configuration
    const pool = createDbPool();
    try {
      const result = await pool.query(`
        SELECT ua.*, u.first_name, u.email 
        FROM user_activities ua
        LEFT JOIN users u ON ua.user_id = u.id
        WHERE ua.company_id = $1
        ORDER BY ua.created_at DESC
        LIMIT $2
      `, [companyId, limit]);
      return result.rows;
    } finally {
      await pool.end();
    }
  }

  async createActivity(data: any): Promise<any> {
    // Use createDbPool() to get a pool with proper SSL configuration
    const pool = createDbPool();
    try {
      const result = await pool.query(`
        INSERT INTO user_activities (user_id, company_id, action_type, description, entity_type, entity_id, metadata, created_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
        RETURNING *
      `, [data.userId, data.companyId, data.actionType, data.description, data.entityType, data.entityId, data.metadata ? JSON.stringify(data.metadata) : null]);
      return result.rows[0];
    } finally {
      await pool.end();
    }
  }

}

export const storage = new DatabaseStorage();