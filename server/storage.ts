import { 
  users, projects, tasks, projectLogs, photos, scheduleChanges, notifications,
  type User, type InsertUser, type Project, type InsertProject,
  type Task, type InsertTask, type ProjectLog, type InsertProjectLog,
  type Photo, type InsertPhoto, type ScheduleChange, type InsertScheduleChange,
  type Notification, type InsertNotification
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, and, count, gte, sql } from "drizzle-orm";

export interface IStorage {
  // Users
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  // Projects
  getProjects(): Promise<Project[]>;
  getProject(id: string): Promise<Project | undefined>;
  createProject(project: InsertProject): Promise<Project>;
  updateProject(id: string, updates: Partial<InsertProject>): Promise<Project | undefined>;
  deleteProject(id: string): Promise<boolean>;
  
  // Tasks
  getTasks(projectId?: string): Promise<Task[]>;
  getTask(id: string): Promise<Task | undefined>;
  createTask(task: InsertTask): Promise<Task>;
  updateTask(id: string, updates: Partial<InsertTask>): Promise<Task | undefined>;
  deleteTask(id: string): Promise<boolean>;
  
  // Project Logs
  getProjectLogs(projectId?: string): Promise<ProjectLog[]>;
  getProjectLog(id: string): Promise<ProjectLog | undefined>;
  createProjectLog(log: InsertProjectLog): Promise<ProjectLog>;
  updateProjectLog(id: string, updates: Partial<InsertProjectLog>): Promise<ProjectLog | undefined>;
  
  // Photos
  getPhotos(projectId?: string): Promise<Photo[]>;
  getPhoto(id: string): Promise<Photo | undefined>;
  createPhoto(photo: InsertPhoto): Promise<Photo>;
  deletePhoto(id: string): Promise<boolean>;
  
  // Schedule Changes
  getScheduleChanges(taskId?: string): Promise<ScheduleChange[]>;
  createScheduleChange(change: InsertScheduleChange): Promise<ScheduleChange>;
  updateScheduleChange(id: string, updates: Partial<InsertScheduleChange>): Promise<ScheduleChange | undefined>;
  
  // Notifications
  getNotifications(userId: string): Promise<Notification[]>;
  createNotification(notification: InsertNotification): Promise<Notification>;
  markNotificationAsRead(id: string): Promise<boolean>;
  markAllNotificationsAsRead(userId: string): Promise<boolean>;

  // Dashboard stats
  getDashboardStats(): Promise<{
    activeProjects: number;
    pendingTasks: number;
    photosThisWeek: number;
    recentActivity: Array<{
      id: string;
      type: "project" | "task" | "log";
      title: string;
      description: string;
      timestamp: string;
    }>;
  }>;
}

