import { sql } from 'drizzle-orm';
import {
  pgTable,
  serial,
  varchar,
  text,
  timestamp,
  boolean,
  integer,
  jsonb,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// COMPANY MANAGEMENT
export const companies = pgTable("companies", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  domain: varchar("domain", { length: 255 }).unique(),
  status: varchar("status", { length: 50 }).notNull().default("active"),
  settings: jsonb("settings").default({}),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("companies_status_idx").on(table.status),
]);

// USERS TABLE (Updated for RBAC)
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: varchar("email").unique(),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  isActive: boolean("is_active").default(true),
  lastLoginAt: timestamp("last_login_at"),
  mfaEnabled: boolean("mfa_enabled").default(false),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("users_email_idx").on(table.email),
  index("users_active_idx").on(table.isActive),
]);

// ROLE TEMPLATES (Global templates to prevent role explosion)
export const roleTemplates = pgTable("role_templates", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  category: varchar("category", { length: 100 }).notNull(), // platform, company, project
  permissionSet: integer("permission_set").array().notNull(), // Array of permission integers
  isSystemTemplate: boolean("is_system_template").default(false),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("role_templates_category_idx").on(table.category),
  uniqueIndex("role_templates_name_category_idx").on(table.name, table.category),
]);

// COMPANY-SPECIFIC ROLES (Inherit from templates)
export const roles = pgTable("roles", {
  id: serial("id").primaryKey(),
  companyId: integer("company_id").references(() => companies.id).notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  templateId: integer("template_id").references(() => roleTemplates.id),
  customPermissions: integer("custom_permissions").array().default([]), // Additional permissions
  isTemplate: boolean("is_template").default(false),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("roles_company_idx").on(table.companyId),
  index("roles_template_idx").on(table.templateId),
  uniqueIndex("roles_company_name_idx").on(table.companyId, table.name),
]);

// PERMISSIONS REGISTRY (Integer-based for performance)
export const permissions = pgTable("permissions", {
  id: integer("id").primaryKey(), // 1-49 range for type safety
  name: varchar("name", { length: 255 }).notNull().unique(),
  resource: varchar("resource", { length: 100 }).notNull(),
  action: varchar("action", { length: 100 }).notNull(),
  description: text("description"),
  category: varchar("category", { length: 100 }).notNull(), // platform, company, project
  requiresElevation: boolean("requires_elevation").default(false),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("permissions_category_idx").on(table.category),
  index("permissions_resource_action_idx").on(table.resource, table.action),
]);

