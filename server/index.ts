import express, { type Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { spawn } from "child_process";
import { setupVite, serveStatic, log } from "./vite";

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

async function setupPythonBackend(app: express.Express): Promise<Server> {
  // Start Python backend on port 8000
  const pythonProcess = spawn("python", ["python_backend/main.py"], {
    cwd: process.cwd(),
    stdio: "inherit",
    env: { ...process.env, PORT: "8000" }
  });

  pythonProcess.on("error", (error) => {
    console.error("Failed to start Python backend:", error);
    process.exit(1);
  });

  // Wait for Python server to start
  await new Promise(resolve => setTimeout(resolve, 3000));

  // Manual proxy to Python backend with proper body handling
  app.use('/api', express.raw({ type: 'application/json', limit: '10mb' }));
  
  app.use('/api', async (req, res) => {
    try {
      const url = `http://localhost:8000${req.originalUrl}`;
      console.log(`Proxying ${req.method} ${req.originalUrl} -> ${url}`);
      console.log('Body type:', typeof req.body, 'Is Buffer:', Buffer.isBuffer(req.body));
      
      // Remove problematic headers
      const { 'content-length': _, 'host': __, ...cleanHeaders } = req.headers;
      
      const fetchOptions: RequestInit = {
        method: req.method,
        headers: cleanHeaders
      };
      
      // For non-GET requests with body, handle properly
      if (req.method !== 'GET' && req.body) {
        if (Buffer.isBuffer(req.body)) {
          fetchOptions.body = req.body;
          fetchOptions.headers = {
            ...cleanHeaders,
            'Content-Type': 'application/json',
            'Content-Length': req.body.length.toString()
          };
        }
      }
      
      const response = await fetch(url, fetchOptions);
      const data = await response.text();
      
      res.status(response.status);
      res.set(Object.fromEntries(response.headers.entries()));
      res.send(data);
    } catch (error) {
      console.error('Proxy error:', error);
      res.status(500).json({ message: 'Proxy error' });
    }
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
