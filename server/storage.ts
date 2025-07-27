import { 
  type User, type InsertUser, type Project, type InsertProject,
  type Task, type InsertTask, type ProjectLog, type InsertProjectLog,
  type Photo, type InsertPhoto, type ScheduleChange, type InsertScheduleChange,
  type Notification, type InsertNotification
} from "@shared/schema";
import { randomUUID } from "crypto";

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
}

export class MemStorage implements IStorage {
  private users: Map<string, User>;
  private projects: Map<string, Project>;
  private tasks: Map<string, Task>;
  private projectLogs: Map<string, ProjectLog>;
  private photos: Map<string, Photo>;
  private scheduleChanges: Map<string, ScheduleChange>;
  private notifications: Map<string, Notification>;

  constructor() {
    this.users = new Map();
    this.projects = new Map();
    this.tasks = new Map();
    this.projectLogs = new Map();
    this.photos = new Map();
    this.scheduleChanges = new Map();
    this.notifications = new Map();
    
    // Initialize with sample data
    this.initializeSampleData();
  }

  private initializeSampleData() {
    // Create sample user
    const sampleUser: User = {
      id: randomUUID(),
      username: "mike.johnson",
      password: "password123",
      name: "Mike Johnson",
      email: "mike.johnson@contractorpro.com",
      role: "manager"
    };
    this.users.set(sampleUser.id, sampleUser);

    // Create sample projects
    const projects: Project[] = [
      {
        id: randomUUID(),
        name: "Downtown Office Complex",
        description: "Modern office building construction",
        location: "123 Main Street",
        status: "active",
        progress: 65,
        dueDate: new Date("2024-12-15"),
        createdAt: new Date()
      },
      {
        id: randomUUID(),
        name: "Residential Complex A",
        description: "Multi-family residential building",
        location: "456 Oak Avenue",
        status: "active",
        progress: 85,
        dueDate: new Date("2024-01-20"),
        createdAt: new Date()
      },
      {
        id: randomUUID(),
        name: "Industrial Warehouse",
        description: "Large warehouse and distribution center",
        location: "789 Industrial Blvd",
        status: "delayed",
        progress: 30,
        dueDate: new Date("2024-11-30"),
        createdAt: new Date()
      }
    ];

    projects.forEach(project => this.projects.set(project.id, project));

    // Create sample tasks
    const tasks: Task[] = [
      {
        id: randomUUID(),
        title: "Electrical Installation - Floor 3",
        description: "Install electrical wiring and outlets on the third floor",
        projectId: projects[0].id,
        assigneeId: sampleUser.id,
        status: "in-progress",
        priority: "high",
        dueDate: new Date("2024-07-27T14:00:00"),
        completedAt: null,
        createdAt: new Date()
      },
      {
        id: randomUUID(),
        title: "Plumbing Inspection",
        description: "Inspect plumbing installation for compliance",
        projectId: projects[1].id,
        assigneeId: sampleUser.id,
        status: "pending",
        priority: "medium",
        dueDate: new Date("2024-07-27T16:30:00"),
        completedAt: null,
        createdAt: new Date()
      },
      {
        id: randomUUID(),
        title: "Material Delivery Check",
        description: "Verify delivered materials match specifications",
        projectId: projects[2].id,
        assigneeId: sampleUser.id,
        status: "completed",
        priority: "low",
        dueDate: new Date("2024-07-27T10:00:00"),
        completedAt: new Date(),
        createdAt: new Date()
      }
    ];

    tasks.forEach(task => this.tasks.set(task.id, task));
  }

