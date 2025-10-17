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
      // Use correct field name - database schema uses companyId (camelCase)
      const companyId = currentUser.companyId || currentUser.company_id;
      req.userCompanyId = companyId;
      
      console.log(`📊 RBAC: Company scope enforced for user ${currentUser.email} - Company: ${companyId}`);
      next();
    } catch (error) {
      console.error('Company scoping error:', error);
      res.status(500).json({ message: "Company scoping error" });
    }
  };
};

// Role-based navigation permissions
export const getNavigationPermissions = (userRole: string, isRootAdmin: boolean) => {
  // Base permissions for all users
  const permissions = {
    dashboard: true,
    projects: true,
    tasks: true,
    photos: true,
    schedule: true,
    logs: true,
    projectHealth: true,
    crew: false,
    subs: false,
    rbacAdmin: false,
    clientPortal: false,
    clientPortalPayments: false // New permission for payments tab
  };

  // Client Portal access for managers, project_managers, office_managers and admins
  // They get all tabs EXCEPT payments (which is admin-only)
  if (userRole === 'admin' || userRole === 'manager' || userRole === 'project_manager' || userRole === 'office_manager') {
    permissions.crew = true;
    permissions.subs = true;
    permissions.clientPortal = true;
  }

  // RBAC Admin and Payments access only for admins and root
  if (isRootAdmin || userRole === 'admin') {
    permissions.rbacAdmin = true;
    permissions.crew = true;
    permissions.subs = true;
    permissions.clientPortal = true;
    permissions.clientPortalPayments = true; // Only admins can access payments
  }

  // Contractor/Client limited access
  if (userRole === 'contractor') {
    permissions.tasks = true;
    permissions.photos = true;
    permissions.projects = false; // Only assigned projects
    permissions.schedule = false;
    permissions.logs = false;
    permissions.projectHealth = false;
    permissions.crew = false;
    permissions.subs = false;
    permissions.clientPortal = false;
    permissions.clientPortalPayments = false;
  }

  if (userRole === 'client') {
    permissions.clientPortal = true;
    permissions.tasks = false;
    permissions.photos = true;
    permissions.projects = true;
    permissions.schedule = false;
    permissions.logs = false;
    permissions.projectHealth = false;
    permissions.crew = false;
    permissions.subs = false;
    permissions.clientPortalPayments = false; // Clients can't access payments
  }

  return permissions;
};