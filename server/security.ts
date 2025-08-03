import express from "express";

/**
 * Security middleware configuration for Proesphere
 * Implements comprehensive security headers and protection measures
 */
export function setupSecurityMiddleware(app: express.Express) {
  // Security Headers
  app.use((req, res, next) => {
    // Prevent XSS attacks
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("X-Frame-Options", "DENY");
    res.setHeader("X-XSS-Protection", "1; mode=block");
    
    // Content Security Policy
    res.setHeader(
      "Content-Security-Policy",
      "default-src 'self'; " +
      "script-src 'self' 'unsafe-inline' 'unsafe-eval'; " +
      "style-src 'self' 'unsafe-inline'; " +
      "img-src 'self' data: https:; " +
      "font-src 'self' data:; " +
      "connect-src 'self' ws: wss:; " +
      "frame-ancestors 'none';"
    );
    
    // Referrer Policy
    res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
    
    // Permissions Policy
    res.setHeader("Permissions-Policy", "geolocation=(), microphone=(), camera=()");
    
    next();
  });

  // Simple rate limiting implementation
  const requestCounts = new Map<string, { count: number; resetTime: number }>();
  
  const rateLimit = (maxRequests: number, windowMs: number) => {
    return (req: express.Request, res: express.Response, next: express.NextFunction) => {
      const clientIp = req.ip || req.connection.remoteAddress || 'unknown';
      const now = Date.now();
      const entry = requestCounts.get(clientIp);
      
      if (!entry || now > entry.resetTime) {
        requestCounts.set(clientIp, { count: 1, resetTime: now + windowMs });
        return next();
      }
      
      if (entry.count >= maxRequests) {
        return res.status(429).json({
          error: "Too many requests from this IP, please try again later."
        });
      }
      
      entry.count++;
      next();
    };
  };

  // Apply rate limiting to all API routes (100 requests per 15 minutes)
  app.use("/api", rateLimit(100, 15 * 60 * 1000));

  // Stricter rate limiting for authentication endpoints (5 requests per 15 minutes)
  app.use("/auth", rateLimit(5, 15 * 60 * 1000));
  app.use("/api/auth", rateLimit(5, 15 * 60 * 1000));

  // Hide Express server information
  app.disable("x-powered-by");
}

/**
 * Input validation and sanitization middleware
 */
export function validateInput(req: express.Request, res: express.Response, next: express.NextFunction) {
  // Basic input sanitization for common XSS patterns
  const sanitizeValue = (value: any): any => {
    if (typeof value === "string") {
      // Remove basic XSS patterns
      return value
        .replace(/<script[^>]*>.*?<\/script>/gi, "")
        .replace(/<iframe[^>]*>.*?<\/iframe>/gi, "")
        .replace(/<object[^>]*>.*?<\/object>/gi, "")
        .replace(/<embed[^>]*>/gi, "")
        .replace(/javascript:/gi, "")
        .replace(/on\w+\s*=/gi, "");
    }
    if (typeof value === "object" && value !== null) {
      const sanitized: any = Array.isArray(value) ? [] : {};
      for (const key in value) {
        sanitized[key] = sanitizeValue(value[key]);
      }
      return sanitized;
    }
    return value;
  };

  // Sanitize request body
  if (req.body) {
    req.body = sanitizeValue(req.body);
  }

  // Sanitize query parameters
  if (req.query) {
    req.query = sanitizeValue(req.query);
  }

  next();
}

/**
 * CSRF protection for state-changing operations
 */
export function csrfProtection(req: express.Request, res: express.Response, next: express.NextFunction) {
  // Skip CSRF for GET, HEAD, OPTIONS
  if (["GET", "HEAD", "OPTIONS"].includes(req.method)) {
    return next();
  }

  // Skip CSRF for API endpoints using session-based auth
  if (req.path.startsWith("/api/") && req.isAuthenticated?.()) {
    return next();
  }

  // Verify Origin header matches expected domain
  const origin = req.get("Origin") || req.get("Referer");
  const expectedOrigins = [
    "http://localhost:5000",
    "http://localhost:3000", 
    "https://*.replit.app",
    ...(process.env.REPLIT_DOMAINS?.split(",") || [])
  ];

  if (origin) {
    const isValidOrigin = expectedOrigins.some(expected => {
      if (expected.includes("*")) {
        const pattern = expected.replace("*", ".*");
        return new RegExp(`^${pattern}`).test(origin);
      }
      return origin.startsWith(expected);
    });

    if (!isValidOrigin) {
      return res.status(403).json({ error: "Invalid origin" });
    }
  }

  next();
}