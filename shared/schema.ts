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
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Session storage table.
// (IMPORTANT) This table is mandatory for Replit Auth, don't drop it.
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)],
);


// User storage table.
// (IMPORTANT) This table is mandatory for Replit Auth, don't drop it.
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
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: varchar("email").unique(),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
  
  // Additional fields for our construction app
  username: text("username").unique(),
  password: text("password"),
  name: text("name"),
  role: text("role").notNull().default("crew"), // crew, manager, admin, subcontractor
  companyId: varchar("company_id").references(() => companies.id), // Links user to a company for multi-tenancy
});

export const projects = pgTable("projects", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  description: text("description"),
  location: text("location").notNull(),
  status: text("status").notNull().default("active"), // active, completed, on-hold, delayed
  progress: integer("progress").notNull().default(0), // 0-100
  dueDate: timestamp("due_date"),
  budget: integer("budget"), // total project budget in cents
  actualCost: integer("actual_cost").default(0), // actual cost so far in cents
  clientName: text("client_name"),
  clientEmail: varchar("client_email"),
  clientPhone: varchar("client_phone"),
  createdAt: timestamp("created_at").notNull().default(sql`now()`),
  companyId: varchar("company_id").references(() => companies.id), // Links project to a company for multi-tenancy
});

export const tasks = pgTable("tasks", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  title: text("title").notNull(),
  description: text("description"),
  projectId: varchar("project_id").references(() => projects.id), // Optional - null for general/admin tasks
  assigneeId: varchar("assignee_id").references(() => users.id),
  companyId: varchar("company_id").references(() => companies.id), // Will be required after data migration
  category: text("category").notNull().default("project"), // project, administrative, general, subcontractor
  status: text("status").notNull().default("pending"), // pending, in-progress, completed, blocked
  priority: text("priority").notNull().default("medium"), // low, medium, high, critical
  dueDate: timestamp("due_date"),
  completedAt: timestamp("completed_at"),
  createdAt: timestamp("created_at").notNull().default(sql`now()`),
  isMilestone: boolean("is_milestone").notNull().default(false),
  estimatedHours: integer("estimated_hours"), // For time tracking
});

export const projectLogs = pgTable("project_logs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  projectId: varchar("project_id").notNull().references(() => projects.id),
  userId: varchar("user_id").notNull().references(() => users.id),
  title: text("title").notNull(),
  content: text("content").notNull(),
  type: text("type").notNull().default("general"), // general, issue, milestone, safety
  status: text("status").notNull().default("open"), // open, in-progress, resolved, closed
  images: text("images").array(), // Array of image URLs from object storage
  createdAt: timestamp("created_at").notNull().default(sql`now()`),
});

export const photos = pgTable("photos", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  projectId: varchar("project_id").notNull().references(() => projects.id),
  userId: varchar("user_id").notNull().references(() => users.id),
  filename: text("filename").notNull(),
  originalName: text("original_name").notNull(),
  description: text("description"),
  tags: text("tags").array(),
  createdAt: timestamp("created_at").notNull().default(sql`now()`),
});

// User activity tracking for recent activity feed
export const userActivities = pgTable("user_activities", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  companyId: varchar("company_id").notNull().references(() => companies.id),
  actionType: text("action_type").notNull(), // 'task_created', 'task_completed', 'project_created', etc.
  description: text("description").notNull(),
  entityType: text("entity_type"), // 'task', 'project', 'photo', 'user'
  entityId: varchar("entity_id"), // ID of the related entity
  metadata: jsonb("metadata"), // Additional data about the activity
  createdAt: timestamp("created_at").notNull().default(sql`now()`),
});

export const scheduleChanges = pgTable("schedule_changes", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  taskId: varchar("task_id").notNull().references(() => tasks.id),
  userId: varchar("user_id").notNull().references(() => users.id),
  reason: text("reason").notNull(),
  originalDate: timestamp("original_date").notNull(),
  newDate: timestamp("new_date").notNull(),
  status: text("status").notNull().default("pending"), // pending, approved, rejected
  createdAt: timestamp("created_at").notNull().default(sql`now()`),
});

export const notifications = pgTable("notifications", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  title: text("title").notNull(),
  message: text("message").notNull(),
  type: text("type").notNull().default("info"), // info, warning, error, success
  isRead: boolean("is_read").notNull().default(false),
  relatedEntityType: text("related_entity_type"), // project, task, log, schedule_change
  relatedEntityId: varchar("related_entity_id"),
  createdAt: timestamp("created_at").notNull().default(sql`now()`),
});

