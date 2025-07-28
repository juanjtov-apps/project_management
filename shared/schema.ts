import { sql } from "drizzle-orm";
import { pgTable, text, varchar, timestamp, integer, boolean, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  name: text("name").notNull(),
  email: text("email").notNull(),
  role: text("role").notNull().default("crew"), // crew, manager, admin, subcontractor
});

export const projects = pgTable("projects", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  description: text("description"),
  location: text("location").notNull(),
  status: text("status").notNull().default("active"), // active, completed, on-hold, delayed
  progress: integer("progress").notNull().default(0), // 0-100
  dueDate: timestamp("due_date"),
  createdAt: timestamp("created_at").notNull().default(sql`now()`),
});

export const tasks = pgTable("tasks", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  title: text("title").notNull(),
  description: text("description"),
  projectId: varchar("project_id").references(() => projects.id), // Optional - null for general/admin tasks
  assigneeId: varchar("assignee_id").references(() => users.id),
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

// Insert schemas
export const insertUserSchema = createInsertSchema(users).omit({ id: true });
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

// Types
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
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
