# Database Configuration Guide

This project supports two database configurations:
- **Neon** (Production) - Serverless PostgreSQL
- **Cloud SQL** (Development) - Google Cloud SQL with SSL certificates

## Automatic Detection

Both the Python backend and Node.js server automatically detect which database you're using based on:

1. **Neon Detection**: If `DATABASE_URL` contains `neon.tech`
2. **Cloud SQL Detection**: If SSL certificates are provided OR `DATABASE_URL` contains `cloudsql` or `gcp`

## Configuration

### For Neon (Production)

```bash
# Only DATABASE_URL is needed
export DATABASE_URL="postgresql://user:password@xxx.neon.tech/dbname?sslmode=require"
```

The system will automatically:
- Use simple SSL mode (`rejectUnauthorized: false` for Node.js, `'require'` for Python)
- Connect without certificate files

### For Cloud SQL (Development)

You need to provide SSL certificates. Two options:

**Option 1: Certificate Directory (Recommended)**
```bash
export DATABASE_URL="postgresql://user:password@PUBLIC_IP:5432/dbname"
export DB_SSL_DIR="/path/to/ssl/certificates"
```

The directory should contain:
- `server-ca.pem` (required)
- `client-cert.pem` (optional but recommended)
- `client-key.pem` (optional but recommended)

**Option 2: Individual Certificate Paths**
```bash
export DATABASE_URL="postgresql://user:password@PUBLIC_IP:5432/dbname"
export DB_SSL_ROOT_CERT="/path/to/server-ca.pem"
export DB_SSL_CERT="/path/to/client-cert.pem"
export DB_SSL_KEY="/path/to/client-key.pem"
```

## Environment Variables Summary

| Variable | Required For | Description |
|----------|-------------|-------------|
| `DATABASE_URL` | Both | PostgreSQL connection string |
| `DB_SSL_DIR` | Cloud SQL | Directory containing SSL certificates |
| `DB_SSL_ROOT_CERT` | Cloud SQL | Path to server CA certificate |
| `DB_SSL_CERT` | Cloud SQL | Path to client certificate |
| `DB_SSL_KEY` | Cloud SQL | Path to client private key |

## Connection Behavior

### Neon (Production)
- 🔵 Simple SSL connection
- No certificate files needed
- Automatic detection from `neon.tech` in URL

### Cloud SQL (Development)
- 🟢 Full SSL certificate authentication
- Requires `server-ca.pem` at minimum
- Client certificates recommended for enhanced security
- Automatic detection from SSL env vars or URL keywords

## Testing Connections

### Python Backend
```bash
cd python_backend
python test_db_connection.py
```

### Node.js Server
The server will log connection status on startup:
- `🔵 Connecting to Neon database (production)` - Neon detected
- `🟢 Connecting to Cloud SQL database (development)` - Cloud SQL detected
- `✅ Database connection established` - Connection successful

## Switching Between Databases

To switch between databases, simply change your `DATABASE_URL` environment variable:

**Switch to Neon (Production):**
```bash
export DATABASE_URL="postgresql://user:pass@xxx.neon.tech/dbname?sslmode=require"
unset DB_SSL_DIR  # Remove Cloud SQL certificates
```

**Switch to Cloud SQL (Development):**
```bash
export DATABASE_URL="postgresql://user:pass@PUBLIC_IP:5432/dbname"
export DB_SSL_DIR="/path/to/ssl/certificates"
```

The system will automatically detect and configure the appropriate SSL settings.

