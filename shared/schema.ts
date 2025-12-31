import { sql } from 'drizzle-orm';
import {
  index,
  jsonb,
  pgTable,
  timestamp,
  varchar,
  text,
  integer,
  boolean,
  serial,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// ============================================================================
// SESSION STORAGE (Required for Auth)
// ============================================================================

export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire", { withTimezone: true }).notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)],
);

// ============================================================================
// COMPANY & RBAC TABLES
// ============================================================================

// Companies table for multi-tenant support
export const companies = pgTable("companies", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  industry: text("industry").default("construction"),
  address: text("address"),
  phone: varchar("phone"),
  email: varchar("email"),
  website: text("website"),
  logo: text("logo"),
  domain: text("domain").unique(), // for domain-based access
  settings: jsonb("settings"), // company-specific settings
  planType: text("plan_type").notNull().default("basic"), // basic, premium, enterprise
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
}, (table) => [
  index("companies_is_active_idx").on(table.isActive),
  index("companies_plan_type_idx").on(table.planType),
]);

// Roles table - global roles shared across all companies
export const roles = pgTable("roles", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 100 }), // e.g., "admin", "project_manager", "crew", "subcontractor", "client"
  roleName: varchar("role_name", { length: 255 }).notNull(), // legacy field
  displayName: varchar("display_name", { length: 255 }).notNull(), // e.g., "Administrator", "Project Manager"
  description: text("description"),
  isSystemRole: boolean("is_system_role").notNull().default(false), // true for default roles that can't be deleted
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
}, (table) => [
  index("roles_is_active_idx").on(table.isActive),
]);

// Permissions registry - all available permissions in the system
export const permissions = pgTable("permissions", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 100 }).notNull().unique(), // e.g., "projects.view", "projects.create"
  resource: varchar("resource", { length: 100 }).notNull(), // e.g., "projects", "tasks", "users"
  action: varchar("action", { length: 100 }).notNull(), // e.g., "view", "create", "edit", "delete"
  description: text("description"),
  category: varchar("category", { length: 100 }).notNull(), // e.g., "project_management", "user_management", "financial"
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
}, (table) => [
  index("permissions_resource_idx").on(table.resource),
  index("permissions_category_idx").on(table.category),
  uniqueIndex("permissions_resource_action_idx").on(table.resource, table.action),
]);

// Role-Permission mapping - defines which permissions each role has
export const rolePermissions = pgTable("role_permissions", {
  id: serial("id").primaryKey(),
  roleId: integer("role_id").notNull().references(() => roles.id, { onDelete: 'cascade' }),
  permissionId: integer("permission_id").notNull().references(() => permissions.id, { onDelete: 'cascade' }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
}, (table) => [
  index("role_permissions_role_id_idx").on(table.roleId),
  index("role_permissions_permission_id_idx").on(table.permissionId),
  uniqueIndex("role_permissions_unique_idx").on(table.roleId, table.permissionId),
]);

// ============================================================================
// USERS TABLE
// ============================================================================

// Users table - each user belongs to ONE company and has ONE role
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: varchar("email").unique(),
  username: text("username").unique(),
  password: text("password"),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  name: text("name"), // Full name (computed or stored)
  profileImageUrl: varchar("profile_image_url"),
  
  // RBAC fields - Each user has ONE company and ONE role
  companyId: varchar("company_id").notNull().references(() => companies.id, { onDelete: 'restrict' }),
  roleId: integer("role_id").notNull().references(() => roles.id, { onDelete: 'restrict' }),
  
  // Special flags
  isRoot: boolean("is_root").notNull().default(false), // TRUE for the ONE root/platform admin
  isActive: boolean("is_active").notNull().default(true),
  
  // Timestamps
  lastLoginAt: timestamp("last_login_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
}, (table) => [
  index("users_company_id_idx").on(table.companyId),
  index("users_role_id_idx").on(table.roleId),
  index("users_is_active_idx").on(table.isActive),
  index("users_email_idx").on(table.email),
]);

// ============================================================================
// PROJECT MANAGEMENT TABLES
// ============================================================================

