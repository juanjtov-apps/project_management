import express, { type Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import fs from "fs";
import path from "path";
import { setupVite, serveStatic, log } from "./vite";
import { setupSecurityMiddleware, validateInput, csrfProtection } from "./security";

const app = express();

async function setupFrontendOnly(app: express.Express): Promise<Server> {
  console.log("Starting Proesphere: Frontend + Python Backend");
  console.log("Frontend on port 5000, Python FastAPI backend on port 8000");

  // Helper function to verify backend is actually accepting HTTP connections
  async function verifyBackendReady(): Promise<boolean> {
    try {
      const response = await fetch('http://127.0.0.1:8000/health', {
        method: 'GET',
        signal: AbortSignal.timeout(2000), // 2 second timeout
      });
      return response.ok;
    } catch (error) {
      return false;
    }
  }
  
  // Check backend status on startup
  const initialCheck = await verifyBackendReady();
  if (initialCheck) {
    console.log("✅ Python backend is already running");
  } else {
    console.log("⚠️  Python backend is not running yet");
    console.log("   The frontend will start, but API requests will fail until backend is started");
    console.log("   Start backend in another terminal: cd python_backend && python3 main.py");
  }
  
  // Periodically check backend health (every 10 seconds)
  let backendReady = initialCheck;
  setInterval(async () => {
    const isReady = await verifyBackendReady();
    if (isReady !== backendReady) {
      backendReady = isReady;
      if (isReady) {
        console.log("✅ Python backend is now available");
      } else {
        console.warn("⚠️  Python backend became unavailable");
      }
    }
  }, 10000);
  
  // Add health check endpoint to verify backend status
  app.get('/api/backend-status', async (req, res) => {
    const isActuallyReady = await verifyBackendReady();
    res.json({ 
      ready: isActuallyReady,
      message: isActuallyReady ? 'Backend ready' : 'Backend unavailable - start it with: cd python_backend && python3 main.py' 
    });
  });

  // Add request logging BEFORE security middleware to see all requests
  app.use((req, res, next) => {
    console.log(`[Request] ${req.method} ${req.path}`, {
      origin: req.headers.origin,
      referer: req.headers.referer,
      userAgent: req.headers['user-agent']?.substring(0, 50),
    });
    next();
  });
  
  // Setup security middleware
  setupSecurityMiddleware(app);
  
  // Add security logging
  const { securityLogging } = await import('./security');
  securityLogging(app);
  
  // Add JSON parsing
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: false, limit: '10mb' }));

  // Register Node.js routes (pure proxy mode - no session management)
  const { registerRoutes } = await import('./routes');
  await registerRoutes(app);
  console.log("✅ Node.js proxy configured (PURE PROXY MODE - session management handled by FastAPI)");
  
  // ALL API routes are handled by Python FastAPI backend
  console.log("✅ All /api/* requests will be forwarded to Python FastAPI backend (/api/v1/*)");

  // Add manual API forwarding to Python backend
  console.log("🔄 Setting up API forwarding to Python backend");
  
  app.all('/api/*', async (req, res, next) => {
    // PURE PROXY MODE: All API routes are forwarded to Python FastAPI backend
    // ALL backend logic, database operations, and RBAC checks are handled by FastAPI (Port 8000)
    // Node.js (Port 5000) only proxies requests - NO business logic here
    
    // Wait for backend to be ready (with timeout)
    if (!backendReady) {
      console.log(`⏳ Backend not ready yet, waiting... (${req.method} ${req.originalUrl})`);
      
      // Wait up to 5 seconds for backend to be ready
      const maxWait = 5000;
      const startTime = Date.now();
      while (!backendReady && (Date.now() - startTime) < maxWait) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      
      if (!backendReady) {
        // Try health check as fallback
        const isHealthy = await verifyBackendReady();
        if (isHealthy) {
          console.log('✅ Backend health check passed, marking as ready');
          backendReady = true;
        } else {
          console.error(`❌ Backend not ready after ${maxWait}ms`);
          return res.status(503).json({ 
            detail: 'Backend unavailable', 
            message: 'Python backend is starting up, please try again in a moment' 
          });
        }
      }
    }
    
    try {
      // Forward all API requests to Python FastAPI backend
      // Rewrite /api/* to /api/v1/* for versioning (unless already /api/v1/*)
      let targetPath = req.originalUrl;
      if (targetPath.startsWith('/api/') && !targetPath.startsWith('/api/v1/')) {
        targetPath = targetPath.replace('/api/', '/api/v1/');
      }
      const backendUrl = `http://127.0.0.1:8000${targetPath}`;
      
      // Log cookie forwarding for auth endpoints (debugging)
      if (targetPath.includes('/auth/')) {
        const hasCookie = !!(req.headers.cookie);
        const cookiePreview = req.headers.cookie ? 
          (req.headers.cookie.includes('session_id') ? 'session_id present' : 'no session_id') : 
          'no cookies';
        console.log(`📡 Forwarding ${req.method} ${req.originalUrl} → ${backendUrl} [Cookies: ${cookiePreview}]`);
      } else {
        console.log(`📡 Forwarding ${req.method} ${req.originalUrl} → ${backendUrl}`);
      }
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout
      
      try {
        const response = await fetch(backendUrl, {
          method: req.method,
          headers: {
            'Content-Type': 'application/json',
            'Cookie': req.headers.cookie || '',
            'Authorization': req.headers.authorization || '',
            // Forward origin/referer headers for proper CSRF validation
            ...(req.headers.origin ? { 'Origin': req.headers.origin } : {}),
            ...(req.headers.referer ? { 'Referer': req.headers.referer } : {}),
            // Forward CSRF token and forwarded host for proper validation in proxy environment
            ...(req.headers['x-csrf-token'] ? { 'X-CSRF-Token': req.headers['x-csrf-token'] as string } : {}),
            'X-Forwarded-Host': req.headers.host || '',
          },
          body: req.method !== 'GET' && req.method !== 'HEAD' && req.body ? JSON.stringify(req.body) : undefined,
          signal: controller.signal,
          redirect: 'manual', // Don't follow redirects - pass them to browser
        });
        
        clearTimeout(timeoutId);
        
        // Set status code
        res.status(response.status);
        
        // Forward all headers from backend response (including Set-Cookie for session management)
        response.headers.forEach((value, key) => {
          // Skip transfer-encoding as it can cause issues
          if (key.toLowerCase() !== 'transfer-encoding') {
            // For Set-Cookie headers, use append to preserve multiple cookies
            if (key.toLowerCase() === 'set-cookie') {
              res.append(key, value);
            } else {
              res.set(key, value);
            }
          }
        });
        
        // Log Set-Cookie forwarding for auth endpoints (debugging)
        if (targetPath.includes('/auth/') && response.headers.get('set-cookie')) {
          console.log(`🍪 Forwarding Set-Cookie header to browser`);
        }
        
        // Handle redirect responses (3xx) - pass them through to the browser
        if (response.status >= 300 && response.status < 400) {
          const location = response.headers.get('location');
          if (location) {
            res.set('Location', location);
          }
          return res.end();
        }
        
        // Check if this is a binary/file response based on content-type
        const contentType = response.headers.get('content-type') || '';
        const isBinary = contentType.startsWith('image/') || 
                         contentType.startsWith('audio/') || 
                         contentType.startsWith('video/') ||
                         contentType.includes('octet-stream') ||
                         contentType.includes('application/pdf');
        
        if (isBinary) {
          // Handle binary data properly
          const buffer = await response.arrayBuffer();
          res.send(Buffer.from(buffer));
        } else {
          // Handle text/JSON responses
          const data = await response.text();
          res.send(data);
        }
        
        // If we get a connection error, mark backend as not ready
        if (response.status === 503 || response.status === 502) {
          console.warn('⚠️  Backend returned error status, marking as not ready');
          backendReady = false;
        }
        
      } catch (fetchError: any) {
        clearTimeout(timeoutId);
        
        if (fetchError.name === 'AbortError') {
          console.error('❌ Request to backend timed out');
          backendReady = false;
          return res.status(504).json({ detail: 'Backend request timeout' });
        }
        
        throw fetchError;
      }
      
    } catch (error: any) {
      console.error('❌ API forwarding error:', error.message);
      console.error('   Error code:', error.code);
      console.error('   Error name:', error.name);
      
      // Mark backend as not ready on connection errors
      if (error.code === 'ECONNREFUSED' || error.code === 'ETIMEDOUT' || error.code === 'ENOTFOUND') {
        backendReady = false;
        return res.status(503).json({ 
          detail: 'Backend unavailable', 
          message: 'Cannot connect to Python backend. Please check if it is running.',
          error: error.code
        });
      }
      
      res.status(503).json({ 
        detail: 'Backend unavailable',
        message: error.message 
      });
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
      
      // Log 403 errors with more detail
      if (res.statusCode === 403) {
        console.error(`[403 Error] ${req.method} ${path}`, {
          origin: req.headers.origin,
          referer: req.headers.referer,
          ip: req.ip,
          userAgent: req.headers['user-agent'],
          response: capturedJsonResponse,
        });
      }
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
  
  server.listen(port, host, () => {
    log(`serving on ${host}:${port} (${isProduction ? 'production' : 'development'})`);
  });
})();