export const subcontractorAssignments = pgTable("subcontractor_assignments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  subcontractorId: varchar("subcontractor_id").notNull().references(() => users.id),
  projectId: varchar("project_id").notNull().references(() => projects.id),
  assignedBy: varchar("assigned_by").notNull().references(() => users.id), // PM who assigned
  startDate: timestamp("start_date"),
  endDate: timestamp("end_date"),
  specialization: text("specialization"), // e.g., "Electrical", "Plumbing", "Flooring"
  status: text("status").notNull().default("active"), // active, completed, terminated
  createdAt: timestamp("created_at").notNull().default(sql`now()`),
});

// Project Health and Risk Assessment Tables
export const projectHealthMetrics = pgTable("project_health_metrics", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  projectId: varchar("project_id").notNull().references(() => projects.id),
  overallHealthScore: integer("overall_health_score").notNull().default(0), // 0-100
  scheduleHealth: integer("schedule_health").notNull().default(0), // 0-100
  budgetHealth: integer("budget_health").notNull().default(0), // 0-100
  qualityHealth: integer("quality_health").notNull().default(0), // 0-100
  resourceHealth: integer("resource_health").notNull().default(0), // 0-100
  riskLevel: text("risk_level").notNull().default("low"), // low, medium, high, critical
  calculatedAt: timestamp("calculated_at").notNull().default(sql`now()`),
});

export const riskAssessments = pgTable("risk_assessments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  projectId: varchar("project_id").notNull().references(() => projects.id),
  riskType: text("risk_type").notNull(), // schedule, budget, quality, resource, weather, safety
  riskTitle: text("risk_title").notNull(),
  riskDescription: text("risk_description").notNull(),
  probability: text("probability").notNull().default("medium"), // low, medium, high
  impact: text("impact").notNull().default("medium"), // low, medium, high
  riskScore: integer("risk_score").notNull().default(0), // 1-25 (probability * impact)
  status: text("status").notNull().default("identified"), // identified, assessed, mitigated, closed
  mitigationPlan: text("mitigation_plan"),
  assignedTo: varchar("assigned_to").references(() => users.id),
  identifiedBy: varchar("identified_by").notNull().references(() => users.id),
  dueDate: timestamp("due_date"),
  createdAt: timestamp("created_at").notNull().default(sql`now()`),
  updatedAt: timestamp("updated_at").notNull().default(sql`now()`),
});

export const healthCheckTemplates = pgTable("health_check_templates", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  description: text("description"),
  criteria: text("criteria").notNull(), // JSON string of health check criteria
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().default(sql`now()`),
});

// New tables for enhanced functionality
export const communications = pgTable("communications", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  projectId: varchar("project_id").notNull().references(() => projects.id),
  fromUserId: varchar("from_user_id").references(() => users.id),
  fromEmail: varchar("from_email"), // for external communications
  fromName: text("from_name"), // for external communications
  toUserId: varchar("to_user_id").references(() => users.id),
  toEmail: varchar("to_email"), // for external communications
  subject: text("subject").notNull(),
  message: text("message").notNull(),
  type: text("type").notNull().default("message"), // message, change_order, dispute, invoice
  status: text("status").notNull().default("open"), // open, resolved, approved, rejected
  attachments: text("attachments").array(),
  priority: text("priority").notNull().default("normal"), // low, normal, high, urgent
  createdAt: timestamp("created_at").notNull().default(sql`now()`),
  updatedAt: timestamp("updated_at").notNull().default(sql`now()`),
});

export const changeOrders = pgTable("change_orders", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  projectId: varchar("project_id").notNull().references(() => projects.id),
  requestedBy: varchar("requested_by").notNull().references(() => users.id),
  title: text("title").notNull(),
  description: text("description").notNull(),
  costImpact: integer("cost_impact").notNull().default(0), // in cents
  timeImpact: integer("time_impact").notNull().default(0), // in days
  status: text("status").notNull().default("pending"), // pending, approved, rejected, implemented
  approvedBy: varchar("approved_by").references(() => users.id),
  approvedAt: timestamp("approved_at"),
  reason: text("reason"), // reason for approval/rejection
  attachments: text("attachments").array(),
  createdAt: timestamp("created_at").notNull().default(sql`now()`),
  updatedAt: timestamp("updated_at").notNull().default(sql`now()`),
});

export const timeEntries = pgTable("time_entries", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  projectId: varchar("project_id").references(() => projects.id),
  taskId: varchar("task_id").references(() => tasks.id),
  description: text("description").notNull(),
  startTime: timestamp("start_time").notNull(),
  endTime: timestamp("end_time"),
  totalHours: integer("total_hours"), // in minutes
  hourlyRate: integer("hourly_rate"), // in cents per hour
  billable: boolean("billable").notNull().default(true),
  approved: boolean("approved").notNull().default(false),
  approvedBy: varchar("approved_by").references(() => users.id),
  createdAt: timestamp("created_at").notNull().default(sql`now()`),
});

