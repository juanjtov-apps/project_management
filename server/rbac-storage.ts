import {
  companies,
  users,
  roles,
  roleTemplates,
  permissions,
  companyUsers,
  rolePermissions,
  userEffectivePermissions,
  projectAssignments,
  auditLogs,
  type Company,
  type User,
  type Role,
  type RoleTemplate,
  type Permission,
  type CompanyUser,
  type RolePermission,
  type UserEffectivePermission,
  type ProjectAssignment,
  type AuditLog,
  type InsertCompany,
  type InsertUser,
  type InsertRole,
  type InsertRoleTemplate,
  type InsertPermission,
  type InsertCompanyUser,
  type InsertRolePermission,
  type InsertProjectAssignment,
  type InsertAuditLog,
  PERMISSIONS,
} from "@shared/rbac-schema";
import {
  type UserContext,
  type EffectivePermissions,
  type PermissionContext,
  type RoleAssignmentRequest,
  type CompanySettings,
  RBACError,
  PermissionDeniedError,
  CompanyAccessError,
  AuditAction,
} from "@shared/rbac-types";
import { db } from "./db";
import { eq, and, or, inArray, isNull, sql, desc, asc } from "drizzle-orm";

export interface IRBACStorage {
  // Company Management
  getCompany(id: number): Promise<Company | undefined>;
  createCompany(company: InsertCompany): Promise<Company>;
  updateCompany(id: number, updates: Partial<Company>): Promise<Company>;
  listCompanies(): Promise<Company[]>;
  
  // User Management
  getUser(id: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  upsertUser(user: InsertUser): Promise<User>;
  updateUser(id: string, updates: Partial<User>): Promise<User>;
  deactivateUser(id: string): Promise<void>;
  
  // Role Templates
  getRoleTemplate(id: number): Promise<RoleTemplate | undefined>;
  listRoleTemplates(category?: string): Promise<RoleTemplate[]>;
  createRoleTemplate(template: InsertRoleTemplate): Promise<RoleTemplate>;
  updateRoleTemplate(id: number, updates: Partial<RoleTemplate>): Promise<RoleTemplate>;
  
  // Company Roles
  getRole(id: number): Promise<Role | undefined>;
  listCompanyRoles(companyId: number): Promise<Role[]>;
  createRole(role: InsertRole): Promise<Role>;
  updateRole(id: number, updates: Partial<Role>): Promise<Role>;
  deleteRole(id: number): Promise<void>;
  
  // Permissions
  getPermission(id: number): Promise<Permission | undefined>;
  listPermissions(): Promise<Permission[]>;
  createPermission(permission: InsertPermission): Promise<Permission>;
  
  // User-Company-Role Assignments
  assignUserToCompany(assignment: InsertCompanyUser): Promise<CompanyUser>;
  revokeUserFromCompany(companyId: number, userId: string, roleId: number): Promise<void>;
  getUserCompanyRoles(userId: string, companyId: number): Promise<CompanyUser[]>;
  listCompanyUsers(companyId: number): Promise<Array<{ companyUser: CompanyUser; user: User; role: Role }>>;
  
  // Role Permissions
  assignPermissionToRole(assignment: InsertRolePermission): Promise<RolePermission>;
  revokePermissionFromRole(roleId: number, permissionId: number): Promise<void>;
  getRolePermissions(roleId: number): Promise<RolePermission[]>;
  
  // Project Assignments
  assignUserToProject(assignment: InsertProjectAssignment): Promise<ProjectAssignment>;
  revokeUserFromProject(projectId: number, userId: string): Promise<void>;
  getProjectAssignments(projectId: number): Promise<ProjectAssignment[]>;
  getUserProjectAssignments(userId: string, companyId: number): Promise<ProjectAssignment[]>;
  
  // Effective Permissions (Cached)
  getUserEffectivePermissions(userId: string, companyId: number): Promise<EffectivePermissions | undefined>;
  computeUserEffectivePermissions(userId: string, companyId: number): Promise<EffectivePermissions>;
  invalidateUserPermissions(userId: string, companyId: number): Promise<void>;
  cacheUserPermissions(permissions: EffectivePermissions): Promise<void>;
  
  // Permission Checking
  hasPermission(userId: string, companyId: number, permissionId: number, context?: PermissionContext): Promise<boolean>;
  hasAnyPermissions(userId: string, companyId: number, permissionIds: number[], context?: PermissionContext): Promise<boolean>;
  hasAllPermissions(userId: string, companyId: number, permissionIds: number[], context?: PermissionContext): Promise<boolean>;
  
  // User Context
  getUserContext(userId: string, companyId: number): Promise<UserContext | undefined>;
  
  // Audit Trail
  logAudit(entry: InsertAuditLog): Promise<AuditLog>;
  getAuditLogs(companyId: number, filters?: {
    userId?: string;
    action?: string;
    startDate?: Date;
    endDate?: Date;
    limit?: number;
  }): Promise<AuditLog[]>;
  
  // Company 0 Management (Platform)
  isPlatformUser(userId: string): Promise<boolean>;
  getPlatformUsers(): Promise<User[]>;
  promoteToCompany0(userId: string, grantedBy: string): Promise<void>;
}

export class RBACStorage implements IRBACStorage {
  
