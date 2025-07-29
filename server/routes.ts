import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import session from "express-session";
import connectPg from "connect-pg-simple";
import bcrypt from "bcrypt";

export async function registerRoutes(app: Express): Promise<Server> {
  // Session configuration
  const sessionTtl = 7 * 24 * 60 * 60 * 1000; // 1 week
  const pgStore = connectPg(session);
  const sessionStore = new pgStore({
    conString: process.env.DATABASE_URL,
    createTableIfMissing: false,
    ttl: sessionTtl,
    tableName: "sessions",
  });

  app.use(session({
    secret: process.env.SESSION_SECRET!,
    store: sessionStore,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: false, // Set to true in production with HTTPS
      maxAge: sessionTtl,
    },
  }));

  // Login route
  app.post('/api/auth/login', async (req, res) => {
    try {
      const { email, password } = req.body;
      
      if (!email || !password) {
        return res.status(400).json({ message: "Email and password are required" });
      }

      const user = await storage.getUserByEmail(email);
      if (!user || !user.password) {
        return res.status(401).json({ message: "Invalid credentials" });
      }

      const isValidPassword = await bcrypt.compare(password, user.password);
      if (!isValidPassword) {
        return res.status(401).json({ message: "Invalid credentials" });
      }

      // Store user in session
      (req.session as any).userId = user.id;
      res.json({ user: { ...user, password: undefined } });
    } catch (error) {
      console.error("Login error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Get current user route
  app.get('/api/auth/user', async (req, res) => {
    try {
      const userId = (req.session as any)?.userId;
      if (!userId) {
        return res.status(401).json({ message: "Not authenticated" });
      }

      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(401).json({ message: "User not found" });
      }

      res.json({ ...user, password: undefined });
    } catch (error) {
      console.error("Get user error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Logout route
  app.post('/api/auth/logout', (req, res) => {
    req.session.destroy((err) => {
      if (err) {
        return res.status(500).json({ message: "Could not log out" });
      }
      res.json({ message: "Logged out successfully" });
    });
  });

  // Add middleware to check authentication for protected routes
  const requireAuth = (req: any, res: any, next: any) => {
    const userId = req.session?.userId;
    if (!userId) {
      return res.status(401).json({ message: "Authentication required" });
    }
    next();
  };

  // Get all projects route with authentication check
  app.get('/api/projects', requireAuth, async (req, res) => {
    try {
      const response = await fetch('http://localhost:8000/api/projects');
      const data = await response.json();
      
      if (!response.ok) {
        console.error('Python backend error:', data);
        return res.status(response.status).json(data);
      }

      res.json(data);
    } catch (error) {
      console.error('Error fetching projects:', error);
      res.status(500).json({ message: 'Failed to fetch projects', error: error.message });
    }
  });

  // Create project route with authentication check
  app.post('/api/projects', requireAuth, async (req, res) => {
    try {
      console.log('Creating project via Express:', req.body);
      const projectData = req.body;
      
      const response = await fetch('http://localhost:8000/api/projects', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(projectData)
      });

      const data = await response.json();
      
      if (!response.ok) {
        console.error('Python backend error:', data);
        return res.status(response.status).json(data);
      }

      console.log('Project created successfully:', data);
      res.status(201).json(data);
    } catch (error) {
      console.error('Error creating project:', error);
      res.status(500).json({ message: 'Failed to create project', error: error.message });
    }
  });

  // Get all tasks route with authentication check
  app.get('/api/tasks', requireAuth, async (req, res) => {
    try {
      const response = await fetch('http://localhost:8000/api/tasks');
      const data = await response.json();
      
      if (!response.ok) {
        console.error('Python backend error:', data);
        return res.status(response.status).json(data);
      }

      res.json(data);
    } catch (error) {
      console.error('Error fetching tasks:', error);
      res.status(500).json({ message: 'Failed to fetch tasks', error: error.message });
    }
  });

  // Create task route with authentication check
  app.post('/api/tasks', requireAuth, async (req, res) => {
    try {
      console.log('Creating task via Express:', req.body);
      const taskData = req.body;
      
      const response = await fetch('http://localhost:8000/api/tasks', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(taskData)
      });

      const data = await response.json();
      
      if (!response.ok) {
        console.error('Python backend error:', data);
        return res.status(response.status).json(data);
      }

      console.log('Task created successfully:', data);
      res.status(201).json(data);
    } catch (error) {
      console.error('Error creating task:', error);
      res.status(500).json({ message: 'Failed to create task', error: error.message });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}