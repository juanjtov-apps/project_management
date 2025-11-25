import type { Express } from "express";
import { createServer, type Server } from "http";
import session from "express-session";
import connectPg from "connect-pg-simple";
import express from "express";

/**
 * PURE PROXY MODE: This file only handles session store configuration.
 * ALL business logic, database operations, and RBAC checks are handled by FastAPI (Port 8000).
 * 
 * Node.js (Port 5000) responsibilities:
 * 1. Session store configuration (for express-session middleware - legacy compatibility)
 * 2. Serving React static files
 * 3. Proxying /api/* requests to FastAPI (handled in index.ts)
 * 
 * NO business logic, NO database queries, NO RBAC checks exist here.
 */

export async function registerRoutes(app: Express): Promise<Server> {
  console.log('🔧 Configuring Node.js proxy server (session store only)...');
  
  // Session configuration for express-session middleware (legacy compatibility)
  // FastAPI handles its own session management
  const sessionTtl = 7 * 24 * 60 * 60 * 1000; // 1 week
  const pgStore = connectPg(session);
  
  // Import and create pool with SSL configuration for session store
  const { createDbPool } = await import('./db');
  const sessionPool = createDbPool();
  
  // Create session store with the SSL-configured pool
  const sessionStore = new pgStore({
    pool: sessionPool,
    createTableIfMissing: false,
    ttl: sessionTtl,
    tableName: "sessions",
  });

  // Production guard: SESSION_SECRET is required in production
  const isProduction = process.env.NODE_ENV === 'production';
  const sessionSecret = process.env.SESSION_SECRET;
  
  if (isProduction && !sessionSecret) {
    throw new Error(
      'SESSION_SECRET environment variable is required in production. ' +
      'Set a secure random secret before deploying.'
    );
  }

  if (!sessionSecret) {
    console.warn('⚠️  WARNING: SESSION_SECRET not set. Using default secret. This is UNSAFE for production!');
  }

  // Configure express-session middleware (legacy compatibility only)
  app.use(session({
    secret: sessionSecret || 'default-secret-change-in-production',
    store: sessionStore,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: isProduction,
      maxAge: sessionTtl,
    },
  }));

  console.log('✅ Session store configured');
  console.log('📡 All API requests will be proxied to FastAPI on port 8000');

  const httpServer = createServer(app);
  return httpServer;
}