export const projects = pgTable("projects", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  companyId: varchar("company_id").notNull().references(() => companies.id, { onDelete: 'restrict' }),
  name: text("name").notNull(),
  description: text("description"),
  location: text("location").notNull(),
  status: text("status").notNull().default("active"), // active, completed, on-hold, delayed
  progress: integer("progress").notNull().default(0), // 0-100
  dueDate: timestamp("due_date", { withTimezone: true }),
  budget: integer("budget"), // total project budget in cents
  actualCost: integer("actual_cost").default(0), // actual cost so far in cents
  clientName: text("client_name"),
  clientEmail: varchar("client_email"),
  clientPhone: varchar("client_phone"),
  coverPhotoId: varchar("cover_photo_id"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
}, (table) => [
  index("projects_company_id_idx").on(table.companyId),
  index("projects_status_idx").on(table.status),
  index("projects_due_date_idx").on(table.dueDate),
]);

export const tasks = pgTable("tasks", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  companyId: varchar("company_id").notNull().references(() => companies.id, { onDelete: 'restrict' }),
  projectId: varchar("project_id").references(() => projects.id, { onDelete: 'cascade' }), // null for general/admin tasks
  assigneeId: varchar("assignee_id").references(() => users.id, { onDelete: 'set null' }),
  title: text("title").notNull(),
  description: text("description"),
  category: text("category").notNull().default("project"), // project, administrative, general, subcontractor
  status: text("status").notNull().default("pending"), // pending, in-progress, completed, blocked
  priority: text("priority").notNull().default("medium"), // low, medium, high, critical
  dueDate: timestamp("due_date", { withTimezone: true }),
  completedAt: timestamp("completed_at", { withTimezone: true }),
  isMilestone: boolean("is_milestone").notNull().default(false),
  estimatedHours: integer("estimated_hours"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
}, (table) => [
  index("tasks_company_id_idx").on(table.companyId),
  index("tasks_project_id_idx").on(table.projectId),
  index("tasks_assignee_id_idx").on(table.assigneeId),
  index("tasks_status_idx").on(table.status),
  index("tasks_due_date_idx").on(table.dueDate),
]);

export const projectLogs = pgTable("project_logs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  projectId: varchar("project_id").notNull().references(() => projects.id, { onDelete: 'cascade' }),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: 'restrict' }),
  title: text("title").notNull(),
  content: text("content").notNull(),
  type: text("type").notNull().default("general"), // general, issue, milestone, safety
  status: text("status").notNull().default("open"), // open, in-progress, resolved, closed
  images: text("images").array(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  index("project_logs_project_id_idx").on(table.projectId),
  index("project_logs_user_id_idx").on(table.userId),
  index("project_logs_type_idx").on(table.type),
]);

export const photos = pgTable("photos", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  projectId: varchar("project_id").notNull().references(() => projects.id, { onDelete: 'cascade' }),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: 'restrict' }),
  filename: text("filename").notNull(),
  originalName: text("original_name").notNull(),
  description: text("description"),
  tags: text("tags").array(),
  fileSize: integer("file_size"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  index("photos_project_id_idx").on(table.projectId),
  index("photos_user_id_idx").on(table.userId),
]);

// ============================================================================
// ACTIVITY & NOTIFICATION TABLES
// ============================================================================

export const userActivities = pgTable("user_activities", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  companyId: varchar("company_id").notNull().references(() => companies.id, { onDelete: 'cascade' }),
  actionType: text("action_type").notNull(),
  description: text("description").notNull(),
  entityType: text("entity_type"),
  entityId: varchar("entity_id"),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  index("user_activities_user_id_idx").on(table.userId),
  index("user_activities_company_id_idx").on(table.companyId),
  index("user_activities_created_at_idx").on(table.createdAt),
]);

export const notifications = pgTable("notifications", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  title: text("title").notNull(),
  message: text("message").notNull(),
  type: text("type").notNull().default("info"), // info, warning, error, success
  isRead: boolean("is_read").notNull().default(false),
  relatedEntityType: text("related_entity_type"),
  relatedEntityId: varchar("related_entity_id"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  index("notifications_user_id_idx").on(table.userId),
  index("notifications_user_read_idx").on(table.userId, table.isRead),
  index("notifications_created_at_idx").on(table.createdAt),
]);

// ============================================================================
// SCHEDULE & TIME TRACKING TABLES
// ============================================================================

