import express from "express";

/**
 * Security middleware configuration for Proesphere
 * Implements comprehensive security headers and protection measures
 */
export function setupSecurityMiddleware(app: express.Express) {
  // Security Headers
  app.use((req, res, next) => {
    // Generate nonce for CSP (fallback for ESM compatibility)
    res.locals.nonce = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
    
    // Prevent XSS attacks
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("X-Frame-Options", "DENY");
    res.setHeader("X-XSS-Protection", "1; mode=block");
    
    // Additional security headers
    res.setHeader("Strict-Transport-Security", "max-age=31536000; includeSubDomains; preload");
    res.setHeader("X-Download-Options", "noopen");
    res.setHeader("X-Permitted-Cross-Domain-Policies", "none");
    
    // Content Security Policy - Hardened with stricter rules
    const isProduction = process.env.NODE_ENV === 'production';
    const cspPolicy = isProduction ? 
      // Production: Very strict CSP
      "default-src 'self'; " +
      "script-src 'self' 'nonce-" + res.locals.nonce + "'; " +
      "style-src 'self' 'unsafe-inline'; " +
      "img-src 'self' data: https:; " +
      "font-src 'self' data:; " +
      "connect-src 'self' https://storage.googleapis.com; " +
      "object-src 'none'; " +
      "base-uri 'self'; " +
      "form-action 'self'; " +
      "frame-ancestors 'none'; " +
      "upgrade-insecure-requests;"
      :
      // Development: Relaxed for dev tools and Replit environment
      "default-src 'self'; " +
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://replit.com https://*.replit.dev blob: ws: wss:; " +
      "style-src 'self' 'unsafe-inline' https://replit.com https://*.replit.dev; " +
      "img-src 'self' data: https: blob: https://replit.com https://*.replit.dev; " +
      "font-src 'self' data: https://replit.com https://*.replit.dev; " +
      "connect-src 'self' ws: wss: https://replit.com https://*.replit.dev https://storage.googleapis.com; " +
      "worker-src 'self' blob: data:; " +
      "frame-src 'self' https://replit.com https://*.replit.dev; " +
      "object-src 'none'; " +
      "base-uri 'self'; " +
      "frame-ancestors 'none';";
    
    res.setHeader("Content-Security-Policy", cspPolicy);
    
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

  // Progressive rate limiting with safer limits for development testing
  const isProduction = process.env.NODE_ENV === 'production';
  
  // Authentication rate limiting (stricter in production)
  const authLimit = isProduction ? 10 : 50;
  app.use("/auth", rateLimit(authLimit, 15 * 60 * 1000));
  app.use("/api/auth", rateLimit(authLimit, 15 * 60 * 1000));
  
  // API rate limiting (allow reasonable testing in development)
  const apiLimit = isProduction ? 100 : 500;
  app.use("/api", rateLimit(apiLimit, 15 * 60 * 1000));

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
      // Enhanced XSS pattern removal
      return value
        .replace(/<script[^>]*>.*?<\/script>/gi, "")
        .replace(/<iframe[^>]*>.*?<\/iframe>/gi, "")
        .replace(/<object[^>]*>.*?<\/object>/gi, "")
        .replace(/<embed[^>]*>/gi, "")
        .replace(/<link[^>]*>/gi, "")
        .replace(/<meta[^>]*>/gi, "")
        .replace(/javascript:/gi, "")
        .replace(/vbscript:/gi, "")
        .replace(/data:/gi, "")
        .replace(/on\w+\s*=/gi, "")
        .replace(/style\s*=/gi, "")
        .replace(/expression\s*\(/gi, "")
        .replace(/url\s*\(/gi, "")
        .replace(/import\s*\(/gi, "")
        .trim();
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
    "https://*.replit.dev",
    "https://*.picard.replit.dev",
    "https://proesphere.com",
    "https://*.proesphere.com",
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
      console.warn(`Blocked request from invalid origin: ${origin}`);
      return res.status(403).json({ 
        error: "Invalid origin",
        timestamp: new Date().toISOString()
      });
    }
  }

  next();
}

/**
 * Enhanced security logging middleware
 */
export function securityLogging(app: express.Express) {
  app.use((req, res, next) => {
    // Log suspicious patterns
    const suspiciousPatterns = [
      /\.\./,  // Path traversal
      /\/etc\/passwd/,  // System file access
      /<script/i,  // XSS attempts
      /union.*select/i,  // SQL injection
      /javascript:/i,  // JavaScript injection
      /eval\(/i,  // Code execution
      /exec\(/i,  // Command execution
    ];

    const fullUrl = req.originalUrl || req.url;
    const isSuspicious = suspiciousPatterns.some(pattern => 
      pattern.test(fullUrl) || 
      pattern.test(JSON.stringify(req.body || {})) ||
      pattern.test(JSON.stringify(req.query || {}))
    );

    if (isSuspicious) {
      console.warn(`🚨 Suspicious request detected: ${req.method} ${fullUrl} from ${req.ip}`);
      console.warn(`   Headers: ${JSON.stringify(req.headers)}`);
      console.warn(`   Body: ${JSON.stringify(req.body)}`);
    }

    next();
  });
}