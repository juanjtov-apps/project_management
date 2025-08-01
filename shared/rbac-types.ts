import { z } from "zod";

// USER ROLE TYPES
export const UserRole = {
  PLATFORM_ADMIN: 'platform_admin',
  COMPANY_ADMIN: 'company_admin', 
  PROJECT_MANAGER: 'project_manager',
  SUBCONTRACTOR: 'subcontractor',
  CLIENT: 'client',
  VIEWER: 'viewer',
} as const;

export type UserRoleType = typeof UserRole[keyof typeof UserRole];

// COMPANY TYPES
export const CompanyStatus = {
  ACTIVE: 'active',
  SUSPENDED: 'suspended',
  PENDING: 'pending',
} as const;

export type CompanyStatusType = typeof CompanyStatus[keyof typeof CompanyStatus];

// PERMISSION CONTEXT
export interface PermissionContext {
  companyId: number;
  userId: string;
  projectId?: number;
  resourceId?: string;
  ipAddress?: string;
  userAgent?: string;
}

// ABAC RULE STRUCTURE
export interface ABACRule {
  condition: string; // JSON-logic expression
  attributes: Record<string, any>;
  description?: string;
}

// EFFECTIVE PERMISSIONS STRUCTURE
export interface EffectivePermissions {
  userId: string;
  companyId: number;
  permissions: number[];
  roles: Array<{
    id: number;
    name: string;
    scope: 'company' | 'project';
    projectId?: number;
  }>;
  computedAt: Date;
  expiresAt: Date;
}

// ROLE ASSIGNMENT REQUEST
export const RoleAssignmentSchema = z.object({
  userId: z.string(),
  roleId: z.number(),
  companyId: z.number(),
  projectId: z.number().optional(),
  expiresAt: z.date().optional(),
  permissions: z.array(z.number()).optional(),
});

export type RoleAssignmentRequest = z.infer<typeof RoleAssignmentSchema>;

// USER CONTEXT (for session management)
export interface UserContext {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  currentCompanyId: number;
  effectivePermissions: number[];
  roles: Array<{
    id: number;
    name: string;
    companyId: number;
    scope: 'company' | 'project';
    projectId?: number;
  }>;
  lastLoginAt: Date | null;
  mfaEnabled: boolean;
}

// AUDIT ACTION TYPES
export const AuditAction = {
  // User Management
  USER_CREATED: 'user_created',
  USER_UPDATED: 'user_updated',
  USER_DEACTIVATED: 'user_deactivated',
  USER_LOGIN: 'user_login',
  USER_LOGOUT: 'user_logout',
  
  // Role Management
  ROLE_ASSIGNED: 'role_assigned',
  ROLE_REVOKED: 'role_revoked',
  ROLE_CREATED: 'role_created',
  ROLE_UPDATED: 'role_updated',
  
  // Permission Management
  PERMISSION_GRANTED: 'permission_granted',
  PERMISSION_REVOKED: 'permission_revoked',
  
  // Data Access
  DATA_VIEWED: 'data_viewed',
  DATA_EXPORTED: 'data_exported',
  DATA_MODIFIED: 'data_modified',
  
  // Security Events
  MFA_ENABLED: 'mfa_enabled',
  MFA_DISABLED: 'mfa_disabled',
  SUSPICIOUS_LOGIN: 'suspicious_login',
  PERMISSION_DENIED: 'permission_denied',
} as const;

export type AuditActionType = typeof AuditAction[keyof typeof AuditAction];

// RBAC MIDDLEWARE OPTIONS
export interface RBACOptions {
  requiredPermissions: number[];
  requireAll?: boolean; // AND vs OR logic
  companyId?: number;
  projectId?: number;
  allowSuperAdmin?: boolean;
  abacRules?: ABACRule[];
}

// COMPANY SETTINGS
export interface CompanySettings {
  mfaRequired: boolean;
  sessionTimeout: number; // minutes
  passwordPolicy: {
    minLength: number;
    requireUppercase: boolean;
    requireNumbers: boolean;
    requireSymbols: boolean;
  };
  auditRetention: number; // days
  allowCrossCompanyAccess: boolean;
  financialDataElevation: boolean;
}

// ERROR TYPES
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
    requiredPermissions: number[],
    userPermissions: number[],
    context?: Record<string, any>
  ) {
    super(
      `Permission denied. Required: ${requiredPermissions.join(', ')}, User has: ${userPermissions.join(', ')}`,
      'PERMISSION_DENIED',
      { requiredPermissions, userPermissions, ...context }
    );
  }
}

export class InsufficientRoleError extends RBACError {
  constructor(requiredRole: string, userRole: string, context?: Record<string, any>) {
    super(
      `Insufficient role. Required: ${requiredRole}, User has: ${userRole}`,
      'INSUFFICIENT_ROLE',
      { requiredRole, userRole, ...context }
    );
  }
}

export class CompanyAccessError extends RBACError {
  constructor(companyId: number, userId: string, context?: Record<string, any>) {
    super(
      `User ${userId} does not have access to company ${companyId}`,
      'COMPANY_ACCESS_DENIED',
      { companyId, userId, ...context }
    );
  }
}