export const scheduleChanges = pgTable("schedule_changes", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  taskId: varchar("task_id").notNull().references(() => tasks.id, { onDelete: 'cascade' }),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: 'restrict' }),
  reason: text("reason").notNull(),
  originalDate: timestamp("original_date", { withTimezone: true }).notNull(),
  newDate: timestamp("new_date", { withTimezone: true }).notNull(),
  status: text("status").notNull().default("pending"), // pending, approved, rejected
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  index("schedule_changes_task_id_idx").on(table.taskId),
  index("schedule_changes_user_id_idx").on(table.userId),
]);

export const timeEntries = pgTable("time_entries", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: 'restrict' }),
  projectId: varchar("project_id").references(() => projects.id, { onDelete: 'cascade' }),
  taskId: varchar("task_id").references(() => tasks.id, { onDelete: 'set null' }),
  description: text("description").notNull(),
  startTime: timestamp("start_time", { withTimezone: true }).notNull(),
  endTime: timestamp("end_time", { withTimezone: true }),
  totalMinutes: integer("total_minutes"), // stored in minutes for precision
  hourlyRate: integer("hourly_rate"), // in cents per hour
  billable: boolean("billable").notNull().default(true),
  approved: boolean("approved").notNull().default(false),
  approvedBy: varchar("approved_by").references(() => users.id, { onDelete: 'set null' }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  index("time_entries_user_id_idx").on(table.userId),
  index("time_entries_project_id_idx").on(table.projectId),
  index("time_entries_start_time_idx").on(table.startTime),
]);

// ============================================================================
// SUBCONTRACTOR TABLES
// ============================================================================

export const subcontractorAssignments = pgTable("subcontractor_assignments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  subcontractorId: varchar("subcontractor_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  projectId: varchar("project_id").notNull().references(() => projects.id, { onDelete: 'cascade' }),
  assignedBy: varchar("assigned_by").notNull().references(() => users.id, { onDelete: 'restrict' }),
  startDate: timestamp("start_date", { withTimezone: true }),
  endDate: timestamp("end_date", { withTimezone: true }),
  specialization: text("specialization"),
  status: text("status").notNull().default("active"), // active, completed, terminated
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  index("subcontractor_assignments_subcontractor_id_idx").on(table.subcontractorId),
  index("subcontractor_assignments_project_id_idx").on(table.projectId),
  uniqueIndex("subcontractor_assignments_unique_idx").on(table.subcontractorId, table.projectId),
]);

// ============================================================================
// PROJECT HEALTH & RISK TABLES
// ============================================================================

export const projectHealthMetrics = pgTable("project_health_metrics", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  projectId: varchar("project_id").notNull().references(() => projects.id, { onDelete: 'cascade' }),
  overallHealthScore: integer("overall_health_score").notNull().default(0),
  scheduleHealth: integer("schedule_health").notNull().default(0),
  budgetHealth: integer("budget_health").notNull().default(0),
  qualityHealth: integer("quality_health").notNull().default(0),
  resourceHealth: integer("resource_health").notNull().default(0),
  riskLevel: text("risk_level").notNull().default("low"),
  calculatedAt: timestamp("calculated_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  index("project_health_metrics_project_id_idx").on(table.projectId),
]);

export const riskAssessments = pgTable("risk_assessments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  projectId: varchar("project_id").notNull().references(() => projects.id, { onDelete: 'cascade' }),
  riskType: text("risk_type").notNull(),
  riskTitle: text("risk_title").notNull(),
  riskDescription: text("risk_description").notNull(),
  probability: text("probability").notNull().default("medium"),
  impact: text("impact").notNull().default("medium"),
  riskScore: integer("risk_score").notNull().default(0),
  status: text("status").notNull().default("identified"),
  mitigationPlan: text("mitigation_plan"),
  assignedTo: varchar("assigned_to").references(() => users.id, { onDelete: 'set null' }),
  identifiedBy: varchar("identified_by").notNull().references(() => users.id, { onDelete: 'restrict' }),
  dueDate: timestamp("due_date", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
}, (table) => [
  index("risk_assessments_project_id_idx").on(table.projectId),
  index("risk_assessments_status_idx").on(table.status),
]);

