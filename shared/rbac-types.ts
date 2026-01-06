import { z } from "zod";

// ============================================================================
// ROLE TYPES
// ============================================================================

/**
 * Default role names available in the system
 */
export const UserRole = {
  ADMIN: 'admin',
  PROJECT_MANAGER: 'project_manager',
  OFFICE_MANAGER: 'office_manager',
  CREW: 'crew',
  SUBCONTRACTOR: 'subcontractor',
  CLIENT: 'client',
} as const;

export type UserRoleType = typeof UserRole[keyof typeof UserRole];

// ============================================================================
// COMPANY TYPES
// ============================================================================

export const CompanyStatus = {
  ACTIVE: 'active',
  INACTIVE: 'inactive',
} as const;

export type CompanyStatusType = typeof CompanyStatus[keyof typeof CompanyStatus];

export const PlanType = {
  BASIC: 'basic',
  PREMIUM: 'premium',
  ENTERPRISE: 'enterprise',
} as const;

export type PlanTypeType = typeof PlanType[keyof typeof PlanType];

// ============================================================================
// PERMISSION CONTEXT
// ============================================================================

/**
 * Context for permission checks
 * Used by the RBAC middleware to determine access
 */
export interface PermissionContext {
  userId: string;
  companyId: string;
  isRoot: boolean;
  permissions: string[];
  roleId: number;
  roleName: string;
}

/**
 * Simplified user context (one user, one company, one role)
 */
export interface UserContext {
  id: string;
  email: string | null;
  firstName: string | null;
  lastName: string | null;
  companyId: string;
  roleId: number;
  roleName: string;
  roleDisplayName: string;
  permissions: string[];
  isRoot: boolean;
  isActive: boolean;
  lastLoginAt: Date | null;
}

// ============================================================================
// ROLE ASSIGNMENT
// ============================================================================

/**
 * Schema for assigning a role to a user
 */
export const RoleAssignmentSchema = z.object({
  userId: z.string(),
  roleId: z.number(),
  companyId: z.string(),
});

export type RoleAssignmentRequest = z.infer<typeof RoleAssignmentSchema>;

// ============================================================================
// AUDIT ACTIONS
// ============================================================================

export const AuditAction = {
  // User Management
  USER_CREATED: 'user_created',
  USER_UPDATED: 'user_updated',
  USER_DEACTIVATED: 'user_deactivated',
  USER_LOGIN: 'user_login',
  USER_LOGOUT: 'user_logout',
  USER_PASSWORD_CHANGED: 'user_password_changed',
  
  // Role Management
  ROLE_ASSIGNED: 'role_assigned',
  ROLE_CREATED: 'role_created',
  ROLE_UPDATED: 'role_updated',
  ROLE_DELETED: 'role_deleted',
  
  // Permission Management
  PERMISSION_GRANTED: 'permission_granted',
  PERMISSION_REVOKED: 'permission_revoked',
  
  // Data Access
  DATA_VIEWED: 'data_viewed',
  DATA_EXPORTED: 'data_exported',
  DATA_CREATED: 'data_created',
  DATA_UPDATED: 'data_updated',
  DATA_DELETED: 'data_deleted',
  
  // Security Events
  PERMISSION_DENIED: 'permission_denied',
  INVALID_LOGIN_ATTEMPT: 'invalid_login_attempt',
  SESSION_EXPIRED: 'session_expired',
} as const;

export type AuditActionType = typeof AuditAction[keyof typeof AuditAction];

// ============================================================================
// RBAC MIDDLEWARE OPTIONS
// ============================================================================

/**
 * Options for RBAC permission checks
 */
export interface RBACOptions {
  requiredPermissions: string[];
  requireAll?: boolean; // true = AND logic, false = OR logic
  allowRoot?: boolean; // Root user bypasses all checks
}

// ============================================================================
// COMPANY SETTINGS
// ============================================================================

export interface CompanySettings {
  sessionTimeout: number; // minutes
  passwordPolicy: {
    minLength: number;
    requireUppercase: boolean;
    requireNumbers: boolean;
    requireSymbols: boolean;
  };
  auditRetention: number; // days
  allowedDomains?: string[]; // restrict email domains
  maxUsers?: number; // based on plan
}

export const DEFAULT_COMPANY_SETTINGS: CompanySettings = {
  sessionTimeout: 480, // 8 hours
  passwordPolicy: {
    minLength: 8,
    requireUppercase: true,
    requireNumbers: true,
    requireSymbols: false,
  },
  auditRetention: 365, // 1 year
};

// ============================================================================
// ERROR TYPES
// ============================================================================

export class RBACError extends Error {
  constructor(
    message: string,
    public code: string,
    public context?: Record<string, any>
  ) {
    super(message);
    this.name = 'RBACError';
  }
}

export class PermissionDeniedError extends RBACError {
  constructor(
    requiredPermissions: string[],
    userPermissions: string[],
    context?: Record<string, any>
  ) {
    super(
      `Permission denied. Required: ${requiredPermissions.join(', ')}, User has: ${userPermissions.join(', ')}`,
      'PERMISSION_DENIED',
      { requiredPermissions, userPermissions, ...context }
    );
  }
}

export class CompanyAccessError extends RBACError {
  constructor(companyId: string, userId: string, context?: Record<string, any>) {
    super(
      `User ${userId} does not have access to company ${companyId}`,
      'COMPANY_ACCESS_DENIED',
      { companyId, userId, ...context }
    );
  }
}

export class UserNotFoundError extends RBACError {
  constructor(userId: string, context?: Record<string, any>) {
    super(
      `User ${userId} not found`,
      'USER_NOT_FOUND',
      { userId, ...context }
    );
  }
}

export class RoleNotFoundError extends RBACError {
  constructor(roleId: number, context?: Record<string, any>) {
    super(
      `Role ${roleId} not found`,
      'ROLE_NOT_FOUND',
      { roleId, ...context }
    );
  }
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Check if user has a specific permission
 */
export function hasPermission(
  context: PermissionContext,
  requiredPermission: string
): boolean {
  if (context.isRoot) return true;
  return context.permissions.includes(requiredPermission);
}

/**
 * Check if user has any of the specified permissions
 */
export function hasAnyPermission(
  context: PermissionContext,
  requiredPermissions: string[]
): boolean {
  if (context.isRoot) return true;
  return requiredPermissions.some(p => context.permissions.includes(p));
}

/**
 * Check if user has all of the specified permissions
 */
export function hasAllPermissions(
  context: PermissionContext,
  requiredPermissions: string[]
): boolean {
  if (context.isRoot) return true;
  return requiredPermissions.every(p => context.permissions.includes(p));
}

/**
 * Check RBAC options against user context
 */
export function checkPermissions(
  context: PermissionContext,
  options: RBACOptions
): boolean {
  // Root user bypasses all checks if allowed
  if (options.allowRoot !== false && context.isRoot) {
    return true;
  }
  
  const { requiredPermissions, requireAll = true } = options;
  
  if (requireAll) {
    return hasAllPermissions(context, requiredPermissions);
  } else {
    return hasAnyPermission(context, requiredPermissions);
  }
}
