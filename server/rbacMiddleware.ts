import type { Request, Response, NextFunction } from "express";
import { storage } from "./storage";

declare global {
  namespace Express {
    interface Request {
      currentUser?: any;
      isRootAdmin?: boolean;
      isCompanyAdmin?: boolean;
      userCompanyId?: string;
    }
  }
}

export interface AuthorizedRequest extends Request {
  currentUser?: any;
  isRootAdmin?: boolean;
  isCompanyAdmin?: boolean;
}

// RBAC Authorization Middleware
export const authorize = (allowedRoles: string[] = []) => {
  return async (req: AuthorizedRequest, res: Response, next: NextFunction) => {
    try {
      // Check if user is authenticated via session
      const userId = (req.session as any)?.userId;
      if (!userId) {
        return res.status(401).json({ message: "Not authenticated" });
      }

      // Get current user data
      const currentUser = await storage.getUser(userId);
      if (!currentUser) {
        return res.status(401).json({ message: "User not found" });
      }

      // Attach user info to request
      req.currentUser = currentUser;
      
      // Check if root admin (always has access)
      const isRootAdmin = currentUser.id === '0' || 
                          currentUser.email === 'chacjjlegacy@proesphera.com' ||
                          currentUser.email === 'admin@proesphere.com';
      req.isRootAdmin = isRootAdmin;
      
      // Root admin bypasses all role checks
      if (isRootAdmin) {
        console.log(`✅ RBAC: Root admin ${currentUser.email} granted access`);
        return next();
      }

      // Check if company admin
      const isCompanyAdmin = currentUser.role === 'admin';
      req.isCompanyAdmin = isCompanyAdmin;

      // If specific roles are required, check them
      if (allowedRoles.length > 0) {
        if (!allowedRoles.includes(currentUser.role)) {
          console.log(`❌ RBAC: User ${currentUser.email} with role ${currentUser.role} denied access. Required: ${allowedRoles.join(', ')}`);
          return res.status(403).json({ 
            message: `Access denied. Required role: ${allowedRoles.join(' or ')}` 
          });
        }
      }

      console.log(`✅ RBAC: User ${currentUser.email} with role ${currentUser.role} granted access`);
      next();
    } catch (error) {
      console.error('RBAC Authorization error:', error);
      res.status(500).json({ message: "Authorization error" });
    }
  };
};

// Company Scoping Middleware - ensures users can only access their company's data
export const enforceCompanyScope = () => {
  return async (req: AuthorizedRequest, res: Response, next: NextFunction) => {
    try {
      const currentUser = req.currentUser;
      const isRootAdmin = req.isRootAdmin;
      
      if (!currentUser) {
        return res.status(401).json({ message: "User not found in request" });
      }

      // Root admin can access all companies
      if (isRootAdmin) {
        return next();
      }

      // For company-scoped operations, add company filtering
      // This middleware sets up the company scope for downstream operations
      req.userCompanyId = currentUser.company_id;
      
      console.log(`📊 RBAC: Company scope enforced for user ${currentUser.email} - Company: ${currentUser.company_id}`);
      next();
    } catch (error) {
      console.error('Company scoping error:', error);
      res.status(500).json({ message: "Company scoping error" });
    }
  };
};

// Role-based navigation permissions
export const getNavigationPermissions = (userRole: string, isRootAdmin: boolean) => {
  const permissions = {
    dashboard: true, // All authenticated users
    projects: false,
    tasks: false,
    projectHealth: false,
    schedule: false,
    photos: false,
    logs: false,
    crew: false,
    subs: false,
    rbacAdmin: false,
    financial: false // Future module
  };

  // Root admin has access to everything
  if (isRootAdmin) {
    return Object.keys(permissions).reduce((acc, key) => {
      acc[key] = true;
      return acc;
    }, {} as any);
  }

  // Role-based permissions
  switch (userRole) {
    case 'admin':
      // Company admins have access to all company modules + RBAC
      permissions.projects = true;
      permissions.tasks = true;
      permissions.projectHealth = true;
      permissions.schedule = true;
      permissions.photos = true;
      permissions.logs = true;
      permissions.crew = true;
      permissions.subs = true;
      permissions.rbacAdmin = true;
      permissions.financial = true;
      break;
      
    case 'project_manager':
    case 'office_manager':
      // Project/Office managers have company access but NO RBAC or financial
      permissions.projects = true;
      permissions.tasks = true;
      permissions.projectHealth = true;
      permissions.schedule = true;
      permissions.photos = true;
      permissions.logs = true;
      permissions.crew = true;
      permissions.subs = true;
      // NO rbacAdmin or financial access
      break;
      
    case 'subcontractor':
      // Subcontractors only have subcontractor module
      permissions.subs = true;
      break;
      
    case 'client':
      // Clients only have client module access
      // For now, they can see projects (their own projects)
      permissions.projects = true; // Limited to their projects
      break;
      
    default:
      // Unknown roles get minimal access
      break;
  }

  return permissions;
};