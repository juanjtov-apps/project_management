import express, { type Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { spawn } from "child_process";
import { setupVite, serveStatic, log } from "./vite";

const app = express();

async function setupPythonBackend(app: express.Express): Promise<Server> {
  // Start Python backend on port 8000 using main.py in root directory
  console.log("Starting Python FastAPI backend...");
  
  const pythonProcess = spawn("python", ["-c", `
import os
import sys
os.chdir('/home/runner/workspace')
sys.path.insert(0, '/home/runner/workspace')
from main import app
import uvicorn
print("Python backend starting on port 8000...")
uvicorn.run(app, host="0.0.0.0", port=8000, log_level="info")
`], {
    cwd: '/home/runner/workspace',
    stdio: ["pipe", "pipe", "pipe"],
    env: { ...process.env, PORT: "8000" }
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
    // Try to restart after 3 seconds
    setTimeout(() => {
      console.log("Attempting to restart Python backend...");
      setupPythonBackend(app);
    }, 3000);
  });

  // Wait for Python server to start
  await new Promise(resolve => setTimeout(resolve, 5000));

  // Add JSON parsing first for auth routes
  app.use(express.json());
  app.use(express.urlencoded({ extended: false }));

  // Register authentication routes first
  try {
    const { registerRoutes } = await import('./routes');
    await registerRoutes(app);
    console.log('Authentication routes registered successfully');
  } catch (error) {
    console.error('Failed to register authentication routes:', error);
  }

  // Use http-proxy-middleware for remaining API routes only
  const { createProxyMiddleware } = await import('http-proxy-middleware');
  
  const proxy = createProxyMiddleware({
    target: 'http://localhost:8000',
    changeOrigin: true,
    ws: false,
    timeout: 30000,
    proxyTimeout: 30000,
    // Don't rewrite the path at all - by default express strips /api when mounting at /api
    // So we need to add it back
    pathRewrite: (path, req) => {
      const fullPath = `/api${path}`;
      console.log(`Path rewrite: ${path} -> ${fullPath}`);
      return fullPath;
    },
    onError: (err, req, res) => {
      console.error('API Proxy error:', err.message);
      if (!res.headersSent) {
        res.status(502).json({ message: 'Backend service unavailable', error: err.message });
      }
    },
    onProxyReq: (proxyReq, req, res) => {
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
    onProxyRes: (proxyRes, req, res) => {
      console.log(`API Proxy Response: ${req.method} ${req.originalUrl} ${proxyRes.statusCode}`);
    }
  });
  
  // Apply proxy to API routes, but skip auth routes and other routes we handle locally
  app.use('/api', (req, res, next) => {
    // Skip proxy for routes that we handle locally in Express
    if (req.path.startsWith('/auth') || req.path === '/login' || req.path === '/logout' || req.path === '/callback') {
      return next();
    }
    
    // Add special handling for PATCH requests to prevent aborts
    if (req.method === 'PATCH') {
      console.log('Handling PATCH request:', req.path, 'with body:', req.body);
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
