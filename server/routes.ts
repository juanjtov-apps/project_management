import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { 
  insertProjectSchema, insertTaskSchema, insertProjectLogSchema, 
  insertPhotoSchema, insertScheduleChangeSchema, insertNotificationSchema 
} from "@shared/schema";
import multer from "multer";
import path from "path";
import fs from "fs";

// Configure multer for file uploads
const uploadsDir = path.join(process.cwd(), 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const upload = multer({
  dest: uploadsDir,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'));
    }
  }
});

export async function registerRoutes(app: Express): Promise<Server> {
  // Projects
  app.get("/api/projects", async (req, res) => {
    try {
      const projects = await storage.getProjects();
      res.json(projects);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch projects" });
    }
  });

  app.get("/api/projects/:id", async (req, res) => {
    try {
      const project = await storage.getProject(req.params.id);
      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }
      res.json(project);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch project" });
    }
  });

  app.post("/api/projects", async (req, res) => {
    try {
      console.log("Received project data:", req.body);
      const validatedData = insertProjectSchema.parse(req.body);
      console.log("Validated data:", validatedData);
      const project = await storage.createProject(validatedData);
      res.status(201).json(project);
    } catch (error) {
      console.error("Project creation error:", error);
      if (error instanceof Error) {
        res.status(400).json({ message: "Invalid project data", error: error.message });
      } else {
        res.status(400).json({ message: "Invalid project data" });
      }
    }
  });

  app.patch("/api/projects/:id", async (req, res) => {
    try {
      const updates = insertProjectSchema.partial().parse(req.body);
      const project = await storage.updateProject(req.params.id, updates);
      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }
      res.json(project);
    } catch (error) {
      res.status(400).json({ message: "Invalid project data" });
    }
  });

  app.delete("/api/projects/:id", async (req, res) => {
    try {
      const deleted = await storage.deleteProject(req.params.id);
      if (!deleted) {
        return res.status(404).json({ message: "Project not found" });
      }
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Failed to delete project" });
    }
  });

  // Tasks
  app.get("/api/tasks", async (req, res) => {
    try {
      const projectId = req.query.projectId as string;
      const tasks = await storage.getTasks(projectId);
      res.json(tasks);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch tasks" });
    }
  });

  app.get("/api/tasks/:id", async (req, res) => {
    try {
      const task = await storage.getTask(req.params.id);
      if (!task) {
        return res.status(404).json({ message: "Task not found" });
      }
      res.json(task);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch task" });
    }
  });

  app.post("/api/tasks", async (req, res) => {
    try {
      const validatedData = insertTaskSchema.parse(req.body);
      const task = await storage.createTask(validatedData);
      res.status(201).json(task);
    } catch (error) {
      res.status(400).json({ message: "Invalid task data" });
    }
  });

  app.patch("/api/tasks/:id", async (req, res) => {
    try {
      const updates = insertTaskSchema.partial().parse(req.body);
      const task = await storage.updateTask(req.params.id, updates);
      if (!task) {
        return res.status(404).json({ message: "Task not found" });
      }
      res.json(task);
    } catch (error) {
      res.status(400).json({ message: "Invalid task data" });
    }
  });

  app.delete("/api/tasks/:id", async (req, res) => {
    try {
      const deleted = await storage.deleteTask(req.params.id);
      if (!deleted) {
        return res.status(404).json({ message: "Task not found" });
      }
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Failed to delete task" });
    }
  });

  // Project Logs
  app.get("/api/logs", async (req, res) => {
    try {
      const projectId = req.query.projectId as string;
      const logs = await storage.getProjectLogs(projectId);
      res.json(logs);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch logs" });
    }
  });

  app.post("/api/logs", async (req, res) => {
    try {
      const validatedData = insertProjectLogSchema.parse(req.body);
      const log = await storage.createProjectLog(validatedData);
      res.status(201).json(log);
    } catch (error) {
      res.status(400).json({ message: "Invalid log data" });
    }
  });

  app.patch("/api/logs/:id", async (req, res) => {
    try {
      const updates = insertProjectLogSchema.partial().parse(req.body);
      const log = await storage.updateProjectLog(req.params.id, updates);
      if (!log) {
        return res.status(404).json({ message: "Log not found" });
      }
      res.json(log);
    } catch (error) {
      res.status(400).json({ message: "Invalid log data" });
    }
  });

  // Photos
  app.get("/api/photos", async (req, res) => {
    try {
      const projectId = req.query.projectId as string;
      const photos = await storage.getPhotos(projectId);
      res.json(photos);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch photos" });
    }
  });

  app.post("/api/photos", upload.single('photo'), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "No photo file provided" });
      }

      const photoData = {
        projectId: req.body.projectId,
        userId: req.body.userId,
        filename: req.file.filename,
        originalName: req.file.originalname,
        description: req.body.description || "",
        tags: req.body.tags ? JSON.parse(req.body.tags) : []
      };

      const validatedData = insertPhotoSchema.parse(photoData);
      const photo = await storage.createPhoto(validatedData);
      res.status(201).json(photo);
    } catch (error) {
      res.status(400).json({ message: "Invalid photo data" });
    }
  });

  app.delete("/api/photos/:id", async (req, res) => {
    try {
      const photo = await storage.getPhoto(req.params.id);
      if (!photo) {
        return res.status(404).json({ message: "Photo not found" });
      }

      // Delete the actual file
      const filePath = path.join(uploadsDir, photo.filename);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }

      const deleted = await storage.deletePhoto(req.params.id);
      if (!deleted) {
        return res.status(404).json({ message: "Photo not found" });
      }
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Failed to delete photo" });
    }
  });

  // Serve uploaded files
  app.get("/api/photos/:id/file", async (req, res) => {
    try {
      const photo = await storage.getPhoto(req.params.id);
      if (!photo) {
        return res.status(404).json({ message: "Photo not found" });
      }

      const filePath = path.join(uploadsDir, photo.filename);
      if (!fs.existsSync(filePath)) {
        return res.status(404).json({ message: "Photo file not found" });
      }

      res.sendFile(filePath);
    } catch (error) {
      res.status(500).json({ message: "Failed to serve photo" });
    }
  });

  // Schedule Changes
  app.get("/api/schedule-changes", async (req, res) => {
    try {
      const taskId = req.query.taskId as string;
      const changes = await storage.getScheduleChanges(taskId);
      res.json(changes);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch schedule changes" });
    }
  });

  app.post("/api/schedule-changes", async (req, res) => {
    try {
      const validatedData = insertScheduleChangeSchema.parse(req.body);
      const change = await storage.createScheduleChange(validatedData);
      
      // Create notification for project manager
      await storage.createNotification({
        userId: "manager-id", // In a real app, this would be determined from the project
        title: "Schedule Change Alert",
        message: `Schedule change reported for task: ${validatedData.reason}`,
        type: "warning",
        isRead: false,
        relatedEntityType: "schedule_change",
        relatedEntityId: change.id
      });

      res.status(201).json(change);
    } catch (error) {
      res.status(400).json({ message: "Invalid schedule change data" });
    }
  });

  app.patch("/api/schedule-changes/:id", async (req, res) => {
    try {
      const updates = insertScheduleChangeSchema.partial().parse(req.body);
      const change = await storage.updateScheduleChange(req.params.id, updates);
      if (!change) {
        return res.status(404).json({ message: "Schedule change not found" });
      }
      res.json(change);
    } catch (error) {
      res.status(400).json({ message: "Invalid schedule change data" });
    }
  });

  // Notifications
  app.get("/api/notifications", async (req, res) => {
    try {
      const userId = req.query.userId as string;
      if (!userId) {
        return res.status(400).json({ message: "User ID is required" });
      }
      const notifications = await storage.getNotifications(userId);
      res.json(notifications);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch notifications" });
    }
  });

  app.patch("/api/notifications/:id/read", async (req, res) => {
    try {
      const success = await storage.markNotificationAsRead(req.params.id);
      if (!success) {
        return res.status(404).json({ message: "Notification not found" });
      }
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Failed to mark notification as read" });
    }
  });

  app.patch("/api/notifications/mark-all-read", async (req, res) => {
    try {
      const userId = req.body.userId;
      if (!userId) {
        return res.status(400).json({ message: "User ID is required" });
      }
      await storage.markAllNotificationsAsRead(userId);
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Failed to mark all notifications as read" });
    }
  });

  // Dashboard stats
  app.get("/api/dashboard/stats", async (req, res) => {
    try {
      const projects = await storage.getProjects();
      const tasks = await storage.getTasks();
      const photos = await storage.getPhotos();
      
      const activeProjects = projects.filter(p => p.status === 'active').length;
      const pendingTasks = tasks.filter(t => t.status === 'pending' || t.status === 'in-progress').length;
      const photosUploadedToday = photos.filter(p => {
        const today = new Date();
        const photoDate = new Date(p.createdAt);
        return photoDate.toDateString() === today.toDateString();
      }).length;

      res.json({
        activeProjects,
        pendingTasks,
        photosUploaded: photos.length,
        photosUploadedToday,
        crewMembers: 28 // Static for demo
      });
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch dashboard stats" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
