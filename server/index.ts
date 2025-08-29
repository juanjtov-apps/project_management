import express, { type Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { spawn } from "child_process";
import { setupVite, serveStatic, log } from "./vite";
import { setupSecurityMiddleware, validateInput, csrfProtection } from "./security";

const app = express();

async function setupPythonBackend(app: express.Express): Promise<Server> {
  const isProduction = process.env.NODE_ENV === 'production';
  const pythonPort = parseInt(process.env.PYTHON_PORT || '8000', 10);
  
  // MIGRATED TO PYTHON: Using Python FastAPI backend for all operations
  console.log("🐍 PYTHON BACKEND MODE: Migrating all operations to Python FastAPI backend");
  console.log("✅ All RBAC and API operations will be handled by Python FastAPI backend");
  console.log("🔧 This provides a unified backend architecture with FastAPI");

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

  // MIGRATION: Skip Node.js authentication routes - Python backend handles all auth
  console.log("🔄 MIGRATION: Skipping Node.js auth routes - Python FastAPI handles authentication");
  console.log("🐍 All authentication will be proxied to Python backend on port", pythonPort);

  // Use http-proxy-middleware for ALL API routes to Python backend
  const { createProxyMiddleware } = await import('http-proxy-middleware');
  
  const proxy = createProxyMiddleware({
    target: `http://localhost:${pythonPort}`,
    changeOrigin: true,
    ws: false,
    timeout: 15000,
    proxyTimeout: 15000,
    // Python backend expects /api prefix for all routes
    pathRewrite: (path: string, req: any) => {
      console.log(`🐍 PYTHON PROXY: ${path} -> /api${path}`);
      return `/api${path}`;
    },
    on: {
      error: (err: any, req: any, res: any) => {
        console.error('🚨 PYTHON BACKEND PROXY ERROR:', err.message);
        console.error('🐍 Target:', `http://localhost:${pythonPort}`);
        console.error('📍 Path:', req.url);
        if (!res.headersSent) {
          res.status(502).json({ message: 'Python backend service unavailable', error: err.message });
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
  
  // MIGRATION: Proxy ALL API routes to Python backend
  // All operations including auth, RBAC, CRUD are handled by Python FastAPI
  
  app.use('/api', (req, res, next) => {
    console.log(`🐍 PROXYING TO PYTHON: ${req.method} ${req.path}`);
    return proxy(req, res, next);
  });

  // Add catch-all route handler to prevent 404s during authentication flows
  app.use((req, res, next) => {
    // If it's an API route that wasn't handled, return proper error instead of 404
    if (req.path.startsWith('/api/')) {
      return res.status(404).json({ message: `API endpoint ${req.path} not found` });
    }
    // For frontend routes, serve the index.html (SPA routing)
    // This ensures all client-side routes are handled properly
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
  if (process.env.NODE_ENV === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
    
    // Additional SPA fallback - ensure any unmatched route serves index.html
    app.get('*', (req, res) => {
      // Skip API routes - they should return 404 JSON
      if (req.path.startsWith('/api/')) {
        return res.status(404).json({ message: `API endpoint ${req.path} not found` });
      }
      
      // For all other routes, serve the index.html for client-side routing
      const path = require('path');
      const fs = require('fs');
      const indexPath = path.resolve(__dirname, 'public', 'index.html');
      
      if (fs.existsSync(indexPath)) {
        res.sendFile(indexPath);
      } else {
        res.status(404).send('Application not built. Run npm run build first.');
      }
    });
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
