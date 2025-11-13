import express, { type Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { spawn } from "child_process";
import path from "path";
import { setupVite, serveStatic, log } from "./vite";
import { setupSecurityMiddleware, validateInput, csrfProtection } from "./security";
// Removed proxy middleware, using manual fetch forwarding instead

const app = express();

async function setupFrontendOnly(app: express.Express): Promise<Server> {
  console.log("🚀 FRONTEND-ONLY MODE: Serving frontend, Python backend runs independently");
  console.log("✅ Frontend on port 5000, Python FastAPI backend on port 8000");
  console.log("🔧 Direct communication - no proxy layer");
  
  // Start Python backend as a child process with proper startup verification
  console.log("🐍 Starting Python FastAPI backend...");
  
  // Determine Python command and working directory
  // Try python3 first (common on macOS/Linux), fallback to python
  const pythonCmd = process.platform === 'win32' ? 'python' : 'python3';
  const pythonBackendPath = process.env.PYTHON_BACKEND_PATH || 
    (process.env.NODE_ENV === 'production' ? '/home/runner/workspace/python_backend' : 
     path.join(process.cwd(), 'python_backend'));
  
  console.log(`   Using Python: ${pythonCmd}`);
  console.log(`   Backend path: ${pythonBackendPath}`);
  
  // Try python3 first, fallback to python if python3 fails
  let pythonBackend = spawn(pythonCmd, ['main.py'], {
    cwd: pythonBackendPath,
    stdio: 'pipe',
    detached: false,
    env: { ...process.env } // Pass through environment variables
  });
  
  let backendReady = false;
  let fallbackAttempted = false;
  
  // Handle spawn errors (e.g., python3 not found)
  pythonBackend.on('error', (error: NodeJS.ErrnoException) => {
    if (error.code === 'ENOENT' && pythonCmd === 'python3' && !fallbackAttempted) {
      console.log(`   ⚠️  python3 not found, trying python...`);
      fallbackAttempted = true;
      pythonBackend = spawn('python', ['main.py'], {
        cwd: pythonBackendPath,
        stdio: 'pipe',
        detached: false,
        env: { ...process.env }
      });
      
      // Re-attach event handlers for fallback
      setupPythonBackendHandlers(pythonBackend);
    } else {
      console.error(`❌ Failed to start Python backend: ${error.message}`);
      console.error(`   Command: ${pythonCmd} main.py`);
      console.error(`   Path: ${pythonBackendPath}`);
      console.error(`   Error code: ${error.code}`);
    }
  });
  
  // Setup event handlers
  function setupPythonBackendHandlers(backend: ReturnType<typeof spawn>) {
    backend.stdout?.on('data', (data) => {
      const output = data.toString().trim();
      console.log(`[Python Backend] ${output}`);
      
      // Mark backend as ready when we see the startup completion message
      if (output.includes('Application startup complete') || output.includes('Uvicorn running')) {
        backendReady = true;
        console.log("✅ Python backend is ready to accept connections");
      }
    });
    
    backend.stderr?.on('data', (data) => {
      console.error(`[Python Backend Error] ${data.toString().trim()}`);
    });
    
    backend.on('close', (code) => {
      console.log(`[Python Backend] Process exited with code ${code}`);
      backendReady = false;
    });
  }
  
  // Setup initial handlers
  setupPythonBackendHandlers(pythonBackend);
  
  // Add health check endpoint to verify backend status
  app.get('/api/backend-status', (req, res) => {
    res.json({ ready: backendReady, message: backendReady ? 'Backend ready' : 'Backend starting up' });
  });

  // Setup security middleware
  setupSecurityMiddleware(app);
  
  // Add security logging
  const { securityLogging } = await import('./security');
  securityLogging(app);
  
  // Add JSON parsing
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: false, limit: '10mb' }));

  // Import Node.js routes BEFORE the catch-all proxy
  console.log("🔧 Loading Node.js routes...");
  const { registerRoutes } = await import('./routes');
  await registerRoutes(app);
  console.log("✅ Node.js routes loaded");

  // Add manual API forwarding to Python backend to solve browser CORS issues
  console.log("🔄 Setting up API forwarding to Python backend");
  
  app.all('/api/*', async (req, res) => {
    // Exclude /api/objects/ requests - let Node.js handle object storage
    if (req.originalUrl.startsWith('/api/objects/')) {
      return res.status(404).json({ message: 'Route should be handled by Node.js, not forwarded' });
    }
    
    try {
      const backendUrl = `http://127.0.0.1:8000${req.originalUrl}`;
      console.log(`📡 Forwarding ${req.method} ${req.originalUrl} → ${backendUrl}`);
      
      const response = await fetch(backendUrl, {
        method: req.method,
        headers: {
          'Content-Type': 'application/json',
          'Cookie': req.headers.cookie || '',
          'Authorization': req.headers.authorization || '',
        },
        body: req.method !== 'GET' && req.method !== 'HEAD' && req.body ? JSON.stringify(req.body) : undefined,
      });
      
      const data = await response.text();
      res.status(response.status);
      res.set(Object.fromEntries(response.headers.entries()));
      res.send(data);
      
    } catch (error) {
      console.log('API forwarding error:', error.message);
      res.status(503).json({ detail: 'Backend unavailable' });
    }
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
  // Use frontend-only setup
  const server = await setupFrontendOnly(app);

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    // Check if headers have already been sent
    if (res.headersSent) {
      return _next(err);
    }
    
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    res.status(status).json({ message });
    
    // Only log error if not in production or if it's a server error
    if (status >= 500) {
      console.error('Server error:', err);
    }
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
  const isProduction = process.env.NODE_ENV === 'production';
  
  // Production guard: Use 0.0.0.0 in production, 127.0.0.1 in development
  // macOS doesn't support reusePort, so we use standard listen() method
  const host = process.env.HOST || (isProduction ? '0.0.0.0' : '127.0.0.1');
  
  // Production guard: Verify critical environment variables
  if (isProduction) {
    if (!process.env.DATABASE_URL) {
      throw new Error('DATABASE_URL environment variable is required in production');
    }
    if (!process.env.SESSION_SECRET) {
      throw new Error('SESSION_SECRET environment variable is required in production');
    }
  }
  
  server.listen(port, host, () => {
    log(`serving on ${host}:${port} (${isProduction ? 'production' : 'development'})`);
  });
})();
