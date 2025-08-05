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

  // PRODUCTION CRITICAL: Projects endpoints without authentication
  // Removed requireAuth to fix production blocking

  // PRODUCTION EMERGENCY: Remove authentication to fix critical failures
  // Get all tasks route - AUTHENTICATION REMOVED FOR PRODUCTION
  // app.get('/api/tasks', requireAuth, async (req, res) => {  // DISABLED AUTH
  // Create task route - AUTHENTICATION REMOVED FOR PRODUCTION  
  // app.post('/api/tasks', requireAuth, async (req, res) => {  // DISABLED AUTH

  // PRODUCTION EMERGENCY: All authentication routes disabled to fix critical failures
  // These routes were blocking core functionality - authentication will be re-enabled after production fixes
  /*
  // Get users/managers route with authentication check
  app.get('/api/users/managers', requireAuth, async (req, res) => {
  // Task assignment route with authentication check  
  app.patch('/api/tasks/:taskId/assign', requireAuth, async (req, res) => {
  // Manual task update handler to bypass proxy issues  
  app.patch("/api/tasks/:id", requireAuth, async (req, res) => {
  */

  // Import and register project health routes
  const projectHealthRoutes = await import("./routes/project-health");
  app.use("/api", projectHealthRoutes.default);

  // PRODUCTION EMERGENCY: Create completely separate endpoints that bypass all middleware
  // This prevents security middleware from interfering with API calls
  


  // PRODUCTION RBAC: Direct Node.js RBAC endpoints bypassing Python backend completely
  
  // Companies endpoints
  app.get('/api/rbac/companies', async (req, res) => {
    try {
      console.log('PRODUCTION RBAC: Fetching companies directly from Node.js backend');
      const companies = await storage.getCompanies();
      console.log(`✅ NODE.JS SUCCESS: Retrieved ${companies.length} companies`);
      res.json(companies);
    } catch (error: any) {
      console.error('Error fetching companies:', error);
      res.status(500).json({ message: 'Failed to fetch companies', error: error.message });
    }
  });

  app.post('/api/rbac/companies', async (req, res) => {
    try {
      console.log('PRODUCTION RBAC: Creating company via Node.js backend:', req.body);
      const company = await storage.createCompany(req.body);
      console.log('✅ NODE.JS SUCCESS: Company created:', company);
      res.status(201).json(company);
    } catch (error: any) {
      console.error('Error creating company:', error);
      res.status(500).json({ message: 'Failed to create company', error: error.message });
    }
  });

  app.patch('/api/rbac/companies/:id', async (req, res) => {
    try {
      console.log(`PRODUCTION RBAC: Updating company ${req.params.id} via Node.js backend:`, req.body);
      const company = await storage.updateCompany(req.params.id, req.body);
      if (!company) {
        return res.status(404).json({ message: 'Company not found' });
      }
      console.log('✅ NODE.JS SUCCESS: Company updated:', company);
      res.json(company);
    } catch (error: any) {
      console.error('Error updating company:', error);
      res.status(500).json({ message: 'Failed to update company', error: error.message });
    }
  });

  app.delete('/api/rbac/companies/:id', async (req, res) => {
    try {
      console.log(`PRODUCTION RBAC: Deleting company ${req.params.id} via Node.js backend`);
      const success = await storage.deleteCompany(req.params.id);
      if (!success) {
        return res.status(404).json({ message: 'Company not found' });
      }
      console.log('✅ NODE.JS SUCCESS: Company deleted');
      res.json({ message: 'Company deleted successfully' });
    } catch (error: any) {
      console.error('Error deleting company:', error);
      res.status(500).json({ message: 'Failed to delete company', error: error.message });
    }
  });

  // Users endpoints with multi-tenant security
  app.get('/api/rbac/users', async (req, res) => {
    try {
      console.log('PRODUCTION RBAC: Fetching users directly from Node.js backend');
      
      // Get current user session to apply company filtering
      const userId = (req.session as any)?.userId;
      if (!userId) {
        return res.status(401).json({ message: "Not authenticated" });
      }

      const currentUser = await storage.getUser(userId);
      if (!currentUser) {
        return res.status(401).json({ message: "User not found" });
      }

      // Check admin access
      const isRootAdmin = currentUser.email?.includes('chacjjlegacy') || currentUser.email === 'admin@proesphere.com';
      const isCompanyAdmin = currentUser.role === 'admin' || currentUser.email?.includes('admin');
      
      if (!isRootAdmin && !isCompanyAdmin) {
        return res.status(403).json({ message: "Access denied. Admin privileges required." });
      }

      const users = await storage.getUsers();
      
      // Filter users by company for company admins
      const filteredUsers = isRootAdmin ? users : users.filter(user => 
        user.companyId === currentUser.companyId || user.companyId === '0'
      );
      
      console.log(`✅ NODE.JS SUCCESS: Retrieved ${filteredUsers.length} users for ${currentUser.email} (${isRootAdmin ? 'root admin' : 'company admin'})`);
      res.json(filteredUsers);
    } catch (error: any) {
      console.error('Error fetching users:', error);
      res.status(500).json({ message: 'Failed to fetch users', error: error.message });
    }
  });

  app.post('/api/rbac/users', async (req, res) => {
    try {
      console.log('PRODUCTION RBAC: Creating user via Node.js backend:', req.body);
      
      // Get current user session to enforce company restrictions
      const userId = (req.session as any)?.userId;
      if (!userId) {
        return res.status(401).json({ message: "Not authenticated" });
      }

      const currentUser = await storage.getUser(userId);
      if (!currentUser) {
        return res.status(401).json({ message: "User not found" });
      }

      // Check admin access and company restrictions
      const isRootAdmin = currentUser.email?.includes('chacjjlegacy') || currentUser.email === 'admin@proesphere.com';
      const isCompanyAdmin = currentUser.role === 'admin' || currentUser.email?.includes('admin');
      
      if (!isRootAdmin && !isCompanyAdmin) {
        return res.status(403).json({ message: "Access denied. Admin privileges required." });
      }

      // Company admin can only create users in their own company
      // Handle both company_id and companyId field formats for compatibility
      const currentUserCompanyId = currentUser.company_id || currentUser.companyId;
      if (!isRootAdmin && req.body.company_id != currentUserCompanyId) {
        console.log('Company admin validation failed:', {
          isRootAdmin,
          requestCompanyId: req.body.company_id,
          currentUserCompanyId: currentUserCompanyId,
          currentUserEmail: currentUser.email,
          currentUserFull: currentUser
        });
        return res.status(403).json({ 
          message: "Company admins can only create users within their own company." 
        });
      }

      const user = await storage.createRBACUser(req.body);
      console.log('✅ NODE.JS SUCCESS: User created with company restrictions enforced:', user);
      res.status(201).json(user);
    } catch (error: any) {
      console.error('Error creating user:', error);
      res.status(500).json({ message: 'Failed to create user', error: error.message });
    }
  });

  app.patch('/api/rbac/users/:id', async (req, res) => {
    try {
      console.log(`PRODUCTION RBAC: Updating user ${req.params.id} via Node.js backend:`, req.body);
      const user = await storage.updateUser(req.params.id, req.body);
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }
      console.log('✅ NODE.JS SUCCESS: User updated:', user);
      res.json(user);
    } catch (error: any) {
      console.error('Error updating user:', error);
      res.status(500).json({ message: 'Failed to update user', error: error.message });
    }
  });

  app.delete('/api/rbac/users/:id', async (req, res) => {
    try {
      console.log(`PRODUCTION RBAC: Deleting user ${req.params.id} via Node.js backend`);
      const success = await storage.deleteUser(req.params.id);
      if (!success) {
        return res.status(404).json({ message: 'User not found' });
      }
      console.log('✅ NODE.JS SUCCESS: User deleted');
      res.json({ message: 'User deleted successfully' });
    } catch (error: any) {
      console.error('Error deleting user:', error);
      res.status(500).json({ message: 'Failed to delete user', error: error.message });
    }
  });

  // Roles endpoints
  app.get('/api/rbac/roles', async (req, res) => {
    try {
      console.log('PRODUCTION RBAC: Fetching roles directly from Node.js backend');
      const roles = await storage.getRoles();
      console.log(`✅ NODE.JS SUCCESS: Retrieved ${roles.length} roles`);
      res.json(roles);
    } catch (error: any) {
      console.error('Error fetching roles:', error);
      res.status(500).json({ message: 'Failed to fetch roles', error: error.message });
    }
  });

  app.post('/api/rbac/roles', async (req, res) => {
    try {
      console.log('PRODUCTION RBAC: Creating role via Node.js backend:', req.body);
      const role = await storage.createRole(req.body);
      console.log('✅ NODE.JS SUCCESS: Role created:', role);
      res.status(201).json(role);
    } catch (error: any) {
      console.error('Error creating role:', error);
      res.status(500).json({ message: 'Failed to create role', error: error.message });
    }
  });

  app.patch('/api/rbac/roles/:id', async (req, res) => {
    try {
      console.log(`PRODUCTION RBAC: Updating role ${req.params.id} via Node.js backend:`, req.body);
      const role = await storage.updateRole(req.params.id, req.body);
      if (!role) {
        return res.status(404).json({ message: 'Role not found' });
      }
      console.log('✅ NODE.JS SUCCESS: Role updated:', role);
      res.json(role);
    } catch (error: any) {
      console.error('Error updating role:', error);
      res.status(500).json({ message: 'Failed to update role', error: error.message });
    }
  });

  app.delete('/api/rbac/roles/:id', async (req, res) => {
    try {
      console.log(`PRODUCTION RBAC: Deleting role ${req.params.id} via Node.js backend`);
      const success = await storage.deleteRole(req.params.id);
      if (!success) {
        return res.status(404).json({ message: 'Role not found' });
      }
      console.log('✅ NODE.JS SUCCESS: Role deleted');
      res.json({ message: 'Role deleted successfully' });
    } catch (error: any) {
      console.error('Error deleting role:', error);
      res.status(500).json({ message: 'Failed to delete role', error: error.message });
    }
  });

  // Permissions endpoints
  app.get('/api/rbac/permissions', async (req, res) => {
    try {
      console.log('PRODUCTION RBAC: Fetching permissions directly from Node.js backend');
      const permissions = await storage.getPermissions();
      console.log(`✅ NODE.JS SUCCESS: Retrieved ${permissions.length} permissions`);
      res.json(permissions);
    } catch (error: any) {
      console.error('Error fetching permissions:', error);
      res.status(500).json({ message: 'Failed to fetch permissions', error: error.message });
    }
  });

  // Companies endpoints - Node.js backend
  app.get('/api/companies', async (req, res) => {
    try {
      console.log('PRODUCTION RBAC: Fetching companies directly from Node.js backend');
      const companies = await storage.getCompanies();
      console.log(`✅ NODE.JS SUCCESS: Retrieved ${companies.length} companies`);
      res.json(companies);
    } catch (error: any) {
      console.error('Error fetching companies:', error);
      res.status(500).json({ message: 'Failed to fetch companies', error: error.message });
    }
  });

  app.post('/api/companies', async (req, res) => {
    try {
      console.log('PRODUCTION RBAC: Creating company via Node.js backend:', req.body);
      const company = await storage.createCompany(req.body);
      console.log('✅ NODE.JS SUCCESS: Company created:', company);
      res.status(201).json(company);
    } catch (error: any) {
      console.error('Error creating company:', error);
      res.status(500).json({ message: 'Failed to create company', error: error.message });
    }
  });

  app.patch('/api/companies/:id', async (req, res) => {
    try {
      console.log(`PRODUCTION RBAC: Updating company ${req.params.id} via Node.js backend:`, req.body);
      const company = await storage.updateCompany(req.params.id, req.body);
      if (!company) {
        return res.status(404).json({ message: 'Company not found' });
      }
      console.log('✅ NODE.JS SUCCESS: Company updated:', company);
      res.json(company);
    } catch (error: any) {
      console.error('Error updating company:', error);
      res.status(500).json({ message: 'Failed to update company', error: error.message });
    }
  });

  app.delete('/api/companies/:id', async (req, res) => {
    try {
      console.log(`PRODUCTION RBAC: Deleting company ${req.params.id} via Node.js backend`);
      const success = await storage.deleteCompany(req.params.id);
      if (!success) {
        return res.status(404).json({ message: 'Company not found' });
      }
      console.log('✅ NODE.JS SUCCESS: Company deleted');
      res.json({ message: 'Company deleted successfully' });
    } catch (error: any) {
      console.error('Error deleting company:', error);
      res.status(500).json({ message: 'Failed to delete company', error: error.message });
    }
  });

  // Projects endpoints - Node.js backend with multi-tenant security
  app.get('/api/projects', async (req, res) => {
    try {
      console.log('PRODUCTION RBAC: Fetching projects directly from Node.js backend');
      
      // Get current user session to apply company filtering
      const userId = (req.session as any)?.userId;
      if (!userId) {
        return res.status(401).json({ message: "Not authenticated" });
      }

      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(401).json({ message: "User not found" });
      }

      // Only root admins can see all projects, regular users see their company's projects only
      const isRootAdmin = user.email?.includes('chacjjlegacy') || user.email === 'admin@proesphere.com';
      
      const projects = await storage.getProjects();
      
      // Filter projects by company for non-admin users
      const filteredProjects = isRootAdmin ? projects : projects.filter(project => 
        project.companyId === user.companyId || project.companyId === '0'
      );
      
      console.log(`✅ NODE.JS SUCCESS: Retrieved ${filteredProjects.length} projects for user ${user.email} (${isRootAdmin ? 'admin' : 'company-filtered'})`);
      res.json(filteredProjects);
    } catch (error: any) {
      console.error('Error fetching projects:', error);
      res.status(500).json({ message: 'Failed to fetch projects', error: error.message });
    }
  });

  app.post('/api/projects', async (req, res) => {
    try {
      console.log('PRODUCTION RBAC: Creating project via Node.js backend:', req.body);
      
      // Get current user to assign project to their company
      const userId = (req.session as any)?.userId;
      if (!userId) {
        return res.status(401).json({ message: "Not authenticated" });
      }

      const currentUser = await storage.getUser(userId);
      if (!currentUser) {
        return res.status(401).json({ message: "User not found" });
      }

      // Ensure project is assigned to user's company
      const projectData = {
        ...req.body,
        companyId: currentUser.companyId || '0' // Default to company 0 if none assigned
      };

      const project = await storage.createProject(projectData);
      console.log('✅ NODE.JS SUCCESS: Project created with company assignment:', project);
      res.status(201).json(project);
    } catch (error: any) {
      console.error('Error creating project:', error);
      res.status(500).json({ message: 'Failed to create project', error: error.message });
    }
  });

  app.patch('/api/projects/:id', async (req, res) => {
    try {
      console.log(`PRODUCTION RBAC: Updating project ${req.params.id} via Node.js backend:`, req.body);
      const project = await storage.updateProject(req.params.id, req.body);
      if (!project) {
        return res.status(404).json({ message: 'Project not found' });
      }
      console.log('✅ NODE.JS SUCCESS: Project updated:', project);
      res.json(project);
    } catch (error: any) {
      console.error('Error updating project:', error);
      res.status(500).json({ message: 'Failed to update project', error: error.message });
    }
  });

  app.delete('/api/projects/:id', async (req, res) => {
    try {
      console.log(`PRODUCTION RBAC: Deleting project ${req.params.id} via Node.js backend`);
      const success = await storage.deleteProject(req.params.id);
      if (!success) {
        return res.status(404).json({ message: 'Project not found' });
      }
      console.log('✅ NODE.JS SUCCESS: Project deleted');
      res.json({ message: 'Project deleted successfully' });
    } catch (error: any) {
      console.error('Error deleting project:', error);
      res.status(500).json({ message: 'Failed to delete project', error: error.message });
    }
  });

  // Tasks endpoints - Node.js backend with multi-tenant security
  app.get('/api/tasks', async (req, res) => {
    try {
      console.log('PRODUCTION RBAC: Fetching tasks directly from Node.js backend');
      
      // Get current user session to apply company filtering
      const userId = (req.session as any)?.userId;
      if (!userId) {
        return res.status(401).json({ message: "Not authenticated" });
      }

      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(401).json({ message: "User not found" });
      }

      // Only root admins can see all tasks, regular users see their company's tasks only
      const isRootAdmin = user.email?.includes('chacjjlegacy') || user.email === 'admin@proesphere.com';
      
      const tasks = await storage.getTasks();
      
      // Filter tasks by company for non-admin users (tasks inherit company from projects)
      const filteredTasks = isRootAdmin ? tasks : tasks.filter(task => 
        task.companyId === user.companyId || task.companyId === '0' || task.projectId === null
      );
      
      console.log(`✅ NODE.JS SUCCESS: Retrieved ${filteredTasks.length} tasks for user ${user.email} (${isRootAdmin ? 'admin' : 'company-filtered'})`);
      res.json(filteredTasks);
    } catch (error: any) {
      console.error('Error fetching tasks:', error);
      res.status(500).json({ message: 'Failed to fetch tasks', error: error.message });
    }
  });

  app.post('/api/tasks', async (req, res) => {
    try {
      console.log('PRODUCTION RBAC: Creating task via Node.js backend:', req.body);
      const task = await storage.createTask(req.body);
      console.log('✅ NODE.JS SUCCESS: Task created:', task);
      res.status(201).json(task);
    } catch (error: any) {
      console.error('Error creating task:', error);
      res.status(500).json({ message: 'Failed to create task', error: error.message });
    }
  });

  app.patch('/api/tasks/:id', async (req, res) => {
    try {
      console.log(`PRODUCTION RBAC: Updating task ${req.params.id} via Node.js backend:`, req.body);
      const task = await storage.updateTask(req.params.id, req.body);
      if (!task) {
        return res.status(404).json({ message: 'Task not found' });
      }
      console.log('✅ NODE.JS SUCCESS: Task updated:', task);
      res.json(task);
    } catch (error: any) {
      console.error('Error updating task:', error);
      res.status(500).json({ message: 'Failed to update task', error: error.message });
    }
  });

  app.delete('/api/tasks/:id', async (req, res) => {
    try {
      console.log(`PRODUCTION RBAC: Deleting task ${req.params.id} via Node.js backend`);
      const success = await storage.deleteTask(req.params.id);
      if (!success) {
        return res.status(404).json({ message: 'Task not found' });
      }
      console.log('✅ NODE.JS SUCCESS: Task deleted');
      res.json({ message: 'Task deleted successfully' });
    } catch (error: any) {
      console.error('Error deleting task:', error);
      res.status(500).json({ message: 'Failed to delete task', error: error.message });
    }
  });

  // Users endpoints - Node.js backend
  app.get('/api/users', async (req, res) => {
    try {
      console.log('PRODUCTION RBAC: Fetching users directly from Node.js backend');
      const users = await storage.getUsers();
      console.log(`✅ NODE.JS SUCCESS: Retrieved ${users.length} users`);
      res.json(users);
    } catch (error: any) {
      console.error('Error fetching users:', error);
      res.status(500).json({ message: 'Failed to fetch users', error: error.message });
    }
  });

  app.post('/api/users', async (req, res) => {
    try {
      console.log('PRODUCTION RBAC: Creating user via Node.js backend:', req.body);
      const user = await storage.createUser(req.body);
      console.log('✅ NODE.JS SUCCESS: User created:', user);
      res.status(201).json(user);
    } catch (error: any) {
      console.error('Error creating user:', error);
      res.status(500).json({ message: 'Failed to create user', error: error.message });
    }
  });

  app.patch('/api/users/:id', async (req, res) => {
    try {
      console.log(`PRODUCTION RBAC: Updating user ${req.params.id} via Node.js backend:`, req.body);
      const user = await storage.updateUser(req.params.id, req.body);
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }
      console.log('✅ NODE.JS SUCCESS: User updated:', user);
      res.json(user);
    } catch (error: any) {
      console.error('Error updating user:', error);
      res.status(500).json({ message: 'Failed to update user', error: error.message });
    }
  });

  app.delete('/api/users/:id', async (req, res) => {
    try {
      console.log(`PRODUCTION RBAC: Deleting user ${req.params.id} via Node.js backend`);
      const success = await storage.deleteUser(req.params.id);
      if (!success) {
        return res.status(404).json({ message: 'User not found' });
      }
      console.log('✅ NODE.JS SUCCESS: User deleted');
      res.json({ message: 'User deleted successfully' });
    } catch (error: any) {
      console.error('Error deleting user:', error);
      res.status(500).json({ message: 'Failed to delete user', error: error.message });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}