export const healthCheckTemplates = pgTable("health_check_templates", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  companyId: varchar("company_id").references(() => companies.id, { onDelete: 'cascade' }), // null for system templates
  name: text("name").notNull(),
  description: text("description"),
  criteria: jsonb("criteria").notNull(), // Changed from text to jsonb for proper JSON storage
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  index("health_check_templates_company_id_idx").on(table.companyId),
]);

// ============================================================================
// CLIENT MODULE TABLES
// ============================================================================

export const clientIssues = pgTable("client_issues", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  projectId: varchar("project_id").notNull().references(() => projects.id, { onDelete: 'cascade' }),
  title: text("title").notNull(),
  description: text("description").notNull().default(""),
  photos: text("photos").array().default([]),
  createdBy: varchar("created_by").notNull().references(() => users.id, { onDelete: 'restrict' }),
  status: text("status").notNull().default("open"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  index("client_issues_project_id_idx").on(table.projectId),
  index("client_issues_status_idx").on(table.status),
]);

export const clientForumMessages = pgTable("client_forum_messages", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  projectId: varchar("project_id").notNull().references(() => projects.id, { onDelete: 'cascade' }),
  authorId: varchar("author_id").notNull().references(() => users.id, { onDelete: 'restrict' }),
  content: text("content").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  index("client_forum_messages_project_id_idx").on(table.projectId),
]);

export const clientMaterials = pgTable("client_materials", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  projectId: varchar("project_id").notNull().references(() => projects.id, { onDelete: 'cascade' }),
  name: text("name").notNull(),
  category: text("category").default("general"),
  link: text("link"),
  specification: text("specification"),
  notes: text("notes"),
  quantity: integer("quantity"),
  unitCost: integer("unit_cost"), // in cents
  totalCost: integer("total_cost"), // in cents
  supplier: text("supplier"),
  status: text("status").default("pending"),
  addedBy: varchar("added_by").notNull().references(() => users.id, { onDelete: 'restrict' }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  index("client_materials_project_id_idx").on(table.projectId),
]);

export const clientInstallments = pgTable("client_installments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  projectId: varchar("project_id").notNull().references(() => projects.id, { onDelete: 'cascade' }),
  amount: integer("amount").notNull(), // in cents
  dueDate: timestamp("due_date", { withTimezone: true }).notNull(),
  isPaid: boolean("is_paid").notNull().default(false),
  paymentMethod: text("payment_method"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  index("client_installments_project_id_idx").on(table.projectId),
  index("client_installments_due_date_idx").on(table.dueDate),
]);

export const clientNotificationSettings = pgTable("client_notification_settings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  projectId: varchar("project_id").notNull().references(() => projects.id, { onDelete: 'cascade' }),
  materialId: varchar("material_id").references(() => clientMaterials.id, { onDelete: 'cascade' }),
  groupName: text("group_name"),
  frequencyValue: integer("frequency_value").notNull(),
  frequencyUnit: text("frequency_unit").notNull(),
  notifyViaEmail: boolean("notify_via_email").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  index("client_notification_settings_project_id_idx").on(table.projectId),
]);

// ============================================================================
// COMMUNICATION & FINANCE TABLES
// ============================================================================

export const communications = pgTable("communications", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  projectId: varchar("project_id").notNull().references(() => projects.id, { onDelete: 'cascade' }),
  fromUserId: varchar("from_user_id").references(() => users.id, { onDelete: 'set null' }),
  fromEmail: varchar("from_email"),
  fromName: text("from_name"),
  toUserId: varchar("to_user_id").references(() => users.id, { onDelete: 'set null' }),
  toEmail: varchar("to_email"),
  subject: text("subject").notNull(),
  message: text("message").notNull(),
  type: text("type").notNull().default("message"),
  status: text("status").notNull().default("open"),
  attachments: text("attachments").array(),
  priority: text("priority").notNull().default("normal"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
}, (table) => [
  index("communications_project_id_idx").on(table.projectId),
  index("communications_from_user_id_idx").on(table.fromUserId),
  index("communications_to_user_id_idx").on(table.toUserId),
]);