// COMPANY USER ASSIGNMENTS (with RLS)
export const companyUsers = pgTable("company_users", {
  id: serial("id").primaryKey(),
  companyId: integer("company_id").references(() => companies.id).notNull(),
  userId: varchar("user_id").references(() => users.id).notNull(),
  roleId: integer("role_id").references(() => roles.id).notNull(),
  grantedByUserId: varchar("granted_by_user_id").references(() => users.id),
  grantedAt: timestamp("granted_at").defaultNow(),
  expiresAt: timestamp("expires_at"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("company_users_company_idx").on(table.companyId),
  index("company_users_user_idx").on(table.userId),
  index("company_users_role_idx").on(table.roleId),
  uniqueIndex("company_users_unique_idx").on(table.companyId, table.userId, table.roleId),
]);

// ROLE PERMISSIONS MAPPING (with ABAC rules)
export const rolePermissions = pgTable("role_permissions", {
  id: serial("id").primaryKey(),
  companyId: integer("company_id").references(() => companies.id).notNull(),
  roleId: integer("role_id").references(() => roles.id).notNull(),
  permissionId: integer("permission_id").references(() => permissions.id).notNull(),
  abacRule: jsonb("abac_rule"), // JSON rules for complex logic
  grantedByUserId: varchar("granted_by_user_id").references(() => users.id),
  grantedAt: timestamp("granted_at").defaultNow(),
  expiresAt: timestamp("expires_at"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("role_permissions_company_idx").on(table.companyId),
  index("role_permissions_role_idx").on(table.roleId),
  index("role_permissions_permission_idx").on(table.permissionId),
  uniqueIndex("role_permissions_unique_idx").on(table.companyId, table.roleId, table.permissionId),
]);

// PERFORMANCE OPTIMIZATION: Cached effective permissions
export const userEffectivePermissions = pgTable("user_effective_permissions", {
  id: serial("id").primaryKey(),
  companyId: integer("company_id").references(() => companies.id).notNull(),
  userId: varchar("user_id").references(() => users.id).notNull(),
  permissions: jsonb("permissions").notNull(), // Cached permission array
  roleIds: integer("role_ids").array().notNull(), // Role IDs for invalidation
  computedAt: timestamp("computed_at").defaultNow(),
  expiresAt: timestamp("expires_at").notNull(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("user_effective_permissions_lookup_idx").on(table.companyId, table.userId),
  index("user_effective_permissions_expires_idx").on(table.expiresAt),
  uniqueIndex("user_effective_permissions_unique_idx").on(table.companyId, table.userId),
]);

// PROJECT ASSIGNMENTS (Project-specific access)
export const projectAssignments = pgTable("project_assignments", {
  id: serial("id").primaryKey(),
  companyId: integer("company_id").references(() => companies.id).notNull(),
  projectId: integer("project_id").notNull(), // FK to projects table
  userId: varchar("user_id").references(() => users.id).notNull(),
  roleId: integer("role_id").references(() => roles.id).notNull(),
  permissions: integer("permissions").array().default([]), // Project-specific permissions
  grantedByUserId: varchar("granted_by_user_id").references(() => users.id),
  grantedAt: timestamp("granted_at").defaultNow(),
  expiresAt: timestamp("expires_at"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("project_assignments_company_idx").on(table.companyId),
  index("project_assignments_project_idx").on(table.projectId),
  index("project_assignments_user_idx").on(table.userId),
  uniqueIndex("project_assignments_unique_idx").on(table.companyId, table.projectId, table.userId),
]);

// AUDIT TRAIL
export const auditLogs = pgTable("audit_logs", {
  id: serial("id").primaryKey(),
  companyId: integer("company_id").references(() => companies.id).notNull(),
  userId: varchar("user_id").references(() => users.id).notNull(),
  action: varchar("action", { length: 100 }).notNull(),
  resource: varchar("resource", { length: 100 }).notNull(),
  resourceId: varchar("resource_id"),
  oldValues: jsonb("old_values"),
  newValues: jsonb("new_values"),
  ipAddress: varchar("ip_address", { length: 45 }),
  userAgent: text("user_agent"),
  sessionId: varchar("session_id"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("audit_logs_company_idx").on(table.companyId),
  index("audit_logs_user_idx").on(table.userId),
  index("audit_logs_action_idx").on(table.action),
  index("audit_logs_created_idx").on(table.createdAt),
]);

// RELATIONS
export const companiesRelations = relations(companies, ({ many }) => ({
  users: many(companyUsers),
  roles: many(roles),
  auditLogs: many(auditLogs),
}));

export const usersRelations = relations(users, ({ many }) => ({
  companyMemberships: many(companyUsers),
  projectAssignments: many(projectAssignments),
  auditLogs: many(auditLogs),
}));

export const roleTemplatesRelations = relations(roleTemplates, ({ many }) => ({
  roles: many(roles),
}));

export const rolesRelations = relations(roles, ({ one, many }) => ({
  company: one(companies, {
    fields: [roles.companyId],
    references: [companies.id],
  }),
  template: one(roleTemplates, {
    fields: [roles.templateId],
    references: [roleTemplates.id],
  }),
  companyUsers: many(companyUsers),
  permissions: many(rolePermissions),
  projectAssignments: many(projectAssignments),
}));

export const permissionsRelations = relations(permissions, ({ many }) => ({
  rolePermissions: many(rolePermissions),
}));

export const companyUsersRelations = relations(companyUsers, ({ one }) => ({
  company: one(companies, {
    fields: [companyUsers.companyId],
    references: [companies.id],
  }),
  user: one(users, {
    fields: [companyUsers.userId],
    references: [users.id],
  }),
  role: one(roles, {
    fields: [companyUsers.roleId],
    references: [roles.id],
  }),
}));

export const rolePermissionsRelations = relations(rolePermissions, ({ one }) => ({
  company: one(companies, {
    fields: [rolePermissions.companyId],
    references: [companies.id],
  }),
  role: one(roles, {
    fields: [rolePermissions.roleId],
    references: [roles.id],
  }),
  permission: one(permissions, {
    fields: [rolePermissions.permissionId],
    references: [permissions.id],
  }),
}));

// TYPE EXPORTS
export type Company = typeof companies.$inferSelect;
export type User = typeof users.$inferSelect;
export type UpsertUser = typeof users.$inferInsert;
export type RoleTemplate = typeof roleTemplates.$inferSelect;
export type Role = typeof roles.$inferSelect;
export type Permission = typeof permissions.$inferSelect;
export type CompanyUser = typeof companyUsers.$inferSelect;
export type RolePermission = typeof rolePermissions.$inferSelect;
export type UserEffectivePermission = typeof userEffectivePermissions.$inferSelect;
export type ProjectAssignment = typeof projectAssignments.$inferSelect;
export type AuditLog = typeof auditLogs.$inferSelect;

// INSERT SCHEMAS
export const insertCompanySchema = createInsertSchema(companies);
export const insertUserSchema = createInsertSchema(users);
export const insertRoleTemplateSchema = createInsertSchema(roleTemplates);
export const insertRoleSchema = createInsertSchema(roles);
export const insertPermissionSchema = createInsertSchema(permissions);
export const insertCompanyUserSchema = createInsertSchema(companyUsers);
export const insertRolePermissionSchema = createInsertSchema(rolePermissions);
export const insertProjectAssignmentSchema = createInsertSchema(projectAssignments);
export const insertAuditLogSchema = createInsertSchema(auditLogs);

export type InsertCompany = z.infer<typeof insertCompanySchema>;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type InsertRoleTemplate = z.infer<typeof insertRoleTemplateSchema>;
export type InsertRole = z.infer<typeof insertRoleSchema>;
export type InsertPermission = z.infer<typeof insertPermissionSchema>;
export type InsertCompanyUser = z.infer<typeof insertCompanyUserSchema>;
export type InsertRolePermission = z.infer<typeof insertRolePermissionSchema>;
export type InsertProjectAssignment = z.infer<typeof insertProjectAssignmentSchema>;
export type InsertAuditLog = z.infer<typeof insertAuditLogSchema>;

// PERMISSION CONSTANTS (Integer-based for type safety)
export const PERMISSIONS = {
  // Platform Admin (1-9) - Company 0 only
  SYSTEM_ADMIN: 1,
  IMPERSONATE_USER: 2,
  MANAGE_COMPANIES: 3,
  PLATFORM_ANALYTICS: 4,
  
  // Company Admin (10-19)
  MANAGE_USERS: 10,
  VIEW_FINANCIALS: 11,
  EDIT_FINANCIALS: 12,
  CLONE_ROLES: 13,
  COMPANY_SETTINGS: 14,
  EXPORT_DATA: 15,
  
  // Project Manager (20-29)
  VIEW_ALL_PROJECTS: 20,
  MANAGE_TASKS: 21,
  ASSIGN_SUBCONTRACTORS: 22,
  APPROVE_BUDGETS: 23,
  PROJECT_REPORTS: 24,
  SCHEDULE_MANAGEMENT: 25,
  
  // Subcontractor (30-39)
  VIEW_ASSIGNED_PROJECTS: 30,
  UPDATE_TASK_STATUS: 31,
  UPLOAD_PHOTOS: 32,
  VIEW_PROJECT_DOCS: 33,
  SUBMIT_REPORTS: 34,
  
  // Client (40-49)
  VIEW_PROJECT_PROGRESS: 40,
  VIEW_PHOTOS: 41,
  COMMENT_ON_UPDATES: 42,
  REQUEST_CHANGES: 43,
  DOWNLOAD_REPORTS: 44,
  CLIENT_PORTAL: 45,
} as const;

export type PermissionId = typeof PERMISSIONS[keyof typeof PERMISSIONS];