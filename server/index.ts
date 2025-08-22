import express, { type Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { spawn } from "child_process";
import { setupVite, serveStatic, log } from "./vite";
import { setupSecurityMiddleware, validateInput, csrfProtection } from "./security";

const app = express();

async function setupPythonBackend(app: express.Express): Promise<Server> {
  const isProduction = process.env.NODE_ENV === 'production';
  const pythonPort = parseInt(process.env.PYTHON_PORT || '8000', 10);
  
  // PRODUCTION READY: Skip Python backend completely - Node.js handles all RBAC
  console.log("🚀 PRODUCTION MODE: Node.js-only backend, skipping Python backend startup");
  console.log("✅ All RBAC operations will be handled directly by Node.js backend");
  console.log("🔧 This eliminates connection issues and provides stable production environment");

  // Setup security middleware first
  setupSecurityMiddleware(app);
  
  // Add security logging
  const { securityLogging } = await import('./security');
  securityLogging(app);
  
  // Add JSON parsing for auth routes
  app.use(express.json({ limit: '10mb' })); // Limit payload size for security
  app.use(express.urlencoded({ extended: false, limit: '10mb' }));
  
  // Add input validation and CSRF protection
  app.use(validateInput);
  app.use(csrfProtection);

  // Register authentication routes first BEFORE any middleware that might interfere
  try {
    // Import and setup Replit Auth (OIDC-based authentication)
    const { setupAuth } = await import('./replitAuth');
    await setupAuth(app);
    console.log('Replit OIDC authentication routes registered successfully');
    
    // Also register basic auth routes as fallback
    const { registerRoutes } = await import('./routes');
    await registerRoutes(app);
    console.log('Basic authentication routes registered successfully');
  } catch (error) {
    console.error('Failed to register authentication routes:', error);
    console.error('Authentication will not work properly:', error);
  }

  // Use http-proxy-middleware for remaining API routes only
  const { createProxyMiddleware } = await import('http-proxy-middleware');
  
  const proxy = createProxyMiddleware({
    target: `http://localhost:${pythonPort}`,
    changeOrigin: true,
    ws: false,
    timeout: 10000,
    proxyTimeout: 10000,
    // Don't rewrite the path at all - by default express strips /api when mounting at /api
    // So we need to add it back
    pathRewrite: (path: string, req: any) => {
      // For RBAC endpoints, don't double-add /api prefix
      if (path.startsWith('/rbac/')) {
        console.log(`Path rewrite: ${path} -> ${path} (RBAC endpoint)`);
        return path;
      }
      // For other endpoints, add /api prefix
      const fullPath = `/api${path}`;
      console.log(`Path rewrite: ${path} -> ${fullPath}`);
      return fullPath;
    },
    on: {
      error: (err: any, req: any, res: any) => {
        console.error('API Proxy error:', err.message);
        if (!res.headersSent) {
          res.status(502).json({ message: 'Backend service unavailable', error: err.message });
        }
      },
      proxyReq: (proxyReq: any, req: any, res: any) => {
        console.log(`Proxying ${req.method} request to: ${proxyReq.path}`);
        
        // For PATCH/PUT/POST with body, properly handle the request body
        if (req.body && Object.keys(req.body).length > 0 && ['PATCH', 'PUT', 'POST'].includes(req.method)) {
          const bodyData = JSON.stringify(req.body);
          console.log(`Forwarding body:`, bodyData);
          
          // Remove any existing content-length header and set new one
          proxyReq.removeHeader('content-length');
          proxyReq.setHeader('Content-Type', 'application/json');
          proxyReq.setHeader('Content-Length', Buffer.byteLength(bodyData, 'utf8'));
          
          // Write the body
          proxyReq.write(bodyData);
        }
      },
      proxyRes: (proxyRes: any, req: any, res: any) => {
        console.log(`API Proxy Response: ${req.method} ${req.originalUrl} ${proxyRes.statusCode}`);
      }
    }
  });
  
  // DISABLED: Direct RBAC proxy handler - now using Node.js backend only
  // All RBAC operations are handled by Node.js backend via routes.ts

  // Apply proxy to other API routes, but skip auth routes and RBAC routes
  app.use('/api', (req, res, next) => {
    // Skip proxy for routes that we handle locally in Express or handle directly
    if (req.path.startsWith('/auth') || req.path === '/login' || req.path === '/logout' || req.path === '/callback' || req.path.startsWith('/rbac') || 
        (req.path.startsWith('/logs') && req.method === 'DELETE') || req.path.startsWith('/sync-log-photos')) {
      console.log(`Skipping proxy for local route: ${req.method} ${req.path}`);
      return next();
    }
    
    return proxy(req, res, next);
  });

  // Add catch-all route handler to prevent 404s during authentication flows
  app.use((req, res, next) => {
    // If it's an API route that wasn't handled, return proper error instead of 404
    if (req.path.startsWith('/api/')) {
      return res.status(404).json({ message: `API endpoint ${req.path} not found` });
    }
    // For frontend routes, serve the index.html (SPA routing)
    next();
  });

  const httpServer = createServer(app);
  return httpServer;
}

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  // Use Python backend routes instead of TypeScript routes
  const server = await setupPythonBackend(app);

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    res.status(status).json({ message });
    throw err;
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  // ALWAYS serve the app on the port specified in the environment variable PORT
  // Other ports are firewalled. Default to 5000 if not specified.
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  const port = parseInt(process.env.PORT || '5000', 10);
  server.listen({
    port,
    host: "0.0.0.0",
    reusePort: true,
  }, () => {
    log(`serving on port ${port}`);
  });
})();