export const changeOrders = pgTable("change_orders", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  projectId: varchar("project_id").notNull().references(() => projects.id, { onDelete: 'cascade' }),
  requestedBy: varchar("requested_by").notNull().references(() => users.id, { onDelete: 'restrict' }),
  title: text("title").notNull(),
  description: text("description").notNull(),
  costImpact: integer("cost_impact").notNull().default(0), // in cents
  timeImpact: integer("time_impact").notNull().default(0), // in days
  status: text("status").notNull().default("pending"),
  approvedBy: varchar("approved_by").references(() => users.id, { onDelete: 'set null' }),
  approvedAt: timestamp("approved_at", { withTimezone: true }),
  reason: text("reason"),
  attachments: text("attachments").array(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
}, (table) => [
  index("change_orders_project_id_idx").on(table.projectId),
  index("change_orders_status_idx").on(table.status),
]);

export const invoices = pgTable("invoices", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  projectId: varchar("project_id").notNull().references(() => projects.id, { onDelete: 'restrict' }),
  invoiceNumber: text("invoice_number").notNull().unique(),
  clientName: text("client_name").notNull(),
  clientEmail: varchar("client_email").notNull(),
  amount: integer("amount").notNull(), // in cents
  tax: integer("tax").notNull().default(0), // in cents
  total: integer("total").notNull(), // in cents
  status: text("status").notNull().default("draft"),
  dueDate: timestamp("due_date", { withTimezone: true }).notNull(),
  paidAt: timestamp("paid_at", { withTimezone: true }),
  items: jsonb("items").notNull(),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
}, (table) => [
  index("invoices_project_id_idx").on(table.projectId),
  index("invoices_status_idx").on(table.status),
  index("invoices_due_date_idx").on(table.dueDate),
]);

// ============================================================================
// AUDIT LOG TABLE
// ============================================================================

export const auditLogs = pgTable("audit_logs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  companyId: varchar("company_id").notNull().references(() => companies.id, { onDelete: 'cascade' }),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: 'restrict' }),
  action: varchar("action", { length: 100 }).notNull(),
  resource: varchar("resource", { length: 100 }).notNull(),
  resourceId: varchar("resource_id"),
  oldValues: jsonb("old_values"),
  newValues: jsonb("new_values"),
  ipAddress: varchar("ip_address", { length: 45 }),
  userAgent: text("user_agent"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  index("audit_logs_company_id_idx").on(table.companyId),
  index("audit_logs_user_id_idx").on(table.userId),
  index("audit_logs_action_idx").on(table.action),
  index("audit_logs_created_at_idx").on(table.createdAt),
]);

// ============================================================================
// WAITLIST TABLE
// ============================================================================

