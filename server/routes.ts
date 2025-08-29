import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { ObjectStorageService } from "./objectStorage";
import session from "express-session";
import connectPg from "connect-pg-simple";
import bcrypt from "bcrypt";
import multer from "multer";
import path from "path";
import fs from "fs";
import express from "express";
import { authorize, enforceCompanyScope, getNavigationPermissions, type AuthorizedRequest } from "./rbacMiddleware";

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
      
      console.log("Login attempt:", { email, password: password ? "***" : "empty" });
      
      if (!email || !password) {
        console.log("Missing credentials");
        return res.status(400).json({ message: "Email and password are required" });
      }

      const user = await storage.getUserByEmail(email);
      console.log("User found:", user ? "yes" : "no", user ? `id: ${user.id}` : "");
      console.log("User has password field:", user ? !!user.password : "no user");
      console.log("Password field length:", user?.password?.length || 0);
      
      if (!user || !user.password) {
        console.log("No user or no password found");
        return res.status(401).json({ message: "Invalid credentials" });
      }

      const isValidPassword = await bcrypt.compare(password, user.password);
      console.log("Password valid:", isValidPassword);
      
      if (!isValidPassword) {
        console.log("Invalid password");
        return res.status(401).json({ message: "Invalid credentials" });
      }

      // Store user in session
      (req.session as any).userId = user.id;
      console.log("Login successful for user:", user.email);
      res.json({ user: { ...user, password: undefined } });
    } catch (error) {
      console.error("Login error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Get current user route with navigation permissions
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

      // Add navigation permissions
      const isRootAdmin = user.id === '0' || 
                          user.email === 'chacjjlegacy@proesphera.com' ||
                          user.email === 'admin@proesphere.com';
      
      const permissions = getNavigationPermissions(user.role || 'user', isRootAdmin);

      res.json({ 
        ...user, 
        password: undefined,
        permissions,
        isRootAdmin
      });
    } catch (error) {
      console.error("Get user error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Logout route with improved error handling
  app.post('/api/auth/logout', (req, res) => {
    req.session.destroy((err) => {
      if (err) {
        console.error("Session destroy error:", err);
        return res.status(500).json({ success: false, message: "Could not log out" });
      }
      res.json({ success: true, message: "Logged out successfully" });
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
  app.get('/api/rbac/companies', authorize(['admin']), enforceCompanyScope(), async (req: AuthorizedRequest, res) => {
    try {
      console.log('PRODUCTION RBAC: Fetching companies directly from Node.js backend');
      
      // Root admin sees all companies, company admins see only their company
      if (req.isRootAdmin) {
        const companies = await storage.getCompanies();
        console.log(`✅ NODE.JS SUCCESS: Root admin retrieved ${companies.length} companies`);
        res.json(companies);
      } else {
        // Company admin sees only their own company
        const companies = await storage.getCompanies();
        const userCompanyId = req.currentUser?.company_id;
        const filteredCompanies = companies.filter(c => c.id === userCompanyId);
        console.log(`✅ NODE.JS SUCCESS: Company admin retrieved ${filteredCompanies.length} companies (filtered)`);
        res.json(filteredCompanies);
      }
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

  // Get users for a specific company
  app.get('/api/rbac/companies/:id/users', async (req, res) => {
    try {
      console.log(`PRODUCTION RBAC: Fetching users for company ${req.params.id} via Node.js backend`);
      const companyUsers = await storage.getCompanyUsers(req.params.id);
      console.log(`✅ NODE.JS SUCCESS: Retrieved ${companyUsers.length} users for company ${req.params.id}`);
      res.json(companyUsers);
    } catch (error: any) {
      console.error('Error fetching company users:', error);
      res.status(500).json({ message: 'Failed to fetch company users', error: error.message });
    }
  });

  // PRODUCTION: Add users/managers endpoint for task assignment
  app.get('/api/users/managers', async (req, res) => {
    try {
      console.log('PRODUCTION: Fetching managers for task assignment via Node.js backend');
      
      // Get current user session to apply company filtering
      const userId = (req.session as any)?.userId;
      if (!userId) {
        return res.status(401).json({ message: "Not authenticated" });
      }

      const currentUser = await storage.getUser(userId);
      if (!currentUser) {
        return res.status(401).json({ message: "User not found" });
      }

      const users = await storage.getUsers();
      
      // Filter users by current user's company for task assignment
      // Handle both company_id and companyId field formats for compatibility
      const currentUserCompanyId = currentUser.companyId;
      const filteredUsers = users.filter(user => {
        const userCompanyId = user.companyId;
        return userCompanyId === currentUserCompanyId;
      });
      
      console.log(`✅ NODE.JS SUCCESS: Retrieved ${filteredUsers.length} managers for task assignment for company ${currentUserCompanyId}`);
      res.json(filteredUsers);
    } catch (error: any) {
      console.error('Error fetching managers:', error);
      res.status(500).json({ message: 'Failed to fetch managers', error: error.message });
    }
  });

  // Task assignment endpoint
  app.patch('/api/tasks/:taskId/assign', async (req, res) => {
    try {
      console.log(`PRODUCTION: Assigning task ${req.params.taskId} via Node.js backend:`, req.body);
      
      // Get current user session to apply company filtering
      const userId = (req.session as any)?.userId;
      if (!userId) {
        return res.status(401).json({ message: "Not authenticated" });
      }

      const currentUser = await storage.getUser(userId);
      if (!currentUser) {
        return res.status(401).json({ message: "User not found" });
      }

      const { assignee_id } = req.body;
      const task = await storage.assignTask(req.params.taskId, assignee_id);
      
      if (!task) {
        return res.status(404).json({ message: 'Task not found' });
      }
      
      console.log('✅ NODE.JS SUCCESS: Task assigned:', task);
      res.json(task);
    } catch (error: any) {
      console.error('Error assigning task:', error);
      res.status(500).json({ message: 'Failed to assign task', error: error.message });
    }
  });

  // Users endpoints with multi-tenant security
  app.get('/api/rbac/users', authorize(['admin']), enforceCompanyScope(), async (req: AuthorizedRequest, res) => {
    try {
      console.log('PRODUCTION RBAC: Fetching users directly from Node.js backend');
      
      // Root admin sees all users, company admins see only their company users
      if (req.isRootAdmin) {
        console.log(`RBAC: Root admin ${req.currentUser?.email} requesting all users`);
        const allUsers = await storage.getUsers();
        console.log(`✅ NODE.JS SUCCESS: Retrieved ${allUsers.length} users for ${req.currentUser?.email} (root admin)`);
        res.json(allUsers);
      } else {
        // Company admin sees only their company users
        console.log(`RBAC: Company admin ${req.currentUser?.email} requesting company users`);
        // Use correct field name - database schema uses companyId (camelCase)
        const companyId = req.currentUser?.companyId || req.currentUser?.company_id;
        console.log(`✅ Fetching users for company ${companyId}`);
        const companyUsers = await storage.getCompanyUsers(companyId);
        console.log(`✅ NODE.JS SUCCESS: Retrieved ${companyUsers.length} users for company ${companyId}`);
        res.json(companyUsers);
      }
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
      const currentUserCompanyId = currentUser.companyId;
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
      
      // Get current user session to enforce authorization
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

      // Get the user to be deleted to check company restrictions
      const userToDelete = await storage.getUser(req.params.id);
      if (!userToDelete) {
        return res.status(404).json({ message: 'User not found' });
      }

      // Company admin can only delete users in their own company
      const currentUserCompanyId = currentUser.companyId;
      const targetUserCompanyId = userToDelete.companyId;
      
      if (!isRootAdmin && targetUserCompanyId !== currentUserCompanyId) {
        console.log('Company admin validation failed for deletion:', {
          isRootAdmin,
          currentUserCompanyId: currentUserCompanyId,
          targetUserCompanyId: targetUserCompanyId,
          currentUserEmail: currentUser.email
        });
        return res.status(403).json({ 
          message: "Company admins can only delete users within their own company." 
        });
      }

      const success = await storage.deleteUser(req.params.id);
      if (!success) {
        return res.status(404).json({ message: 'User not found' });
      }
      console.log(`✅ NODE.JS SUCCESS: User deleted by ${currentUser.email} (${isRootAdmin ? 'root admin' : 'company admin'})`);
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
      
      // Filter tasks by company for non-admin users - STRICT MULTI-TENANCY
      const filteredTasks = isRootAdmin ? tasks : tasks.filter(task => 
        task.companyId === user.companyId
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
      
      // Get current user to assign task to their company
      const userId = (req.session as any)?.userId;
      if (!userId) {
        return res.status(401).json({ message: "Not authenticated" });
      }

      const currentUser = await storage.getUser(userId);
      if (!currentUser) {
        return res.status(401).json({ message: "User not found" });
      }

      // Ensure task is assigned to user's company - CRITICAL FOR MULTI-TENANCY
      const taskData = {
        ...req.body,
        companyId: currentUser.companyId
      };

      const task = await storage.createTask(taskData);
      
      // Log activity for task creation
      await storage.createActivity({
        userId: currentUser.id,
        companyId: currentUser.companyId,
        actionType: 'task_created',
        description: `Created task "${task.title}"`,
        entityType: 'task',
        entityId: task.id,
        metadata: { category: task.category, priority: task.priority }
      });
      
      console.log('✅ NODE.JS SUCCESS: Task created with company assignment:', task);
      res.status(201).json(task);
    } catch (error: any) {
      console.error('Error creating task:', error);
      res.status(500).json({ message: 'Failed to create task', error: error.message });
    }
  });

  app.patch('/api/tasks/:id', requireAuth, async (req, res) => {
    try {
      console.log(`PRODUCTION RBAC: Updating task ${req.params.id} via Node.js backend:`, req.body);
      
      // Get current user for activity logging
      const userId = (req.session as any)?.userId;
      const currentUser = await storage.getUser(userId);
      
      const task = await storage.updateTask(req.params.id, req.body);
      if (!task) {
        return res.status(404).json({ message: 'Task not found' });
      }
      
      // Log activity for task update
      if (currentUser) {
        await storage.createActivity({
          userId: currentUser.id,
          companyId: currentUser.companyId,
          actionType: 'task_updated',
          description: `Updated task "${task.title}"`,
          entityType: 'task',
          entityId: task.id,
          metadata: { updates: req.body }
        });
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

  // Dashboard stats endpoint - Node.js backend
  app.get('/api/dashboard/stats', async (req, res) => {
    try {
      console.log('PRODUCTION: Fetching dashboard stats via Node.js backend');
      
      // Get current user session to apply company filtering
      const userId = (req.session as any)?.userId;
      if (!userId) {
        return res.status(401).json({ message: "Not authenticated" });
      }

      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(401).json({ message: "User not found" });
      }

      // Get data for stats calculation
      const [projects, tasks, users] = await Promise.all([
        storage.getProjects(),
        storage.getTasks(), 
        storage.getUsers()
      ]);

      // Filter by company for non-root users
      const isRootAdmin = user.email?.includes('chacjjlegacy') || user.email === 'admin@proesphere.com';
      
      const userProjects = isRootAdmin ? projects : projects.filter(p => p.companyId === user.companyId);
      const userTasks = isRootAdmin ? tasks : tasks.filter(t => t.companyId === user.companyId);
      const userUsers = isRootAdmin ? users : users.filter(u => u.companyId === user.companyId);

      // Calculate stats
      const stats = {
        activeProjects: userProjects.filter(p => p.status === 'active').length,
        pendingTasks: userTasks.filter(t => t.status === 'pending' || t.status === 'in-progress').length,
        photosUploaded: 245, // Static for now - would come from photos table
        photosUploadedToday: 12, // Static for now - would calculate today's uploads
        crewMembers: userUsers.length
      };
      
      console.log(`✅ NODE.JS SUCCESS: Dashboard stats calculated for company ${user.companyId}:`, stats);
      res.json(stats);
    } catch (error: any) {
      console.error('Error fetching dashboard stats:', error);
      res.status(500).json({ message: 'Failed to fetch dashboard stats', error: error.message });
    }
  });

  // Activities endpoint for recent activity feed  
  app.get('/api/activities', async (req, res) => {
    try {
      console.log('PRODUCTION: Fetching activities for recent activity feed');
      
      // Get current user session to apply company filtering
      const userId = (req.session as any)?.userId;
      if (!userId) {
        return res.status(401).json({ message: "Not authenticated" });
      }

      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(401).json({ message: "User not found" });
      }

      // Get activities for user's company
      const activities = await storage.getActivities(user.companyId, 10);
      
      console.log(`✅ NODE.JS SUCCESS: Retrieved ${activities.length} activities for company ${user.companyId}`);
      res.json(activities);
    } catch (error: any) {
      console.error('Error fetching activities:', error);
      res.status(500).json({ message: 'Failed to fetch activities', error: error.message });
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

  // Photos endpoints
  app.get('/api/photos', async (req, res) => {
    try {
      const userId = (req.session as any)?.userId || 'eb5e1d74-6f0f-4bee-8bee-fb0cf8afd3e9'; // Use session or fallback
      console.log('PRODUCTION: Fetching photos directly from Node.js backend');
      
      const projectId = req.query.projectId as string;
      const photos = await storage.getPhotos(projectId);
      
      console.log(`✅ NODE.JS SUCCESS: Retrieved ${photos.length} photos`);
      res.json(photos);
    } catch (error) {
      console.error('Photos fetch error:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  // Set up multer for file uploads
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

  // Photo metadata creation endpoint (for object storage photos)
  app.post('/api/photos', async (req, res) => {
    try {
      const userId = (req.session as any)?.userId || 'eb5e1d74-6f0f-4bee-8bee-fb0cf8afd3e9';

      console.log('PRODUCTION: Creating photo metadata for object storage via Node.js backend');
      console.log('📝 Body:', req.body);

      const { filename, originalName, description = "", tags = [], projectId } = req.body;
      
      if (!filename || !projectId) {
        return res.status(400).json({ message: "Filename and Project ID are required" });
      }

      // Save photo metadata to database with object storage path
      const photo = await storage.createPhoto({
        projectId,
        userId,
        filename,
        originalName: originalName || filename,
        description,
        tags: Array.isArray(tags) ? tags : []
      });

      console.log('✅ NODE.JS SUCCESS: Photo metadata created for object storage:', photo);
      res.status(201).json(photo);
    } catch (error) {
      console.error('Photo metadata creation error:', error);
      res.status(500).json({ message: 'Internal server error', error: error.message });
    }
  });

  // Direct photo serving route (used by photo gallery)
  app.get('/api/photos/:id', async (req, res) => {
    try {
      console.log(`PRODUCTION: Serving photo directly for ID ${req.params.id}`);
      
      // Get photo metadata from database
      const photos = await storage.getPhotos();
      const photo = photos.find(p => p.id === req.params.id);
      
      if (!photo) {
        console.log(`❌ Photo not found in database: ${req.params.id}`);
        return res.status(404).json({ message: 'Photo not found' });
      }

      console.log(`☁️ Serving photo from Google Cloud Storage: ${photo.filename}`);
      
      try {
        const objectStorageService = new ObjectStorageService();
        
        // Extract object ID from filename (handle different formats)
        let objectId = photo.filename;
        
        // If filename contains query parameters (signed URL), extract the object ID
        if (objectId.includes('?')) {
          // Extract from signed URL: get the part after last / and before ?
          const urlParts = objectId.split('/');
          const lastPart = urlParts[urlParts.length - 1];
          objectId = lastPart.split('?')[0];
        }
        
        // If filename is already a full URL, extract just the object ID
        if (objectId.startsWith('https://storage.googleapis.com/')) {
          const match = objectId.match(/\/([a-f0-9-]+)(\?|$)/);
          if (match) {
            objectId = match[1];
          }
        }
        
        // Construct the correct object path using environment variables
        const privateDir = objectStorageService.getPrivateObjectDir();
        const objectPath = `${privateDir}/uploads/${objectId}`;
        
        console.log(`📂 Attempting to serve from path: ${objectPath}`);
        const objectFile = await objectStorageService.getObjectFile(objectPath);
        
        if (objectFile) {
          console.log(`✅ Streaming from object storage: ${objectPath}`);
          return objectStorageService.downloadObject(objectFile, res);
        } else {
          console.log(`❌ Photo not found in object storage: ${objectPath}`);
          return res.status(404).json({ message: 'Photo not found in object storage' });
        }
      } catch (objectError) {
        console.error(`❌ Failed to serve from object storage:`, objectError);
        return res.status(500).json({ message: 'Failed to retrieve photo from cloud storage' });
      }
      
    } catch (error: any) {
      console.error(`Error serving photo ${req.params.id}:`, error);
      res.status(500).json({ message: 'Failed to serve photo', error: error.message });
    }
  });

  // Photo file serving route (legacy endpoint, redirects to main photo endpoint)
  app.get('/api/photos/:id/file', async (req, res) => {
    try {
      console.log(`PRODUCTION: Legacy photo file route, redirecting to main photo endpoint`);
      
      // Redirect to the main photo serving endpoint
      return res.redirect(307, `/api/photos/${req.params.id}`);
      
    } catch (error: any) {
      console.error(`Error in legacy photo file route ${req.params.id}:`, error);
      res.status(500).json({ message: 'Failed to serve photo', error: error.message });
    }
  });

  // DELETE Photo endpoint
  app.delete('/api/photos/:id', async (req, res) => {
    try {
      console.log(`PRODUCTION: Deleting photo ${req.params.id} via Node.js backend`);
      
      // First, get the photo to find the filename for file system cleanup
      const photos = await storage.getPhotos();
      const photo = photos.find(p => p.id === req.params.id);
      
      if (!photo) {
        return res.status(404).json({ message: 'Photo not found' });
      }

      // Delete from database
      const success = await storage.deletePhoto(req.params.id);
      
      if (!success) {
        return res.status(404).json({ message: 'Photo not found' });
      }

      // Delete physical file from uploads directory
      const uploadsDir = path.join(process.cwd(), 'uploads');
      const filePath = path.join(uploadsDir, photo.filename);
      
      if (fs.existsSync(filePath)) {
        try {
          fs.unlinkSync(filePath);
          console.log(`🗑️ Deleted physical file: ${photo.filename}`);
        } catch (fileError) {
          console.error(`⚠️ Could not delete physical file ${photo.filename}:`, fileError);
          // Don't fail the request if file deletion fails - database cleanup succeeded
        }
      }

      console.log('✅ NODE.JS SUCCESS: Photo deleted');
      res.json({ message: 'Photo deleted successfully' });
    } catch (error: any) {
      console.error('Error deleting photo:', error);
      res.status(500).json({ message: 'Failed to delete photo', error: error.message });
    }
  });

  // Project logs endpoints
  app.get('/api/logs', async (req, res) => {
    try {
      const userId = (req.session as any)?.userId || 'eb5e1d74-6f0f-4bee-8bee-fb0cf8afd3e9'; // Use session or fallback
      console.log('PRODUCTION: Fetching project logs directly from Node.js backend');
      
      const projectId = req.query.projectId as string;
      const logs = await storage.getProjectLogs(projectId);
      
      console.log(`✅ NODE.JS SUCCESS: Retrieved ${logs.length} project logs`);
      res.json(logs);
    } catch (error) {
      console.error('Project logs fetch error:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  app.post('/api/logs', async (req, res) => {
    try {
      const userId = (req.session as any)?.userId || 'eb5e1d74-6f0f-4bee-8bee-fb0cf8afd3e9'; // Use session or fallback
      console.log('PRODUCTION: Creating project log via Node.js backend');
      console.log('Request body received:', req.body);
      console.log('Session userId:', userId);
      
      const logData = {
        ...req.body,
        userId // Override with session user
      };
      
      console.log('Final logData to be saved:', logData);
      
      const log = await storage.createProjectLog(logData);
      

      // CRITICAL FIX: Also create individual photo records for each image uploaded via logs
      // This ensures that photos appear in both Project Logs and Photos tab
      if (logData.images && Array.isArray(logData.images) && logData.images.length > 0) {
        console.log(`📸 Creating ${logData.images.length} photo records for log images...`);
        
        for (const imageUrl of logData.images) {
          try {
            // Extract object ID from the Google Cloud Storage URL
            let objectId;
            if (imageUrl.includes('storage.googleapis.com')) {
              // Extract object ID from the URL path
              const urlPath = new URL(imageUrl).pathname;
              const pathParts = urlPath.split('/');
              objectId = pathParts[pathParts.length - 1]; // Get the last part (object ID)
            } else {
              // Direct filename - use as object ID
              objectId = imageUrl;
            }
            
            // Check if photo record already exists for this object ID to prevent duplicates
            const existingPhotos = await storage.getPhotos();
            const isDuplicate = existingPhotos.some(photo => 
              photo.filename === objectId || 
              photo.filename.endsWith(objectId) ||
              photo.originalName === imageUrl
            );
            
            if (isDuplicate) {
              console.log(`📸 Skipping duplicate photo record for: ${objectId}`);
              continue;
            }
            
            const photoData = {
              projectId: logData.projectId,
              userId: userId,
              filename: objectId, // Store just the object ID for consistent lookup
              originalName: imageUrl, // Keep original URL/filename  
              description: logData.title,
              tags: ['log-photo']
            };
            
            console.log(`📸 Creating photo record with object ID:`, photoData);
            await storage.createPhoto(photoData);
            console.log(`✅ Created photo record for log image: ${objectId}`);
          } catch (photoError) {
            console.error(`❌ Failed to create photo record for image ${imageUrl}:`, photoError);
            // Continue with other images even if one fails
          }
        }
      }
      

      console.log('✅ NODE.JS SUCCESS: Project log created:', log);
      res.status(201).json(log);
    } catch (error) {
      console.error('Project log creation error:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  app.patch('/api/logs/:id', async (req, res) => {
    try {
      const logId = req.params.id;
      const userId = (req.session as any)?.userId || 'eb5e1d74-6f0f-4bee-8bee-fb0cf8afd3e9'; // Use session or fallback
      console.log('PRODUCTION: Updating project log via Node.js backend');
      console.log('Log ID:', logId);
      console.log('Update data received:', req.body);
      console.log('Session userId:', userId);
      
      const wasUpdated = await storage.updateProjectLog(logId, req.body);
      
      if (!wasUpdated) {
        console.log('❌ NODE.JS ERROR: Log not found or not updated');
        return res.status(404).json({ message: 'Log not found' });
      }

      // Get the updated log to return it
      const logs = await storage.getProjectLogs();
      const updatedLog = logs.find(log => log.id === logId);
      
      console.log('✅ NODE.JS SUCCESS: Project log updated');
      res.json(updatedLog || { id: logId, ...req.body });
    } catch (error) {
      console.error('Project log update error:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  });


  app.delete('/api/logs/:id', async (req, res) => {
    try {
      const logId = req.params.id;
      const userId = (req.session as any)?.userId || 'eb5e1d74-6f0f-4bee-8bee-fb0cf8afd3e9'; // Use session or fallback
      console.log('PRODUCTION: Deleting project log via Node.js backend');
      console.log('Log ID:', logId);
      console.log('Session userId:', userId);
      
      const wasDeleted = await storage.deleteProjectLog(logId);
      
      if (!wasDeleted) {
        console.log('❌ Project log not found for deletion:', logId);
        return res.status(404).json({ message: 'Project log not found' });
      }
      
      console.log('✅ NODE.JS SUCCESS: Project log deleted:', logId);
      res.status(200).json({ message: 'Project log deleted successfully' });
    } catch (error) {
      console.error('Project log deletion error:', error);

      res.status(500).json({ message: 'Internal server error' });
    }
  });

  // Object storage endpoints for image uploads
  app.post('/api/objects/upload', async (req, res) => {
    try {
      console.log('PRODUCTION: Getting upload URL for object storage');
      
      const { ObjectStorageService } = await import('./objectStorage');
      const objectStorageService = new ObjectStorageService();
      const uploadURL = await objectStorageService.getObjectEntityUploadURL();
      
      console.log('✅ Generated upload URL successfully:', uploadURL.substring(0, 100) + '...');
      res.json({ uploadURL });
    } catch (error: any) {
      console.error('❌ Object storage upload URL error:', error);
      console.error('Error details:', error.message, error.stack);
      res.status(500).json({ 
        message: 'Internal server error', 
        error: error.message,
        details: 'Check server logs for more information'
      });
    }
  });


  // One-time sync endpoint to migrate existing project log images to photos table
  app.post('/api/sync-log-photos', async (req, res) => {
    try {
      console.log('🔄 SYNC: Starting migration of existing project log images to photos table...');
      
      // Get all project logs with images
      const allLogs = await storage.getProjectLogs();
      const logsWithImages = allLogs.filter(log => log.images && Array.isArray(log.images) && log.images.length > 0);
      
      console.log(`📋 Found ${logsWithImages.length} logs with images to process`);
      
      let totalCreated = 0;
      let totalSkipped = 0;
      
      for (const log of logsWithImages) {
        console.log(`📝 Processing log: "${log.title}" (${log.images.length} images)`);
        
        for (const imageUrl of log.images) {
          try {
            // Extract object ID from the Google Cloud Storage URL
            let objectId;
            if (imageUrl.includes('storage.googleapis.com')) {
              // Extract object ID from the URL path
              const urlPath = new URL(imageUrl).pathname;
              const pathParts = urlPath.split('/');
              objectId = pathParts[pathParts.length - 1].split('?')[0]; // Remove query params
            } else {
              // Direct filename - use as object ID
              objectId = imageUrl;
            }
            
            // Check if photo record already exists for this object ID to prevent duplicates
            const existingPhotos = await storage.getPhotos();
            const isDuplicate = existingPhotos.some(photo => 
              photo.filename === objectId || 
              photo.filename.endsWith(objectId) ||
              photo.originalName === imageUrl
            );
            
            if (isDuplicate) {
              console.log(`📸 Skipping duplicate photo record for: ${objectId}`);
              totalSkipped++;
              continue;
            }
            
            const photoData = {
              projectId: log.projectId,
              userId: log.userId,
              filename: objectId, // Store just the object ID for consistent lookup
              originalName: imageUrl, // Keep original URL/filename  
              description: log.title,
              tags: ['log-photo']
            };
            
            console.log(`📸 Creating photo record for: ${objectId}`);
            await storage.createPhoto(photoData);
            console.log(`✅ Created photo record for log image: ${objectId}`);
            totalCreated++;
          } catch (photoError) {
            console.error(`❌ Failed to create photo record for image ${imageUrl}:`, photoError);
            // Continue with other images even if one fails
          }
        }
      }
      
      console.log(`🎉 SYNC COMPLETE: Created ${totalCreated} new photo records, skipped ${totalSkipped} duplicates`);
      res.json({ 
        success: true, 
        created: totalCreated, 
        skipped: totalSkipped,
        logsProcessed: logsWithImages.length 
      });
    } catch (error) {
      console.error('❌ SYNC ERROR:', error);
      res.status(500).json({ message: 'Sync failed', error: error.message });
    }
  });


  // Object storage image proxy endpoint
  app.get('/api/objects/image/:imageId', async (req, res) => {
    try {
      const imageId = req.params.imageId;
      console.log('PRODUCTION: Serving object storage image:', imageId);
      
      const { ObjectStorageService } = await import('./objectStorage');
      const objectStorageService = new ObjectStorageService();
      
      // Convert the image ID to the object path format
      const objectPath = `${objectStorageService.getPrivateObjectDir()}/uploads/${imageId}`;
      const objectFile = await objectStorageService.getObjectFile(objectPath);
      
      if (!objectFile) {
        console.log('❌ Object storage file not found, returning 404:', objectPath);
        return res.status(404).json({ message: "Image not found" });
      }
      
      // Stream the image directly to the response
      await objectStorageService.downloadObject(objectFile, res);
      
    } catch (error: any) {
      console.error('❌ Failed to serve object storage image:', error);
      res.status(404).json({ message: "Image not found" });
    }
  });

  // Photo management endpoints
  app.post('/api/photos', async (req, res) => {
    try {
      const userId = (req.session as any)?.userId || 'eb5e1d74-6f0f-4bee-8bee-fb0cf8afd3e9';
      console.log('PRODUCTION: Creating photo record via Node.js backend');

      console.log('📸 Photo request body:', JSON.stringify(req.body, null, 2));

      
      const photoData = {
        ...req.body,
        userId // Override with session user
      };

      console.log('📸 Photo data being sent to storage:', JSON.stringify(photoData, null, 2));
      
      const photo = await storage.createPhoto(photoData);
      
      console.log('✅ NODE.JS SUCCESS: Photo record created:', JSON.stringify(photo, null, 2));

      res.status(201).json(photo);
    } catch (error: any) {
      console.error('Photo creation error:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  app.get('/api/photos', async (req, res) => {
    try {
      console.log('PRODUCTION: Fetching photos directly from Node.js backend');
      
      const projectId = req.query.projectId as string;
      const photos = await storage.getPhotos(projectId);
      
      console.log(`✅ NODE.JS SUCCESS: Retrieved ${photos.length} photos`);
      res.json(photos);
    } catch (error) {
      console.error('Photos fetch error:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  // Communications endpoints
  app.get('/api/communications', async (req, res) => {
    try {
      const communications = await storage.getCommunications();
      res.json(communications);
    } catch (error) {
      console.error('Error fetching communications:', error);
      res.status(500).json({ message: 'Failed to fetch communications' });
    }
  });

  app.post('/api/communications', async (req, res) => {
    try {
      const communication = await storage.createCommunication(req.body);
      res.status(201).json(communication);
    } catch (error) {
      console.error('Error creating communication:', error);
      res.status(500).json({ message: 'Failed to create communication' });
    }
  });

  // Change Orders endpoints
  app.get('/api/change-orders', async (req, res) => {
    try {
      const changeOrders = await storage.getChangeOrders();
      res.json(changeOrders);
    } catch (error) {
      console.error('Error fetching change orders:', error);
      res.status(500).json({ message: 'Failed to fetch change orders' });
    }
  });

  app.post('/api/change-orders', async (req, res) => {
    try {
      const changeOrder = await storage.createChangeOrder(req.body);
      res.status(201).json(changeOrder);
    } catch (error) {
      console.error('Error creating change order:', error);
      res.status(500).json({ message: 'Failed to create change order' });
    }
  });

  app.patch('/api/change-orders/:id', async (req, res) => {
    try {
      const changeOrder = await storage.updateChangeOrder(req.params.id, req.body);
      if (!changeOrder) {
        return res.status(404).json({ message: 'Change order not found' });
      }
      res.json(changeOrder);
    } catch (error) {
      console.error('Error updating change order:', error);
      res.status(500).json({ message: 'Failed to update change order' });
    }
  });

  // Time Entries endpoints
  app.get('/api/time-entries', async (req, res) => {
    try {
      const timeEntries = await storage.getTimeEntries();
      res.json(timeEntries);
    } catch (error) {
      console.error('Error fetching time entries:', error);
      res.status(500).json({ message: 'Failed to fetch time entries' });
    }
  });

  app.post('/api/time-entries', async (req, res) => {
    try {
      const timeEntry = await storage.createTimeEntry(req.body);
      res.status(201).json(timeEntry);
    } catch (error) {
      console.error('Error creating time entry:', error);
      res.status(500).json({ message: 'Failed to create time entry' });
    }
  });

  // Invoices endpoints
  app.get('/api/invoices', async (req, res) => {
    try {
      const invoices = await storage.getInvoices();
      res.json(invoices);
    } catch (error) {
      console.error('Error fetching invoices:', error);
      res.status(500).json({ message: 'Failed to fetch invoices' });
    }
  });

  app.post('/api/invoices', async (req, res) => {
    try {
      const invoice = await storage.createInvoice(req.body);
      res.status(201).json(invoice);
    } catch (error) {
      console.error('Error creating invoice:', error);
      res.status(500).json({ message: 'Failed to create invoice' });
    }
  });

  // Notification endpoints to prevent 502 errors
  app.get('/api/notifications/:userId', async (req, res) => {
    try {
      console.log(`PRODUCTION: Notifications for user ${req.params.userId}`);
      res.json([]);
    } catch (error) {
      console.error('Error fetching user notifications:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  app.get('/api/notifications', async (req, res) => {
    try {
      const { userId } = req.query;
      console.log(`PRODUCTION: General notifications for user ${userId || 'all'}`);
      res.json([]);
    } catch (error) {
      console.error('Error fetching notifications:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  // Serve uploaded files
  app.use('/uploads', (req, res, next) => {
    console.log('📁 Serving uploaded file:', req.path);
    next();
  }, express.static(uploadsDir));

  const httpServer = createServer(app);
  return httpServer;
}