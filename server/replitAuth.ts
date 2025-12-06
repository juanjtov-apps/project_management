import * as client from "openid-client";
import { Strategy, type VerifyFunction } from "openid-client/passport";

import passport from "passport";
import type { Express, RequestHandler } from "express";
import memoize from "memoizee";
import { storage } from "./storage";

if (!process.env.REPLIT_DOMAINS) {
  throw new Error("Environment variable REPLIT_DOMAINS not provided");
}

const getOidcConfig = memoize(
  async () => {
    const issuerUrl = process.env.ISSUER_URL || "https://replit.com/oidc";
    console.log(`Using OIDC issuer: ${issuerUrl} with client ID: ${process.env.REPL_ID}`);
    
    try {
      const config = await client.discovery(
        new URL(issuerUrl),
        process.env.REPL_ID!
      );
      console.log("OIDC discovery successful");
      return config;
    } catch (error: any) {
      console.error("OIDC discovery failed:", error);
      throw new Error(`OIDC configuration failed: ${error?.message || 'Unknown error'}`);
    }
  },
  { maxAge: 3600 * 1000 }
);

// NOTE: Express session management has been removed.
// All session management is now handled by FastAPI backend (Port 8000).
// FastAPI uses 'session_id' cookie for session management.

function updateUserSession(
  user: any,
  tokens: client.TokenEndpointResponse & client.TokenEndpointResponseHelpers
) {
  user.claims = tokens.claims();
  user.access_token = tokens.access_token;
  user.refresh_token = tokens.refresh_token;
  user.expires_at = user.claims?.exp;
}

async function upsertUser(
  claims: any,
) {
  await storage.upsertUser({
    id: claims["sub"],
    email: claims["email"],
    firstName: claims["first_name"],
    lastName: claims["last_name"],
    profileImageUrl: claims["profile_image_url"],
  });
}

export async function setupAuth(app: Express) {
  app.set("trust proxy", 1);
  // NOTE: Express session middleware removed - FastAPI handles all session management
  app.use(passport.initialize());
  // NOTE: passport.session() removed - sessions are managed by FastAPI

  const config = await getOidcConfig();

  const verify: VerifyFunction = async (
    tokens: client.TokenEndpointResponse & client.TokenEndpointResponseHelpers,
    verified: passport.AuthenticateCallback
  ) => {
    const user = {};
    updateUserSession(user, tokens);
    await upsertUser(tokens.claims());
    verified(null, user);
  };

  // Add proesphere.com domain support
  const domains = [
    ...process.env.REPLIT_DOMAINS!.split(","),
    "proesphere.com"
  ];
  
  for (const domain of domains) {
    const cleanDomain = domain.trim();
    const strategyName = `replitauth:${cleanDomain}`;
    
    console.log(`Registering strategy: ${strategyName} for domain: ${cleanDomain}`);
    
    const strategy = new Strategy(
      {
        name: strategyName,
        config,
        scope: "openid email profile offline_access",
        callbackURL: `https://${cleanDomain}/api/callback`,
      },
      verify,
    );
    passport.use(strategy);
  }
  
  // Also register localhost strategy for development
  if (process.env.NODE_ENV === 'development') {
    const localhostStrategy = new Strategy(
      {
        name: `replitauth:localhost`,
        config,
        scope: "openid email profile offline_access",
        callbackURL: `http://localhost:5000/api/callback`,
      },
      verify,
    );
    passport.use(localhostStrategy);
    console.log('Registered localhost strategy for development');
  }
  
  console.log('All registered strategies:', Object.keys((passport as any)._strategies));

  passport.serializeUser((user: Express.User, cb) => cb(null, user));
  passport.deserializeUser((user: Express.User, cb) => cb(null, user));

  app.get("/api/login", (req, res, next) => {
    const hostname = req.hostname;
    const strategyName = `replitauth:${hostname}`;
    
    console.log(`Login attempt for hostname: ${hostname}, strategy: ${strategyName}`);
    
    // Check if strategy exists, otherwise use fallback
    const strategy = (passport as any)._strategies[strategyName];
    if (!strategy) {
      console.error(`Strategy ${strategyName} not found. Available strategies:`, Object.keys((passport as any)._strategies));
      // Try the first available replit strategy
      const availableStrategy = Object.keys((passport as any)._strategies).find(s => s.startsWith('replitauth:'));
      if (availableStrategy) {
        console.log(`Using fallback strategy: ${availableStrategy}`);
        return passport.authenticate(availableStrategy, {
          prompt: "login consent",
          scope: ["openid", "email", "profile", "offline_access"],
        })(req, res, next);
      }
      return res.status(500).json({ error: "Authentication not configured for this domain" });
    }
    
    passport.authenticate(strategyName, {
      prompt: "login consent",
      scope: ["openid", "email", "profile", "offline_access"],
    })(req, res, next);
  });

  app.get("/api/callback", (req, res, next) => {
    const hostname = req.hostname;
    const strategyName = `replitauth:${hostname}`;
    
    console.log(`Callback for hostname: ${hostname}, strategy: ${strategyName}`);
    
    // Check if strategy exists, otherwise use fallback
    const strategy = (passport as any)._strategies[strategyName];
    if (!strategy) {
      console.error(`Strategy ${strategyName} not found. Available strategies:`, Object.keys((passport as any)._strategies));
      const availableStrategy = Object.keys((passport as any)._strategies).find(s => s.startsWith('replitauth:'));
      if (availableStrategy) {
        console.log(`Using fallback strategy: ${availableStrategy}`);
        return passport.authenticate(availableStrategy, {
          successReturnToOrRedirect: "/dashboard",
          failureRedirect: "/login",
        })(req, res, next);
      }
      return res.status(500).json({ error: "Authentication not configured for this domain" });
    }
    
    passport.authenticate(strategyName, {
      successReturnToOrRedirect: "/dashboard",
      failureRedirect: "/login",
    })(req, res, next);
  });

  app.get("/api/logout", (req, res) => {
    req.logout((err) => {
      if (err) {
        console.error("Logout error:", err);
        return res.redirect("/login?error=logout_failed");
      }
      res.redirect("/login");
    });
  });
  
  app.post("/api/auth/logout", (req, res) => {
    req.logout((err) => {
      if (err) {
        console.error("Logout error:", err);
        return res.status(500).json({ success: false, error: "Logout failed" });
      }
      res.json({ success: true });
    });
  });
}

// NOTE: isAuthenticated middleware removed - authentication is handled by FastAPI backend.
// All API requests are proxied to FastAPI which handles session validation.
export const isAuthenticated: RequestHandler = async (req, res, next) => {
  // This middleware is deprecated - FastAPI handles all authentication.
  // For Replit OIDC flows, authentication should be handled through FastAPI endpoints.
  return res.status(401).json({ 
    message: "Authentication must be handled through FastAPI backend. Use /api/v1/auth/login endpoint." 
  });
};