  // Company Management
  async getCompany(id: number): Promise<Company | undefined> {
    const [company] = await db.select().from(companies).where(eq(companies.id, id));
    return company;
  }

  async createCompany(company: InsertCompany): Promise<Company> {
    const [created] = await db.insert(companies).values(company).returning();
    return created;
  }

  async updateCompany(id: number, updates: Partial<Company>): Promise<Company> {
    const [updated] = await db
      .update(companies)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(companies.id, id))
      .returning();
    return updated;
  }

  async listCompanies(): Promise<Company[]> {
    return await db.select().from(companies).orderBy(asc(companies.name));
  }

  // User Management
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user;
  }

  async upsertUser(userData: InsertUser): Promise<User> {
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

  async updateUser(id: string, updates: Partial<User>): Promise<User> {
    const [updated] = await db
      .update(users)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(users.id, id))
      .returning();
    return updated;
  }

  async deactivateUser(id: string): Promise<void> {
    await db
      .update(users)
      .set({ isActive: false, updatedAt: new Date() })
      .where(eq(users.id, id));
  }

  // Role Templates
  async getRoleTemplate(id: number): Promise<RoleTemplate | undefined> {
    const [template] = await db.select().from(roleTemplates).where(eq(roleTemplates.id, id));
    return template;
  }

  async listRoleTemplates(category?: string): Promise<RoleTemplate[]> {
    const query = db.select().from(roleTemplates);
    if (category) {
      return await query.where(eq(roleTemplates.category, category));
    }
    return await query.orderBy(asc(roleTemplates.category), asc(roleTemplates.name));
  }

  async createRoleTemplate(template: InsertRoleTemplate): Promise<RoleTemplate> {
    const [created] = await db.insert(roleTemplates).values(template).returning();
    return created;
  }

  async updateRoleTemplate(id: number, updates: Partial<RoleTemplate>): Promise<RoleTemplate> {
    const [updated] = await db
      .update(roleTemplates)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(roleTemplates.id, id))
      .returning();
    return updated;
  }

  // Company Roles
  async getRole(id: number): Promise<Role | undefined> {
    const [role] = await db.select().from(roles).where(eq(roles.id, id));
    return role;
  }

  async listCompanyRoles(companyId: number): Promise<Role[]> {
    return await db
      .select()
      .from(roles)
      .where(and(eq(roles.companyId, companyId), eq(roles.isActive, true)))
      .orderBy(asc(roles.name));
  }

  async createRole(role: InsertRole): Promise<Role> {
    const [created] = await db.insert(roles).values(role).returning();
    return created;
  }

  async updateRole(id: number, updates: Partial<Role>): Promise<Role> {
    const [updated] = await db
      .update(roles)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(roles.id, id))
      .returning();
    return updated;
  }

  async deleteRole(id: number): Promise<void> {
    await db.update(roles).set({ isActive: false }).where(eq(roles.id, id));
  }

  // Permissions
  async getPermission(id: number): Promise<Permission | undefined> {
    const [permission] = await db.select().from(permissions).where(eq(permissions.id, id));
    return permission;
  }

  async listPermissions(): Promise<Permission[]> {
    return await db.select().from(permissions).orderBy(asc(permissions.category), asc(permissions.name));
  }

  async createPermission(permission: InsertPermission): Promise<Permission> {
    const [created] = await db.insert(permissions).values(permission).returning();
    return created;
  }

  // User-Company-Role Assignments
  async assignUserToCompany(assignment: InsertCompanyUser): Promise<CompanyUser> {
    const [created] = await db.insert(companyUsers).values(assignment).returning();
    
    // Invalidate cached permissions
    await this.invalidateUserPermissions(assignment.userId, assignment.companyId);
    
    return created;
  }

  async revokeUserFromCompany(companyId: number, userId: string, roleId: number): Promise<void> {
    await db
      .update(companyUsers)
      .set({ isActive: false })
      .where(
        and(
          eq(companyUsers.companyId, companyId),
          eq(companyUsers.userId, userId),
          eq(companyUsers.roleId, roleId)
        )
      );
    
    // Invalidate cached permissions
    await this.invalidateUserPermissions(userId, companyId);
  }

  async getUserCompanyRoles(userId: string, companyId: number): Promise<CompanyUser[]> {
    return await db
      .select()
      .from(companyUsers)
      .where(
        and(
          eq(companyUsers.userId, userId),
          eq(companyUsers.companyId, companyId),
          eq(companyUsers.isActive, true),
          or(isNull(companyUsers.expiresAt), sql`${companyUsers.expiresAt} > NOW()`)
        )
      );
  }

  async listCompanyUsers(companyId: number): Promise<Array<{ companyUser: CompanyUser; user: User; role: Role }>> {
    const results = await db
      .select({
        companyUser: companyUsers,
        user: users,
        role: roles,
      })
      .from(companyUsers)
      .innerJoin(users, eq(companyUsers.userId, users.id))
      .innerJoin(roles, eq(companyUsers.roleId, roles.id))
      .where(
        and(
          eq(companyUsers.companyId, companyId),
          eq(companyUsers.isActive, true)
        )
      )
      .orderBy(asc(users.lastName), asc(users.firstName));
    
    return results;
  }

  // Role Permissions
  async assignPermissionToRole(assignment: InsertRolePermission): Promise<RolePermission> {
    const [created] = await db.insert(rolePermissions).values(assignment).returning();
    
    // Invalidate all users with this role
    const roleUsers = await db
      .select({ userId: companyUsers.userId })
      .from(companyUsers)
      .where(eq(companyUsers.roleId, assignment.roleId));
    
    for (const { userId } of roleUsers) {
      await this.invalidateUserPermissions(userId, assignment.companyId);
    }
    
    return created;
  }

  async revokePermissionFromRole(roleId: number, permissionId: number): Promise<void> {
    await db
      .update(rolePermissions)
      .set({ isActive: false })
      .where(
        and(
          eq(rolePermissions.roleId, roleId),
          eq(rolePermissions.permissionId, permissionId)
        )
      );
  }

  async getRolePermissions(roleId: number): Promise<RolePermission[]> {
    return await db
      .select()
      .from(rolePermissions)
      .where(
        and(
          eq(rolePermissions.roleId, roleId),
          eq(rolePermissions.isActive, true),
          or(isNull(rolePermissions.expiresAt), sql`${rolePermissions.expiresAt} > NOW()`)
        )
      );
  }

  // Project Assignments
  async assignUserToProject(assignment: InsertProjectAssignment): Promise<ProjectAssignment> {
    const [created] = await db.insert(projectAssignments).values(assignment).returning();
    return created;
  }

  async revokeUserFromProject(projectId: number, userId: string): Promise<void> {
    await db
      .update(projectAssignments)
      .set({ isActive: false })
      .where(
        and(
          eq(projectAssignments.projectId, projectId),
          eq(projectAssignments.userId, userId)
        )
      );
  }

  async getProjectAssignments(projectId: number): Promise<ProjectAssignment[]> {
    return await db
      .select()
      .from(projectAssignments)
      .where(
        and(
          eq(projectAssignments.projectId, projectId),
          eq(projectAssignments.isActive, true)
        )
      );
  }

  async getUserProjectAssignments(userId: string, companyId: number): Promise<ProjectAssignment[]> {
    return await db
      .select()
      .from(projectAssignments)
      .where(
        and(
          eq(projectAssignments.userId, userId),
          eq(projectAssignments.companyId, companyId),
          eq(projectAssignments.isActive, true)
        )
      );
  }

  // Effective Permissions (Cached)
  async getUserEffectivePermissions(userId: string, companyId: number): Promise<EffectivePermissions | undefined> {
    const [cached] = await db
      .select()
      .from(userEffectivePermissions)
      .where(
        and(
          eq(userEffectivePermissions.userId, userId),
          eq(userEffectivePermissions.companyId, companyId),
          sql`${userEffectivePermissions.expiresAt} > NOW()`
        )
      );

    if (!cached) {
      return undefined;
    }

    return {
      userId,
      companyId,
      permissions: cached.permissions as number[],
      roles: [], // TODO: Build from cached.roleIds
      computedAt: cached.computedAt!,
      expiresAt: cached.expiresAt,
    };
  }

  async computeUserEffectivePermissions(userId: string, companyId: number): Promise<EffectivePermissions> {
    // Get user's company roles
    const userRoles = await this.getUserCompanyRoles(userId, companyId);
    const roleIds = userRoles.map(ur => ur.roleId);

    if (roleIds.length === 0) {
      return {
        userId,
        companyId,
        permissions: [],
        roles: [],
        computedAt: new Date(),
        expiresAt: new Date(Date.now() + 60 * 60 * 1000), // 1 hour
      };
    }

    // Get all permissions for these roles
    const rolePerms = await db
      .select()
      .from(rolePermissions)
      .where(
        and(
          inArray(rolePermissions.roleId, roleIds),
          eq(rolePermissions.isActive, true),
          or(isNull(rolePermissions.expiresAt), sql`${rolePermissions.expiresAt} > NOW()`)
        )
      );

    // Get role details for template inheritance
    const roleDetails = await db
      .select()
      .from(roles)
      .leftJoin(roleTemplates, eq(roles.templateId, roleTemplates.id))
      .where(inArray(roles.id, roleIds));

    // Collect all permissions
    const permissionSet = new Set<number>();

    // Add permissions from role-permission assignments
    rolePerms.forEach(rp => permissionSet.add(rp.permissionId));

    // Add permissions from role templates
    roleDetails.forEach(({ roles: role, role_templates: template }) => {
      if (template?.permissionSet) {
        template.permissionSet.forEach(p => permissionSet.add(p));
      }
      // Add custom permissions from role
      if (role.customPermissions) {
        role.customPermissions.forEach(p => permissionSet.add(p));
      }
    });

    // Get project-specific permissions
    const projectAssigns = await this.getUserProjectAssignments(userId, companyId);
    projectAssigns.forEach(pa => {
      if (pa.permissions) {
        pa.permissions.forEach(p => permissionSet.add(p));
      }
    });

    const effectivePermissions: EffectivePermissions = {
      userId,
      companyId,
      permissions: Array.from(permissionSet),
      roles: roleDetails.map(({ roles: role }) => ({
        id: role.id,
        name: role.name,
        companyId: role.companyId,
        scope: 'company' as const,
      })),
      computedAt: new Date(),
      expiresAt: new Date(Date.now() + 60 * 60 * 1000), // 1 hour
    };

    // Cache the result
    await this.cacheUserPermissions(effectivePermissions);

    return effectivePermissions;
  }

  async invalidateUserPermissions(userId: string, companyId: number): Promise<void> {
    await db
      .delete(userEffectivePermissions)
      .where(
        and(
          eq(userEffectivePermissions.userId, userId),
          eq(userEffectivePermissions.companyId, companyId)
        )
      );
  }

  async cacheUserPermissions(permissions: EffectivePermissions): Promise<void> {
    // First invalidate existing cache
    await this.invalidateUserPermissions(permissions.userId, permissions.companyId);

    // Insert new cache
    await db.insert(userEffectivePermissions).values({
      companyId: permissions.companyId,
      userId: permissions.userId,
      permissions: permissions.permissions,
      roleIds: permissions.roles.map(r => r.id),
      computedAt: permissions.computedAt,
      expiresAt: permissions.expiresAt,
    });
  }

  // Permission Checking
  async hasPermission(userId: string, companyId: number, permissionId: number, context?: PermissionContext): Promise<boolean> {
    const effectivePerms = await this.getUserEffectivePermissions(userId, companyId) ||
                          await this.computeUserEffectivePermissions(userId, companyId);
    
    return effectivePerms.permissions.includes(permissionId);
  }

  async hasAnyPermissions(userId: string, companyId: number, permissionIds: number[], context?: PermissionContext): Promise<boolean> {
    const effectivePerms = await this.getUserEffectivePermissions(userId, companyId) ||
                          await this.computeUserEffectivePermissions(userId, companyId);
    
    return permissionIds.some(pid => effectivePerms.permissions.includes(pid));
  }

  async hasAllPermissions(userId: string, companyId: number, permissionIds: number[], context?: PermissionContext): Promise<boolean> {
    const effectivePerms = await this.getUserEffectivePermissions(userId, companyId) ||
                          await this.computeUserEffectivePermissions(userId, companyId);
    
    return permissionIds.every(pid => effectivePerms.permissions.includes(pid));
  }

  // User Context
  async getUserContext(userId: string, companyId: number): Promise<UserContext | undefined> {
    const user = await this.getUser(userId);
    if (!user) return undefined;

    const effectivePerms = await this.getUserEffectivePermissions(userId, companyId) ||
                          await this.computeUserEffectivePermissions(userId, companyId);

    return {
      id: user.id,
      email: user.email || '',
      firstName: user.firstName,
      lastName: user.lastName,
      currentCompanyId: companyId,
      effectivePermissions: effectivePerms.permissions,
      roles: effectivePerms.roles,
      lastLoginAt: user.lastLoginAt,
      mfaEnabled: user.mfaEnabled || false,
    };
  }

  // Audit Trail
  async logAudit(entry: InsertAuditLog): Promise<AuditLog> {
    const [created] = await db.insert(auditLogs).values(entry).returning();
    return created;
  }

  async getAuditLogs(companyId: number, filters: {
    userId?: string;
    action?: string;
    startDate?: Date;
    endDate?: Date;
    limit?: number;
  } = {}): Promise<AuditLog[]> {
    const conditions = [eq(auditLogs.companyId, companyId)];

    if (filters.userId) {
      conditions.push(eq(auditLogs.userId, filters.userId));
    }
    if (filters.action) {
      conditions.push(eq(auditLogs.action, filters.action));
    }
    if (filters.startDate) {
      conditions.push(sql`${auditLogs.createdAt} >= ${filters.startDate}`);
    }
    if (filters.endDate) {
      conditions.push(sql`${auditLogs.createdAt} <= ${filters.endDate}`);
    }

    const results = await db
      .select()
      .from(auditLogs)
      .where(and(...conditions))
      .orderBy(desc(auditLogs.createdAt))
      .limit(filters.limit || 100);

    return results;
  }

  // Company 0 Management (Platform)
  async isPlatformUser(userId: string): Promise<boolean> {
    const [result] = await db
      .select({ count: sql<number>`count(*)` })
      .from(companyUsers)
      .where(
        and(
          eq(companyUsers.userId, userId),
          eq(companyUsers.companyId, 0), // Company 0 = Platform
          eq(companyUsers.isActive, true)
        )
      );

    return result.count > 0;
  }

  async getPlatformUsers(): Promise<User[]> {
    const results = await db
      .select({ user: users })
      .from(users)
      .innerJoin(companyUsers, eq(users.id, companyUsers.userId))
      .where(
        and(
          eq(companyUsers.companyId, 0),
          eq(companyUsers.isActive, true)
        )
      );
    
    return results.map(r => r.user);
  }

  async promoteToCompany0(userId: string, grantedBy: string): Promise<void> {
    // Create Company 0 if it doesn't exist
    let company0 = await this.getCompany(0);
    if (!company0) {
      company0 = await this.createCompany({
        id: 0,
        name: 'Platform Administration',
        domain: 'platform.towerflow.com',
        status: 'active',
        settings: { isPlatform: true },
      });
    }

    // Assign platform admin role
    await this.assignUserToCompany({
      companyId: 0,
      userId,
      roleId: 1, // Platform admin role
      grantedByUserId: grantedBy,
      grantedAt: new Date(),
    });

    // Log the action
    await this.logAudit({
      companyId: 0,
      userId: grantedBy,
      action: AuditAction.ROLE_ASSIGNED,
      resource: 'user',
      resourceId: userId,
      newValues: { companyId: 0, role: 'platform_admin' },
    });
  }
}

export const rbacStorage = new RBACStorage();