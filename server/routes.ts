import type { Express } from "express";
import { createServer, type Server } from "http";

/**
 * PURE PROXY MODE: This file handles only HTTP server creation.
 * ALL business logic, database operations, RBAC checks, and session management 
 * are handled by FastAPI (Port 8000).
 * 
 * Node.js (Port 5000) responsibilities:
 * 1. Serving React static files
 * 2. Proxying /api/* requests to FastAPI (handled in index.ts)
 * 
 * Session management is now handled entirely by FastAPI.
 * NO business logic, NO database queries, NO RBAC checks, NO session management exist here.
 */

export async function registerRoutes(app: Express): Promise<Server> {
  console.log('🔧 Configuring Node.js proxy server (pure proxy mode)...');
  console.log('✅ Session management handled by FastAPI backend');
  console.log('📡 All API requests will be proxied to FastAPI on port 8000');

  const httpServer = createServer(app);
  return httpServer;
}
