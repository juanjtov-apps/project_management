import type { Express } from "express";

/**
 * PURE PROXY MODE: This file handles route registration.
 * ALL business logic, database operations, RBAC checks, and session management
 * are handled by FastAPI (Port 8000).
 *
 * Node.js (Port 5000) responsibilities:
 * 1. Serving React static files
 * 2. Proxying /api/* requests to FastAPI (handled in index.ts)
 */

export async function registerRoutes(app: Express): Promise<void> {
  // Pure proxy mode - all API routes handled in index.ts
}