  // Users
  async getUser(id: string): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(user => user.username === username);
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = randomUUID();
    const user: User = { ...insertUser, id };
    this.users.set(id, user);
    return user;
  }

  // Projects
  async getProjects(): Promise<Project[]> {
    return Array.from(this.projects.values());
  }

  async getProject(id: string): Promise<Project | undefined> {
    return this.projects.get(id);
  }

  async createProject(insertProject: InsertProject): Promise<Project> {
    const id = randomUUID();
    const project: Project = { 
      ...insertProject, 
      id, 
      createdAt: new Date() 
    };
    this.projects.set(id, project);
    return project;
  }

  async updateProject(id: string, updates: Partial<InsertProject>): Promise<Project | undefined> {
    const project = this.projects.get(id);
    if (!project) return undefined;
    
    const updatedProject = { ...project, ...updates };
    this.projects.set(id, updatedProject);
    return updatedProject;
  }

  async deleteProject(id: string): Promise<boolean> {
    return this.projects.delete(id);
  }

  // Tasks
  async getTasks(projectId?: string): Promise<Task[]> {
    const tasks = Array.from(this.tasks.values());
    return projectId ? tasks.filter(task => task.projectId === projectId) : tasks;
  }

  async getTask(id: string): Promise<Task | undefined> {
    return this.tasks.get(id);
  }

  async createTask(insertTask: InsertTask): Promise<Task> {
    const id = randomUUID();
    const task: Task = { 
      ...insertTask, 
      id, 
      createdAt: new Date(),
      completedAt: null
    };
    this.tasks.set(id, task);
    return task;
  }

  async updateTask(id: string, updates: Partial<InsertTask>): Promise<Task | undefined> {
    const task = this.tasks.get(id);
    if (!task) return undefined;
    
    const updatedTask = { 
      ...task, 
      ...updates,
      completedAt: updates.status === "completed" ? new Date() : task.completedAt
    };
    this.tasks.set(id, updatedTask);
    return updatedTask;
  }

  async deleteTask(id: string): Promise<boolean> {
    return this.tasks.delete(id);
  }

  // Project Logs
  async getProjectLogs(projectId?: string): Promise<ProjectLog[]> {
    const logs = Array.from(this.projectLogs.values());
    return projectId ? logs.filter(log => log.projectId === projectId) : logs;
  }

  async getProjectLog(id: string): Promise<ProjectLog | undefined> {
    return this.projectLogs.get(id);
  }

  async createProjectLog(insertLog: InsertProjectLog): Promise<ProjectLog> {
    const id = randomUUID();
    const log: ProjectLog = { 
      ...insertLog, 
      id, 
      createdAt: new Date() 
    };
    this.projectLogs.set(id, log);
    return log;
  }

  async updateProjectLog(id: string, updates: Partial<InsertProjectLog>): Promise<ProjectLog | undefined> {
    const log = this.projectLogs.get(id);
    if (!log) return undefined;
    
    const updatedLog = { ...log, ...updates };
    this.projectLogs.set(id, updatedLog);
    return updatedLog;
  }

  // Photos
  async getPhotos(projectId?: string): Promise<Photo[]> {
    const photos = Array.from(this.photos.values());
    return projectId ? photos.filter(photo => photo.projectId === projectId) : photos;
  }

  async getPhoto(id: string): Promise<Photo | undefined> {
    return this.photos.get(id);
  }

  async createPhoto(insertPhoto: InsertPhoto): Promise<Photo> {
    const id = randomUUID();
    const photo: Photo = { 
      ...insertPhoto, 
      id, 
      createdAt: new Date() 
    };
    this.photos.set(id, photo);
    return photo;
  }

  async deletePhoto(id: string): Promise<boolean> {
    return this.photos.delete(id);
  }

  // Schedule Changes
  async getScheduleChanges(taskId?: string): Promise<ScheduleChange[]> {
    const changes = Array.from(this.scheduleChanges.values());
    return taskId ? changes.filter(change => change.taskId === taskId) : changes;
  }

  async createScheduleChange(insertChange: InsertScheduleChange): Promise<ScheduleChange> {
    const id = randomUUID();
    const change: ScheduleChange = { 
      ...insertChange, 
      id, 
      createdAt: new Date() 
    };
    this.scheduleChanges.set(id, change);
    return change;
  }

  async updateScheduleChange(id: string, updates: Partial<InsertScheduleChange>): Promise<ScheduleChange | undefined> {
    const change = this.scheduleChanges.get(id);
    if (!change) return undefined;
    
    const updatedChange = { ...change, ...updates };
    this.scheduleChanges.set(id, updatedChange);
    return updatedChange;
  }

  // Notifications
  async getNotifications(userId: string): Promise<Notification[]> {
    return Array.from(this.notifications.values())
      .filter(notification => notification.userId === userId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  async createNotification(insertNotification: InsertNotification): Promise<Notification> {
    const id = randomUUID();
    const notification: Notification = { 
      ...insertNotification, 
      id, 
      createdAt: new Date() 
    };
    this.notifications.set(id, notification);
    return notification;
  }

  async markNotificationAsRead(id: string): Promise<boolean> {
    const notification = this.notifications.get(id);
    if (!notification) return false;
    
    notification.isRead = true;
    this.notifications.set(id, notification);
    return true;
  }

  async markAllNotificationsAsRead(userId: string): Promise<boolean> {
    let updated = false;
    for (const [id, notification] of this.notifications.entries()) {
      if (notification.userId === userId && !notification.isRead) {
        notification.isRead = true;
        this.notifications.set(id, notification);
        updated = true;
      }
    }
    return updated;
  }
}

export const storage = new MemStorage();