export const invoices = pgTable("invoices", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  projectId: varchar("project_id").notNull().references(() => projects.id),
  invoiceNumber: text("invoice_number").notNull().unique(),
  clientName: text("client_name").notNull(),
  clientEmail: varchar("client_email").notNull(),
  amount: integer("amount").notNull(), // in cents
  tax: integer("tax").notNull().default(0), // in cents
  total: integer("total").notNull(), // in cents
  status: text("status").notNull().default("draft"), // draft, sent, paid, overdue, cancelled
  dueDate: timestamp("due_date").notNull(),
  paidAt: timestamp("paid_at"),
  items: jsonb("items").notNull(), // invoice line items
  notes: text("notes"),
  createdAt: timestamp("created_at").notNull().default(sql`now()`),
  updatedAt: timestamp("updated_at").notNull().default(sql`now()`),
});

// Insert schemas
export const insertCompanySchema = createInsertSchema(companies).omit({ id: true, createdAt: true, updatedAt: true });
export const insertUserSchema = createInsertSchema(users).omit({ id: true, createdAt: true, updatedAt: true });
export const upsertUserSchema = createInsertSchema(users).omit({ createdAt: true, updatedAt: true });
export const insertCommunicationSchema = createInsertSchema(communications).omit({ id: true, createdAt: true, updatedAt: true });
export const insertChangeOrderSchema = createInsertSchema(changeOrders).omit({ id: true, createdAt: true, updatedAt: true });
export const insertTimeEntrySchema = createInsertSchema(timeEntries).omit({ id: true, createdAt: true });
export const insertInvoiceSchema = createInsertSchema(invoices).omit({ id: true, createdAt: true, updatedAt: true });
export const insertProjectSchema = createInsertSchema(projects).omit({ id: true, createdAt: true });
export const insertTaskSchema = createInsertSchema(tasks).omit({ id: true, createdAt: true, completedAt: true }).extend({
  dueDate: z.union([z.date(), z.string(), z.null()]).optional().nullable(),
}).refine((data) => {
  // If category is "project", projectId must be provided and not null
  if (data.category === "project" && (!data.projectId || data.projectId === null)) {
    return false;
  }
  return true;
}, {
  message: "Project selection is required when category is 'Project Related'",
  path: ["projectId"], // This will show the error on the projectId field
});
export const insertProjectLogSchema = createInsertSchema(projectLogs).omit({ id: true, createdAt: true });
export const insertPhotoSchema = createInsertSchema(photos).omit({ id: true, createdAt: true });
export const insertScheduleChangeSchema = createInsertSchema(scheduleChanges).omit({ id: true, createdAt: true });
export const insertNotificationSchema = createInsertSchema(notifications).omit({ id: true, createdAt: true });
export const insertSubcontractorAssignmentSchema = createInsertSchema(subcontractorAssignments).omit({ id: true, createdAt: true });
export const insertProjectHealthMetricsSchema = createInsertSchema(projectHealthMetrics).omit({ id: true, calculatedAt: true });
export const insertRiskAssessmentSchema = createInsertSchema(riskAssessments).omit({ id: true, createdAt: true, updatedAt: true });
export const insertHealthCheckTemplateSchema = createInsertSchema(healthCheckTemplates).omit({ id: true, createdAt: true });
export const insertActivitySchema = createInsertSchema(userActivities).omit({ id: true, createdAt: true });

// Types
export type InsertCompany = z.infer<typeof insertCompanySchema>;
export type Company = typeof companies.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type UpsertUser = z.infer<typeof upsertUserSchema>;
export type User = typeof users.$inferSelect;
export type InsertCommunication = z.infer<typeof insertCommunicationSchema>;
export type Communication = typeof communications.$inferSelect;
export type InsertChangeOrder = z.infer<typeof insertChangeOrderSchema>;
export type ChangeOrder = typeof changeOrders.$inferSelect;
export type InsertTimeEntry = z.infer<typeof insertTimeEntrySchema>;
export type TimeEntry = typeof timeEntries.$inferSelect;
export type InsertInvoice = z.infer<typeof insertInvoiceSchema>;
export type Invoice = typeof invoices.$inferSelect;
export type InsertProject = z.infer<typeof insertProjectSchema>;
export type Project = typeof projects.$inferSelect;
export type InsertTask = z.infer<typeof insertTaskSchema>;
export type Task = typeof tasks.$inferSelect;
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
