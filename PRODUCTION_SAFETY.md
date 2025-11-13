# Production Safety Guards

This document outlines the production safety guards implemented to prevent deployment issues.

## 🛡️ Production Guards Implemented

### 1. **SESSION_SECRET Validation**

**Location:** `server/routes.ts`, `server/replitAuth.ts`, `server/index.ts`

**Behavior:**
- ✅ **Production**: Throws error if `SESSION_SECRET` is not set (fails fast)
- ⚠️ **Development**: Warns but allows default secret (for local testing)

**Error Message:**
```
SESSION_SECRET environment variable is required in production. 
Set a secure random secret before deploying.
```

### 2. **DATABASE_URL Validation**

**Location:** `server/index.ts`, `python_backend/src/database/connection.py`

**Behavior:**
- ✅ **Production**: Throws error if `DATABASE_URL` is not set
- ✅ **Development**: Throws error if `DATABASE_URL` is not set (required for both)

### 3. **Host Binding**

**Location:** `server/index.ts`

**Behavior:**
- ✅ **Production**: Binds to `0.0.0.0` (all interfaces) - required for cloud deployments
- ✅ **Development**: Binds to `127.0.0.1` (localhost only) - works on macOS
- ✅ Can be overridden with `HOST` environment variable

### 4. **Cookie Security**

**Location:** `server/routes.ts`, `server/replitAuth.ts`

**Behavior:**
- ✅ **Production**: `secure: true` (requires HTTPS)
- ✅ **Development**: `secure: false` (allows HTTP for local testing)

## 📋 Required Environment Variables for Production

| Variable | Required | Purpose | Example |
|----------|----------|---------|---------|
| `DATABASE_URL` | ✅ Yes | Database connection | `postgresql://...` |
| `SESSION_SECRET` | ✅ Yes | Session encryption | Random 32+ char string |
| `NODE_ENV` | ✅ Yes | Environment mode | `production` |
| `PORT` | Optional | Server port | `5000` (default) |
| `HOST` | Optional | Server host | `0.0.0.0` (default in prod) |

## 🔒 Security Checklist Before Deploying

- [ ] `SESSION_SECRET` is set to a secure random value (32+ characters)
- [ ] `DATABASE_URL` is set and points to production database
- [ ] `NODE_ENV=production` is set
- [ ] SSL certificates are configured (if using Cloud SQL)
- [ ] HTTPS is enabled (for secure cookies)
- [ ] All sensitive environment variables are set in production environment
- [ ] No default secrets are being used

## 🧪 Testing Production Mode Locally

To test production mode locally:

```bash
export NODE_ENV=production
export SESSION_SECRET="your-secret-here"
export DATABASE_URL="your-production-db-url"
npm start
```

The application will:
- ✅ Fail fast if required variables are missing
- ✅ Use secure cookie settings
- ✅ Bind to 0.0.0.0 (may need to adjust for local testing)

## ⚠️ What Happens if Guards Fail

### Missing SESSION_SECRET in Production
```
Error: SESSION_SECRET environment variable is required in production.
Set a secure random secret before deploying.
```
**Result:** Application will not start. This prevents insecure sessions.

### Missing DATABASE_URL in Production
```
Error: DATABASE_URL environment variable is required in production
```
**Result:** Application will not start. This prevents connection errors.

## 🔄 Development vs Production Behavior

| Feature | Development | Production |
|---------|-------------|------------|
| SESSION_SECRET | Warns, uses default | **Fails if missing** |
| Cookie secure flag | `false` (HTTP OK) | `true` (HTTPS required) |
| Host binding | `127.0.0.1` | `0.0.0.0` |
| Error messages | Warnings | **Hard errors** |

## 📝 Notes

- All production guards fail fast (throw errors) to prevent insecure deployments
- Development mode is more permissive for easier local testing
- Environment variable validation happens at startup, not at runtime
- The application will not start in production if critical variables are missing

## 🚀 Deployment Checklist

Before pushing to production:

1. ✅ Verify all environment variables are set in production environment
2. ✅ Test production mode locally with `NODE_ENV=production`
3. ✅ Ensure `SESSION_SECRET` is a strong random value
4. ✅ Verify database connection works with production credentials
5. ✅ Check that HTTPS is configured (for secure cookies)
6. ✅ Review server logs after deployment for any warnings

