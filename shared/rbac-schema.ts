/**
 * RBAC Schema - Re-exports from main schema
 * 
 * This file provides backward compatibility for code that imports from rbac-schema.
 * The actual schema definitions are now in schema.ts with a simplified model:
 * 
 * - Each user belongs to ONE company (users.companyId)
 * - Each user has ONE role (users.roleId)
 * - Roles have permissions via role_permissions table
 * - There is ONE root user (users.isRoot = true)
 */

// Re-export all RBAC-related tables and types from the main schema
export {
  // Tables
  companies,
  users,
  roles,
  permissions,
  rolePermissions,
  auditLogs,
  
  // Zod Schemas
  insertCompanySchema,
  insertUserSchema,
  upsertUserSchema,
  insertRoleSchema,
  insertPermissionSchema,
  insertRolePermissionSchema,
  insertAuditLogSchema,
  
  // Types
  type Company,
  type InsertCompany,
  type User,
  type InsertUser,
  type UpsertUser,
  type Role,
  type InsertRole,
  type Permission,
  type InsertPermission,
  type RolePermission,
  type InsertRolePermission,
  type AuditLog,
  type InsertAuditLog,
  
  // Permission constants
  PERMISSIONS,
  type PermissionName,
} from './schema';

// ============================================================================
// RBAC HELPER TYPES
// ============================================================================

/**
 * User with role information
 */
export interface UserWithRole {
  id: string;
  email: string | null;
  firstName: string | null;
  lastName: string | null;
  companyId: string;
  roleId: number;
  isRoot: boolean;
  isActive: boolean;
  role?: {
    id: number;
    name: string;
    displayName: string;
  };
  company?: {
    id: string;
    name: string;
  };
}

/**
 * Role with permissions
 */
export interface RoleWithPermissions {
  id: number;
  companyId: string | null;
  name: string;
  displayName: string;
  description: string | null;
  isSystemRole: boolean;
  isActive: boolean;
  permissions: string[];
}

/**
 * Permission check context
 */
export interface PermissionContext {
  userId: string;
  companyId: string;
  isRoot: boolean;
  permissions: string[];
}

/**
 * Check if user has a specific permission
 */
export function hasPermission(
  context: PermissionContext,
  requiredPermission: string
): boolean {
  // Root user has all permissions
  if (context.isRoot) {
    return true;
  }
  
  return context.permissions.includes(requiredPermission);
}

/**
 * Check if user has any of the specified permissions
 */
export function hasAnyPermission(
  context: PermissionContext,
  requiredPermissions: string[]
): boolean {
  // Root user has all permissions
  if (context.isRoot) {
    return true;
  }
  
  return requiredPermissions.some(p => context.permissions.includes(p));
}

/**
 * Check if user has all of the specified permissions
 */
export function hasAllPermissions(
  context: PermissionContext,
  requiredPermissions: string[]
): boolean {
  // Root user has all permissions
  if (context.isRoot) {
    return true;
  }
  
  return requiredPermissions.every(p => context.permissions.includes(p));
}

// ============================================================================
// DEFAULT ROLE DEFINITIONS
// ============================================================================

/**
 * Default roles that should be created for each company
 */
export const DEFAULT_ROLES = {
  ADMIN: {
    name: 'admin',
    displayName: 'Administrator',
    description: 'Full access to all company features',
    isSystemRole: true,
  },
  PROJECT_MANAGER: {
    name: 'project_manager',
    displayName: 'Project Manager',
    description: 'Can manage projects, tasks, and team members',
    isSystemRole: true,
  },
  OFFICE_MANAGER: {
    name: 'office_manager',
    displayName: 'Office Manager',
    description: 'Can manage administrative tasks and reports',
    isSystemRole: true,
  },
  CREW: {
    name: 'crew',
    displayName: 'Crew Member',
    description: 'Can view and update assigned tasks',
    isSystemRole: true,
  },
  SUBCONTRACTOR: {
    name: 'subcontractor',
    displayName: 'Subcontractor',
    description: 'External contractor with limited access',
    isSystemRole: true,
  },
  CLIENT: {
    name: 'client',
    displayName: 'Client',
    description: 'Project stakeholder with read-only access',
    isSystemRole: true,
  },
} as const;

export type DefaultRoleName = keyof typeof DEFAULT_ROLES;

/**
 * Default permissions for each role
 */
export const DEFAULT_ROLE_PERMISSIONS: Record<DefaultRoleName, string[]> = {
  ADMIN: [
    'users.view', 'users.create', 'users.edit', 'users.delete',
    'projects.view', 'projects.create', 'projects.edit', 'projects.delete',
    'tasks.view', 'tasks.create', 'tasks.edit', 'tasks.delete', 'tasks.assign',
    'financials.view', 'financials.edit', 'invoices.create', 'invoices.approve',
    'photos.view', 'photos.upload', 'photos.delete',
    'reports.view', 'reports.export',
    'company.settings', 'roles.manage',
    'client_portal.view', 'client_portal.issues.create',
  ],
  PROJECT_MANAGER: [
    'users.view',
    'projects.view', 'projects.create', 'projects.edit',
    'tasks.view', 'tasks.create', 'tasks.edit', 'tasks.delete', 'tasks.assign',
    'financials.view',
    'photos.view', 'photos.upload',
    'reports.view', 'reports.export',
    'client_portal.view', 'client_portal.issues.create',
  ],
  OFFICE_MANAGER: [
    'users.view',
    'projects.view',
    'tasks.view', 'tasks.create', 'tasks.edit',
    'financials.view', 'financials.edit', 'invoices.create',
    'photos.view',
    'reports.view', 'reports.export',
  ],
  CREW: [
    'projects.view',
    'tasks.view', 'tasks.edit',
    'photos.view', 'photos.upload',
  ],
  SUBCONTRACTOR: [
    'projects.view',
    'tasks.view', 'tasks.edit',
    'photos.view', 'photos.upload',
  ],
  CLIENT: [
    'projects.view',
    'photos.view',
    'client_portal.view', 'client_portal.issues.create',
  ],
};
