import express, { type Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { spawn } from "child_process";
import { setupVite, serveStatic, log } from "./vite";
import { setupSecurityMiddleware, validateInput, csrfProtection } from "./security";

const app = express();

async function setupFrontendOnly(app: express.Express): Promise<Server> {
  console.log("🚀 FRONTEND-ONLY MODE: Serving frontend, Python backend runs independently");
  console.log("✅ Frontend on port 5000, Python FastAPI backend on port 8000");
  console.log("🔧 Direct communication - no proxy layer");
  
  // Start Python backend as a child process with proper startup delay
  console.log("🐍 Starting Python FastAPI backend...");
  setTimeout(() => {
    const pythonBackend = spawn('python', ['main.py'], {
      cwd: '/home/runner/workspace/python_backend',
      stdio: 'pipe',
      detached: false
    });
    
    pythonBackend.stdout?.on('data', (data) => {
      console.log(`[Python Backend] ${data.toString().trim()}`);
    });
    
    pythonBackend.stderr?.on('data', (data) => {
      console.error(`[Python Backend Error] ${data.toString().trim()}`);
    });
    
    pythonBackend.on('close', (code) => {
      console.log(`[Python Backend] Process exited with code ${code}`);
    });
  }, 1000); // 1 second delay to ensure proper startup

  // Setup security middleware
  setupSecurityMiddleware(app);
  
  // Add security logging
  const { securityLogging } = await import('./security');
  securityLogging(app);
  
  // Add JSON parsing
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: false, limit: '10mb' }));

  // No proxy - frontend makes direct requests to Python backend on port 8000
  console.log("📱 Frontend will make direct requests to http://localhost:8000");

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
  // Use frontend-only setup
  const server = await setupFrontendOnly(app);

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