export const waitlist = pgTable("waitlist", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  email: varchar("email").notNull().unique(),
  company: text("company"),
  role: text("role"),
  phone: varchar("phone"),
  message: text("message"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// ============================================================================
// ZOD SCHEMAS FOR VALIDATION
// ============================================================================

// Company schemas
export const insertCompanySchema = createInsertSchema(companies).omit({ id: true, createdAt: true, updatedAt: true });

// Role schemas
export const insertRoleSchema = createInsertSchema(roles).omit({ id: true, createdAt: true, updatedAt: true });

// Permission schemas
export const insertPermissionSchema = createInsertSchema(permissions).omit({ id: true, createdAt: true });

// Role-Permission schemas
export const insertRolePermissionSchema = createInsertSchema(rolePermissions).omit({ id: true, createdAt: true });

// User schemas
export const insertUserSchema = createInsertSchema(users).omit({ id: true, createdAt: true, updatedAt: true, lastLoginAt: true });
export const upsertUserSchema = createInsertSchema(users).omit({ createdAt: true, updatedAt: true, lastLoginAt: true });

// Project schemas
export const insertProjectSchema = createInsertSchema(projects).omit({ id: true, createdAt: true, updatedAt: true });

// Task schemas - companyId is omitted because backend adds it from authenticated user
export const insertTaskSchema = createInsertSchema(tasks).omit({ id: true, companyId: true, createdAt: true, updatedAt: true, completedAt: true }).extend({
  dueDate: z.union([z.date(), z.string(), z.null()]).optional().nullable(),
}).refine((data) => {
  if (data.category === "project" && (!data.projectId || data.projectId === null)) {
    return false;
  }
  return true;
}, {
  message: "Project selection is required when category is 'Project Related'",
  path: ["projectId"],
});

// Other schemas
export const insertProjectLogSchema = createInsertSchema(projectLogs).omit({ id: true, createdAt: true });
export const insertPhotoSchema = createInsertSchema(photos).omit({ id: true, createdAt: true });
export const insertScheduleChangeSchema = createInsertSchema(scheduleChanges).omit({ id: true, createdAt: true });
export const insertNotificationSchema = createInsertSchema(notifications).omit({ id: true, createdAt: true });
export const insertSubcontractorAssignmentSchema = createInsertSchema(subcontractorAssignments).omit({ id: true, createdAt: true });
export const insertProjectHealthMetricsSchema = createInsertSchema(projectHealthMetrics).omit({ id: true, calculatedAt: true });
export const insertRiskAssessmentSchema = createInsertSchema(riskAssessments).omit({ id: true, createdAt: true, updatedAt: true });
export const insertHealthCheckTemplateSchema = createInsertSchema(healthCheckTemplates).omit({ id: true, createdAt: true });
export const insertActivitySchema = createInsertSchema(userActivities).omit({ id: true, createdAt: true });
export const insertCommunicationSchema = createInsertSchema(communications).omit({ id: true, createdAt: true, updatedAt: true });
export const insertChangeOrderSchema = createInsertSchema(changeOrders).omit({ id: true, createdAt: true, updatedAt: true });
export const insertTimeEntrySchema = createInsertSchema(timeEntries).omit({ id: true, createdAt: true });
export const insertInvoiceSchema = createInsertSchema(invoices).omit({ id: true, createdAt: true, updatedAt: true });
export const insertAuditLogSchema = createInsertSchema(auditLogs).omit({ id: true, createdAt: true });
export const insertWaitlistSchema = createInsertSchema(waitlist).omit({ id: true, createdAt: true });

// Client Module schemas
export const insertClientIssueSchema = createInsertSchema(clientIssues).omit({ id: true, createdAt: true });
export const insertClientForumMessageSchema = createInsertSchema(clientForumMessages).omit({ id: true, createdAt: true });
export const insertClientMaterialSchema = createInsertSchema(clientMaterials).omit({ id: true, createdAt: true });
export const insertClientInstallmentSchema = createInsertSchema(clientInstallments).omit({ id: true, createdAt: true });
export const insertClientNotificationSettingSchema = createInsertSchema(clientNotificationSettings).omit({ id: true, createdAt: true });

// ============================================================================
// TYPE EXPORTS
// ============================================================================

// Company types
export type InsertCompany = z.infer<typeof insertCompanySchema>;
export type Company = typeof companies.$inferSelect;

// Role types
export type InsertRole = z.infer<typeof insertRoleSchema>;
export type Role = typeof roles.$inferSelect;

// Permission types
export type InsertPermission = z.infer<typeof insertPermissionSchema>;
export type Permission = typeof permissions.$inferSelect;

// Role-Permission types
export type InsertRolePermission = z.infer<typeof insertRolePermissionSchema>;
export type RolePermission = typeof rolePermissions.$inferSelect;

// User types
export type InsertUser = z.infer<typeof insertUserSchema>;
export type UpsertUser = z.infer<typeof upsertUserSchema>;
export type User = typeof users.$inferSelect;

// Project types
export type InsertProject = z.infer<typeof insertProjectSchema>;
export type Project = typeof projects.$inferSelect;

// Task types
export type InsertTask = z.infer<typeof insertTaskSchema>;
export type Task = typeof tasks.$inferSelect;

// Other types
export type InsertProjectLog = z.infer<typeof insertProjectLogSchema>;
export type ProjectLog = typeof projectLogs.$inferSelect;
export type InsertPhoto = z.infer<typeof insertPhotoSchema>;
export type Photo = typeof photos.$inferSelect;
export type InsertScheduleChange = z.infer<typeof insertScheduleChangeSchema>;
export type ScheduleChange = typeof scheduleChanges.$inferSelect;
export type InsertNotification = z.infer<typeof insertNotificationSchema>;
export type Notification = typeof notifications.$inferSelect;
export type InsertSubcontractorAssignment = z.infer<typeof insertSubcontractorAssignmentSchema>;
export type SubcontractorAssignment = typeof subcontractorAssignments.$inferSelect;
export type InsertProjectHealthMetrics = z.infer<typeof insertProjectHealthMetricsSchema>;
export type ProjectHealthMetrics = typeof projectHealthMetrics.$inferSelect;
export type InsertRiskAssessment = z.infer<typeof insertRiskAssessmentSchema>;
export type RiskAssessment = typeof riskAssessments.$inferSelect;
export type InsertHealthCheckTemplate = z.infer<typeof insertHealthCheckTemplateSchema>;
export type HealthCheckTemplate = typeof healthCheckTemplates.$inferSelect;
export type InsertActivity = z.infer<typeof insertActivitySchema>;
export type Activity = typeof userActivities.$inferSelect;
export type InsertCommunication = z.infer<typeof insertCommunicationSchema>;
export type Communication = typeof communications.$inferSelect;
export type InsertChangeOrder = z.infer<typeof insertChangeOrderSchema>;
export type ChangeOrder = typeof changeOrders.$inferSelect;
export type InsertTimeEntry = z.infer<typeof insertTimeEntrySchema>;
export type TimeEntry = typeof timeEntries.$inferSelect;
export type InsertInvoice = z.infer<typeof insertInvoiceSchema>;
export type Invoice = typeof invoices.$inferSelect;
export type InsertAuditLog = z.infer<typeof insertAuditLogSchema>;
export type AuditLog = typeof auditLogs.$inferSelect;
export type InsertWaitlist = z.infer<typeof insertWaitlistSchema>;
export type Waitlist = typeof waitlist.$inferSelect;

// Client Module types
export type InsertClientIssue = z.infer<typeof insertClientIssueSchema>;
export type ClientIssue = typeof clientIssues.$inferSelect;
export type InsertClientForumMessage = z.infer<typeof insertClientForumMessageSchema>;
export type ClientForumMessage = typeof clientForumMessages.$inferSelect;
export type InsertClientMaterial = z.infer<typeof insertClientMaterialSchema>;
export type ClientMaterial = typeof clientMaterials.$inferSelect;
export type InsertClientInstallment = z.infer<typeof insertClientInstallmentSchema>;
export type ClientInstallment = typeof clientInstallments.$inferSelect;
export type InsertClientNotificationSetting = z.infer<typeof insertClientNotificationSettingSchema>;
export type ClientNotificationSetting = typeof clientNotificationSettings.$inferSelect;

// ============================================================================
// PERMISSION CONSTANTS
// ============================================================================

export const PERMISSIONS = {
  // User Management
  USERS_VIEW: 'users.view',
  USERS_CREATE: 'users.create',
  USERS_EDIT: 'users.edit',
  USERS_DELETE: 'users.delete',
  
  // Project Management
  PROJECTS_VIEW: 'projects.view',
  PROJECTS_CREATE: 'projects.create',
  PROJECTS_EDIT: 'projects.edit',
  PROJECTS_DELETE: 'projects.delete',
  
  // Task Management
  TASKS_VIEW: 'tasks.view',
  TASKS_CREATE: 'tasks.create',
  TASKS_EDIT: 'tasks.edit',
  TASKS_DELETE: 'tasks.delete',
  TASKS_ASSIGN: 'tasks.assign',
  
  // Financial
  FINANCIALS_VIEW: 'financials.view',
  FINANCIALS_EDIT: 'financials.edit',
  INVOICES_CREATE: 'invoices.create',
  INVOICES_APPROVE: 'invoices.approve',
  
  // Photos & Documents
  PHOTOS_VIEW: 'photos.view',
  PHOTOS_UPLOAD: 'photos.upload',
  PHOTOS_DELETE: 'photos.delete',
  
  // Reports
  REPORTS_VIEW: 'reports.view',
  REPORTS_EXPORT: 'reports.export',
  
  // Company Settings
  COMPANY_SETTINGS: 'company.settings',
  ROLES_MANAGE: 'roles.manage',
  
  // Client Portal
  CLIENT_PORTAL_VIEW: 'client_portal.view',
  CLIENT_ISSUES_CREATE: 'client_portal.issues.create',
  
  // System Admin (Root only)
  SYSTEM_ADMIN: 'system.admin',
  COMPANIES_MANAGE: 'companies.manage',
} as const;

export type PermissionName = typeof PERMISSIONS[keyof typeof PERMISSIONS];
