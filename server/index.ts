import express, { type Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { spawn } from "child_process";
import { setupVite, serveStatic, log } from "./vite";
import { setupSecurityMiddleware, validateInput, csrfProtection } from "./security";

const app = express();

async function setupPythonBackend(app: express.Express): Promise<Server> {
  const isProduction = process.env.NODE_ENV === 'production';
  const pythonPort = parseInt(process.env.PYTHON_PORT || '8000', 10);
  
  if (!isProduction) {
    // Start Python backend on port 8000 using main.py in root directory  
    console.log("Starting Python FastAPI backend...");
    
    // Get current working directory for production compatibility
    const workingDir = process.cwd();
    
    const pythonProcess = spawn("python", ["-c", `
import os
import sys
os.chdir('${workingDir}')
sys.path.insert(0, '${workingDir}')
from main import app
import uvicorn
print("Python backend starting on port ${pythonPort}...")
uvicorn.run(app, host="0.0.0.0", port=${pythonPort}, log_level="info")
`], {
      cwd: workingDir,
      stdio: ["pipe", "pipe", "pipe"],
      env: { ...process.env, PORT: pythonPort.toString() }
    });

    pythonProcess.stdout?.on('data', (data) => {
      console.log(`[python-backend] ${data.toString().trim()}`);
    });

    pythonProcess.stderr?.on('data', (data) => {
      console.error(`[python-backend] ${data.toString().trim()}`);
    });

    pythonProcess.on("error", (error) => {
      console.error("Failed to start Python backend:", error);
      // Don't exit - let Express continue serving frontend
    });

    pythonProcess.on("close", (code) => {
      console.log(`[python-backend] Process exited with code ${code}`);
      // Try to restart after 3 seconds only in development
      if (!isProduction) {
        setTimeout(() => {
          console.log("Attempting to restart Python backend...");
          setupPythonBackend(app);
        }, 3000);
      }
    });

    // Wait for Python server to start
    await new Promise(resolve => setTimeout(resolve, 5000));
  } else {
    console.log(`Production mode: Expecting Python backend at localhost:${pythonPort}`);
  }

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
  
  // Direct RBAC proxy handler to avoid timeout issues
  app.all('/api/rbac/*', async (req, res) => {
    const targetPath = req.path.replace('/api', '');
    const targetUrl = `http://localhost:${pythonPort}${targetPath}`;
    
    console.log(`Direct RBAC proxy: ${req.method} ${req.path} -> ${targetUrl}`);
    
    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json'
      };
      
      // Only copy specific headers that are safe to proxy
      if (req.headers.authorization) {
        headers.authorization = req.headers.authorization;
      }
      if (req.headers['user-agent']) {
        headers['user-agent'] = req.headers['user-agent'];
      }
      
      const response = await fetch(targetUrl, {
        method: req.method,
        headers,
        body: req.method !== 'GET' ? JSON.stringify(req.body) : undefined,
        signal: AbortSignal.timeout(8000) // 8 second timeout
      });
      
      const data = await response.json();
      res.status(response.status).json(data);
    } catch (error: any) {
      console.error('Direct RBAC proxy error:', error);
      res.status(500).json({ message: 'Backend service error', error: error?.message || 'Unknown error' });
    }
  });

  // Apply proxy to other API routes, but skip auth routes and RBAC routes
  app.use('/api', (req, res, next) => {
    // Skip proxy for routes that we handle locally in Express or handle directly
    if (req.path.startsWith('/auth') || req.path === '/login' || req.path === '/logout' || req.path === '/callback' || req.path.startsWith('/rbac')) {
      console.log(`Skipping proxy for auth route: ${req.method} ${req.path}`);
      return next();
    }
    
    return proxy(req, res, next);
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
