import { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import * as schema from "@shared/schema";
import fs from 'fs';
import path from 'path';

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

// Detect database type: Neon (production) or Cloud SQL (development)
const dbUrl = process.env.DATABASE_URL.toLowerCase();
const isNeon = dbUrl.includes('neon.tech');
const isCloudSQL = 
  process.env.DB_SSL_DIR || 
  process.env.DB_SSL_ROOT_CERT || 
  process.env.DB_SSL_CERT || 
  process.env.DB_SSL_KEY ||
  dbUrl.includes('cloudsql') ||
  dbUrl.includes('gcp');

// Configure SSL based on database type
let sslConfig: any = undefined;

if (isNeon) {
  // Neon (Production): Simple SSL with rejectUnauthorized: false
  sslConfig = { rejectUnauthorized: false };
  console.log('🔵 Connecting to Neon database (production)');
} else if (isCloudSQL) {
  // Cloud SQL (Development): Full SSL certificate configuration
  console.log('🟢 Connecting to Cloud SQL database (development)');
  sslConfig = {
    rejectUnauthorized: true,
    // Disable hostname verification (same as Python's check_hostname = False)
    // Cloud SQL certificates use instance-specific hostnames, not localhost
    checkServerIdentity: () => undefined,
  };

  // Option 1: Use certificate directory
  if (process.env.DB_SSL_DIR) {
    const sslDir = process.env.DB_SSL_DIR;
    const serverCaPath = path.join(sslDir, 'server-ca.pem');
    const clientCertPath = path.join(sslDir, 'client-cert.pem');
    const clientKeyPath = path.join(sslDir, 'client-key.pem');

    if (fs.existsSync(serverCaPath)) {
      sslConfig.ca = fs.readFileSync(serverCaPath).toString();
      console.log('✅ Loaded SSL root certificate from directory');
    }

    if (fs.existsSync(clientCertPath) && fs.existsSync(clientKeyPath)) {
      sslConfig.cert = fs.readFileSync(clientCertPath).toString();
      sslConfig.key = fs.readFileSync(clientKeyPath).toString();
      console.log('✅ Loaded SSL client certificate from directory');
    }
  } 
  // Option 2: Use individual certificate paths
  else {
    if (process.env.DB_SSL_ROOT_CERT) {
      const certPath = process.env.DB_SSL_ROOT_CERT;
      if (fs.existsSync(certPath)) {
        sslConfig.ca = fs.readFileSync(certPath).toString();
        console.log('✅ Loaded SSL root certificate');
      }
    }

    if (process.env.DB_SSL_CERT && process.env.DB_SSL_KEY) {
      const certPath = process.env.DB_SSL_CERT;
      const keyPath = process.env.DB_SSL_KEY;
      if (fs.existsSync(certPath) && fs.existsSync(keyPath)) {
        sslConfig.cert = fs.readFileSync(certPath).toString();
        sslConfig.key = fs.readFileSync(keyPath).toString();
        console.log('✅ Loaded SSL client certificate');
      }
    }
  }

  if (!sslConfig.ca) {
    console.warn('⚠️  Warning: No SSL root certificate found for Cloud SQL connection');
  }
} else {
  // Other providers: Check connection string for SSL requirements
  if (dbUrl.includes('sslmode=require')) {
    sslConfig = { rejectUnauthorized: false };
    console.log('🔵 Using SSL from connection string');
  } else {
    console.log('⚪ No SSL configuration (local development)');
  }
}

// Create connection pool
export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: sslConfig,
  max: 20, // Maximum number of clients in the pool
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
});

// Test connection on startup
pool.on('connect', () => {
  console.log('✅ Database connection established');
});

pool.on('error', (err: Error) => {
  console.error('❌ Unexpected database pool error:', err);
});

export const db = drizzle({ client: pool, schema });

/**
 * Get SSL configuration for database connections
 * This can be used by other modules that need to create their own pools
 */
export function getDbSslConfig(): any {
  return sslConfig;
}

/**
 * Create a new database pool with the same SSL configuration as the main pool
 * Useful for modules that need temporary connections
 */
export function createDbPool(): Pool {
  return new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: sslConfig,
    max: 10,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 10000,
  });
}