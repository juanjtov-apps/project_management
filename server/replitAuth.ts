import * as client from "openid-client";
import { Strategy, type VerifyFunction } from "openid-client/passport";

import passport from "passport";
import session from "express-session";
import type { Express, RequestHandler } from "express";
import memoize from "memoizee";
import connectPg from "connect-pg-simple";
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

export function getSession() {
  const sessionTtl = 7 * 24 * 60 * 60 * 1000; // 1 week
  const pgStore = connectPg(session);
  const sessionStore = new pgStore({
    conString: process.env.DATABASE_URL,
    createTableIfMissing: false,
    ttl: sessionTtl,
    tableName: "sessions",
  });
  return session({
    secret: process.env.SESSION_SECRET!,
    store: sessionStore,
    resave: false,
    saveUninitialized: false,
    rolling: true, // Regenerate session ID on every response to prevent session fixation
    cookie: {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production", // Only secure in production
      sameSite: "strict", // CSRF protection
      maxAge: sessionTtl,
    },
  });
}

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
  app.use(getSession());
  app.use(passport.initialize());
  app.use(passport.session());

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

  for (const domain of process.env
    .REPLIT_DOMAINS!.split(",")) {
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
  
  console.log('All registered strategies:', Object.keys(passport._strategies));

  passport.serializeUser((user: Express.User, cb) => cb(null, user));
  passport.deserializeUser((user: Express.User, cb) => cb(null, user));

  app.get("/api/login", (req, res, next) => {
    const hostname = req.hostname;
    const strategyName = `replitauth:${hostname}`;
    
    console.log(`Login attempt for hostname: ${hostname}, strategy: ${strategyName}`);
    
    // Check if strategy exists, otherwise use fallback
    const strategy = passport._strategies[strategyName];
    if (!strategy) {
      console.error(`Strategy ${strategyName} not found. Available strategies:`, Object.keys(passport._strategies));
      // Try the first available replit strategy
      const availableStrategy = Object.keys(passport._strategies).find(s => s.startsWith('replitauth:'));
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
    const strategy = passport._strategies[strategyName];
    if (!strategy) {
      console.error(`Strategy ${strategyName} not found. Available strategies:`, Object.keys(passport._strategies));
      const availableStrategy = Object.keys(passport._strategies).find(s => s.startsWith('replitauth:'));
      if (availableStrategy) {
        console.log(`Using fallback strategy: ${availableStrategy}`);
        return passport.authenticate(availableStrategy, {
          successReturnToOrRedirect: "/",
          failureRedirect: "/api/login",
        })(req, res, next);
      }
      return res.status(500).json({ error: "Authentication not configured for this domain" });
    }
    
    passport.authenticate(strategyName, {
      successReturnToOrRedirect: "/",
      failureRedirect: "/api/login",
    })(req, res, next);
  });

  app.get("/api/logout", (req, res) => {
    req.logout(() => {
      res.redirect(
        client.buildEndSessionUrl(config, {
          client_id: process.env.REPL_ID!,
          post_logout_redirect_uri: `${req.protocol}://${req.hostname}`,
        }).href
      );
    });
  });
}

export const isAuthenticated: RequestHandler = async (req, res, next) => {
  const user = req.user as any;

  if (!req.isAuthenticated() || !user.expires_at) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  const now = Math.floor(Date.now() / 1000);
  if (now <= user.expires_at) {
    return next();
  }

  const refreshToken = user.refresh_token;
  if (!refreshToken) {
    res.status(401).json({ message: "Unauthorized" });
    return;
  }

  try {
    const config = await getOidcConfig();
    const tokenResponse = await client.refreshTokenGrant(config, refreshToken);
    updateUserSession(user, tokenResponse);
    return next();
  } catch (error) {
    res.status(401).json({ message: "Unauthorized" });
    return;
  }
};