export class DatabaseStorage implements IStorage {
  // Users
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user || undefined;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db.insert(users).values(insertUser).returning();
    return user;
  }

  // Projects
  async getProjects(): Promise<Project[]> {
    return await db.select().from(projects).orderBy(desc(projects.createdAt));
  }

  async getProject(id: string): Promise<Project | undefined> {
    const [project] = await db.select().from(projects).where(eq(projects.id, id));
    return project || undefined;
  }

  async createProject(insertProject: InsertProject): Promise<Project> {
    const [project] = await db.insert(projects).values(insertProject).returning();
    return project;
  }

  async updateProject(id: string, updates: Partial<InsertProject>): Promise<Project | undefined> {
    const [project] = await db.update(projects).set(updates).where(eq(projects.id, id)).returning();
    return project || undefined;
  }

  async deleteProject(id: string): Promise<boolean> {
    const result = await db.delete(projects).where(eq(projects.id, id));
    return result.rowCount > 0;
  }

  // Tasks
  async getTasks(projectId?: string): Promise<Task[]> {
    if (projectId) {
      return await db.select().from(tasks).where(eq(tasks.projectId, projectId)).orderBy(desc(tasks.createdAt));
    }
    return await db.select().from(tasks).orderBy(desc(tasks.createdAt));
  }

  async getTask(id: string): Promise<Task | undefined> {
    const [task] = await db.select().from(tasks).where(eq(tasks.id, id));
    return task || undefined;
  }

  async createTask(insertTask: InsertTask): Promise<Task> {
    const [task] = await db.insert(tasks).values(insertTask).returning();
    return task;
  }

  async updateTask(id: string, updates: Partial<InsertTask>): Promise<Task | undefined> {
    const [task] = await db.update(tasks).set(updates).where(eq(tasks.id, id)).returning();
    return task || undefined;
  }

  async deleteTask(id: string): Promise<boolean> {
    const result = await db.delete(tasks).where(eq(tasks.id, id));
    return result.rowCount > 0;
  }

  // Project Logs
  async getProjectLogs(projectId?: string): Promise<ProjectLog[]> {
    if (projectId) {
      return await db.select().from(projectLogs).where(eq(projectLogs.projectId, projectId)).orderBy(desc(projectLogs.createdAt));
    }
    return await db.select().from(projectLogs).orderBy(desc(projectLogs.createdAt));
  }

  async getProjectLog(id: string): Promise<ProjectLog | undefined> {
    const [log] = await db.select().from(projectLogs).where(eq(projectLogs.id, id));
    return log || undefined;
  }

  async createProjectLog(insertProjectLog: InsertProjectLog): Promise<ProjectLog> {
    const [log] = await db.insert(projectLogs).values(insertProjectLog).returning();
    return log;
  }

  async updateProjectLog(id: string, updates: Partial<InsertProjectLog>): Promise<ProjectLog | undefined> {
    const [log] = await db.update(projectLogs).set(updates).where(eq(projectLogs.id, id)).returning();
    return log || undefined;
  }

  // Photos
  async getPhotos(projectId?: string): Promise<Photo[]> {
    if (projectId) {
      return await db.select().from(photos).where(eq(photos.projectId, projectId)).orderBy(desc(photos.createdAt));
    }
    return await db.select().from(photos).orderBy(desc(photos.createdAt));
  }

  async getPhoto(id: string): Promise<Photo | undefined> {
    const [photo] = await db.select().from(photos).where(eq(photos.id, id));
    return photo || undefined;
  }

  async createPhoto(insertPhoto: InsertPhoto): Promise<Photo> {
    const [photo] = await db.insert(photos).values(insertPhoto).returning();
    return photo;
  }

  async deletePhoto(id: string): Promise<boolean> {
    const result = await db.delete(photos).where(eq(photos.id, id));
    return result.rowCount > 0;
  }

  // Schedule Changes
  async getScheduleChanges(taskId?: string): Promise<ScheduleChange[]> {
    if (taskId) {
      return await db.select().from(scheduleChanges).where(eq(scheduleChanges.taskId, taskId)).orderBy(desc(scheduleChanges.createdAt));
    }
    return await db.select().from(scheduleChanges).orderBy(desc(scheduleChanges.createdAt));
  }

  async createScheduleChange(insertScheduleChange: InsertScheduleChange): Promise<ScheduleChange> {
    const [change] = await db.insert(scheduleChanges).values(insertScheduleChange).returning();
    return change;
  }

  async updateScheduleChange(id: string, updates: Partial<InsertScheduleChange>): Promise<ScheduleChange | undefined> {
    const [change] = await db.update(scheduleChanges).set(updates).where(eq(scheduleChanges.id, id)).returning();
    return change || undefined;
  }

  // Notifications
  async getNotifications(userId: string): Promise<Notification[]> {
    return await db.select().from(notifications).where(eq(notifications.userId, userId)).orderBy(desc(notifications.createdAt));
  }

  async createNotification(insertNotification: InsertNotification): Promise<Notification> {
    const [notification] = await db.insert(notifications).values(insertNotification).returning();
    return notification;
  }

  async markNotificationAsRead(id: string): Promise<boolean> {
    const result = await db.update(notifications).set({ isRead: true }).where(eq(notifications.id, id));
    return result.rowCount > 0;
  }

  async markAllNotificationsAsRead(userId: string): Promise<boolean> {
    const result = await db.update(notifications).set({ isRead: true }).where(eq(notifications.userId, userId));
    return result.rowCount > 0;
  }

  // Dashboard stats
  async getDashboardStats() {
    const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    const [activeProjects] = await db
      .select({ count: count() })
      .from(projects)
      .where(eq(projects.status, 'active'));

    const [pendingTasks] = await db
      .select({ count: count() })
      .from(tasks)
      .where(eq(tasks.status, 'pending'));

    const [photosThisWeek] = await db
      .select({ count: count() })
      .from(photos)
      .where(gte(photos.createdAt, oneWeekAgo));

    // Get recent activity from projects, tasks, and logs
    const recentProjects = await db
      .select({
        id: projects.id,
        title: projects.name,
        description: projects.description,
        timestamp: projects.createdAt,
      })
      .from(projects)
      .orderBy(desc(projects.createdAt))
      .limit(5);

    const recentTasks = await db
      .select({
        id: tasks.id,
        title: tasks.title,
        description: tasks.description,
        timestamp: tasks.createdAt,
      })
      .from(tasks)
      .orderBy(desc(tasks.createdAt))
      .limit(5);

    const recentLogs = await db
      .select({
        id: projectLogs.id,
        title: projectLogs.title,
        description: projectLogs.content,
        timestamp: projectLogs.createdAt,
      })
      .from(projectLogs)
      .orderBy(desc(projectLogs.createdAt))
      .limit(5);

    const recentActivity = [
      ...recentProjects.map(p => ({ ...p, type: "project" as const, description: p.description || "" })),
      ...recentTasks.map(t => ({ ...t, type: "task" as const, description: t.description || "" })),
      ...recentLogs.map(l => ({ ...l, type: "log" as const }))
    ]
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, 10)
      .map(item => ({
        id: item.id,
        type: item.type,
        title: item.title,
        description: item.description,
        timestamp: item.timestamp.toISOString(),
      }));

    return {
      activeProjects: activeProjects.count,
      pendingTasks: pendingTasks.count,
      photosThisWeek: photosThisWeek.count,
      recentActivity,
    };
  }
}

export const storage = new DatabaseStorage();