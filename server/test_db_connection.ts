#!/usr/bin/env tsx
/**
 * Test script for Node.js database connection (db.ts)
 * Tests connection to Cloud SQL or Neon database
 */

import { pool, db } from './db';
import { sql } from 'drizzle-orm';
import fs from 'fs';
import path from 'path';

async function testConnection() {
  console.log('='.repeat(60));
  console.log('🔍 Testing Node.js Database Connection (db.ts)');
  console.log('='.repeat(60));
  console.log();

  // Display configuration
  console.log('📋 Configuration:');
  
  // Show environment
  const nodeEnv = (process.env.NODE_ENV || '').toLowerCase();
  console.log(`   NODE_ENV: ${nodeEnv || '(not set)'}`);
  
  // Show which database URL variables are set
  const databaseUrlDev = process.env.DATABASE_URL_DEV;
  const databaseUrlProd = process.env.DATABASE_URL_PROD;
  const databaseUrlFallback = process.env.DATABASE_URL;
  
  console.log();
  console.log('   Environment Variables:');
  if (databaseUrlDev) {
    const displayDev = databaseUrlDev.length > 50 ? databaseUrlDev.substring(0, 47) + '...' : databaseUrlDev;
    console.log(`   ✅ DATABASE_URL_DEV: ${displayDev}`);
  } else {
    console.log(`   ⚪ DATABASE_URL_DEV: (not set)`);
  }
  
  if (databaseUrlProd) {
    const displayProd = databaseUrlProd.length > 50 ? databaseUrlProd.substring(0, 47) + '...' : databaseUrlProd;
    console.log(`   ✅ DATABASE_URL_PROD: ${displayProd}`);
  } else {
    console.log(`   ⚪ DATABASE_URL_PROD: (not set)`);
  }
  
  if (databaseUrlFallback) {
    const displayFallback = databaseUrlFallback.length > 50 ? databaseUrlFallback.substring(0, 47) + '...' : databaseUrlFallback;
    console.log(`   ✅ DATABASE_URL: ${displayFallback}`);
  } else {
    console.log(`   ⚪ DATABASE_URL: (not set)`);
  }
  
  // Determine which one is being used (same logic as db.ts)
  let databaseUrl: string;
  if (nodeEnv === 'development') {
    databaseUrl = databaseUrlDev || databaseUrlFallback || '';
  } else if (nodeEnv === 'production') {
    databaseUrl = databaseUrlProd || databaseUrlFallback || '';
  } else {
    databaseUrl = databaseUrlFallback || '';
  }
  
  console.log();
  console.log('   Selected Database URL:');
  if (nodeEnv === 'development') {
    if (databaseUrlDev) {
      console.log(`   🔵 Using: DATABASE_URL_DEV (NODE_ENV=development)`);
    } else if (databaseUrlFallback) {
      console.log(`   🔵 Using: DATABASE_URL (fallback, NODE_ENV=development)`);
    } else {
      console.log(`   ❌ No database URL available for development`);
    }
  } else if (nodeEnv === 'production') {
    if (databaseUrlProd) {
      console.log(`   🔵 Using: DATABASE_URL_PROD (NODE_ENV=production)`);
    } else if (databaseUrlFallback) {
      console.log(`   🔵 Using: DATABASE_URL (fallback, NODE_ENV=production)`);
    } else {
      console.log(`   ❌ No database URL available for production`);
    }
  } else {
    if (databaseUrlFallback) {
      console.log(`   🔵 Using: DATABASE_URL (NODE_ENV not set)`);
    } else {
      console.log(`   ❌ No database URL available`);
    }
  }
  
  // Show the actual URL being used (masked)
  if (databaseUrl) {
    let displayUrl = databaseUrl.length > 50 ? databaseUrl.substring(0, 47) + '...' : databaseUrl;
    // Mask password in URL
    if (displayUrl.includes('@') && displayUrl.includes('://')) {
      const parts = displayUrl.split('@');
      if (parts.length === 2) {
        const protocolUserPass = parts[0];
        if (protocolUserPass.includes(':')) {
          const protocolUser = protocolUserPass.split(':')[0] + ':***';
          displayUrl = protocolUser + '@' + parts[1];
        }
      }
    }
    console.log(`   URL: ${displayUrl}`);
  }

  // Check SSL configuration
  const dbUrlLower = databaseUrl.toLowerCase();
  const isNeon = dbUrlLower.includes('neon.tech');
  const isCloudSQL = 
    process.env.DB_SSL_DIR || 
    process.env.DB_SSL_ROOT_CERT || 
    process.env.DB_SSL_CERT || 
    process.env.DB_SSL_KEY ||
    dbUrlLower.includes('cloudsql') ||
    dbUrlLower.includes('gcp');

  console.log();
  if (isNeon) {
    const envLabel = nodeEnv === 'production' ? 'PRODUCTION' : 'DEVELOPMENT';
    console.log(`   Database Type: 🔵 Neon (${envLabel})`);
  } else if (isCloudSQL) {
    console.log(`   Database Type: 🟢 Cloud SQL`);
  } else {
    console.log(`   Database Type: ⚪ Other`);
  }

  if (isCloudSQL) {
    if (process.env.DB_SSL_DIR) {
      console.log(`   DB_SSL_DIR: ${process.env.DB_SSL_DIR}`);
      const sslDir = process.env.DB_SSL_DIR;
      const certs = ['server-ca.pem', 'client-cert.pem', 'client-key.pem'];
      certs.forEach(cert => {
        const certPath = path.join(sslDir, cert);
        if (fs.existsSync(certPath)) {
          console.log(`   ✅ Found: ${cert}`);
        } else {
          console.log(`   ⚠️  Missing: ${cert}`);
        }
      });
    } else {
      if (process.env.DB_SSL_ROOT_CERT) {
        const exists = fs.existsSync(process.env.DB_SSL_ROOT_CERT);
        console.log(`   DB_SSL_ROOT_CERT: ${process.env.DB_SSL_ROOT_CERT}`);
        console.log(`   ${exists ? '✅' : '❌'} File exists`);
      }
      if (process.env.DB_SSL_CERT) {
        const exists = fs.existsSync(process.env.DB_SSL_CERT);
        console.log(`   DB_SSL_CERT: ${process.env.DB_SSL_CERT}`);
        console.log(`   ${exists ? '✅' : '❌'} File exists`);
      }
      if (process.env.DB_SSL_KEY) {
        const exists = fs.existsSync(process.env.DB_SSL_KEY);
        console.log(`   DB_SSL_KEY: ${process.env.DB_SSL_KEY}`);
        console.log(`   ${exists ? '✅' : '❌'} File exists`);
      }
    }
  }

  console.log();
  console.log('-'.repeat(60));
  console.log();

  // Test connection
  console.log('🔌 Testing Connection...');
  try {
    // Test 1: Basic connection test
    const client = await pool.connect();
    try {
      const result = await client.query('SELECT 1 as test');
      console.log(`   ✅ Basic query test passed (result: ${result.rows[0].test})`);

      // Test 2: Get PostgreSQL version
      const versionResult = await client.query('SELECT version()');
      const version = versionResult.rows[0].version.split(',')[0];
      console.log(`   ✅ PostgreSQL version: ${version}`);

      // Test 3: Get current database name
      const dbNameResult = await client.query('SELECT current_database()');
      console.log(`   ✅ Connected to database: ${dbNameResult.rows[0].current_database}`);

      // Test 4: Get current user
      const userResult = await client.query('SELECT current_user');
      console.log(`   ✅ Connected as user: ${userResult.rows[0].current_user}`);

      // Test 5: Test SSL connection
      console.log();
      console.log('🔒 Testing SSL Connection...');
      try {
        const sslResult = await client.query('SHOW ssl');
        console.log(`   SSL Status: ${sslResult.rows[0].ssl}`);
      } catch (e) {
        // Some databases don't support SHOW ssl
        console.log('   ℹ️  SSL status query not available');
      }

      // Test 6: Test Drizzle ORM connection
      console.log();
      console.log('📊 Testing Drizzle ORM Connection...');
      const drizzleResult = await db.execute(sql`SELECT 1 as test`);
      console.log(`   ✅ Drizzle ORM query successful`);

      // Test 7: List tables
      console.log();
      console.log('📋 Testing Database Schema...');
      const tablesResult = await client.query(`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
        ORDER BY table_name
        LIMIT 20
      `);

      if (tablesResult.rows.length > 0) {
        console.log(`   ✅ Found ${tablesResult.rows.length} tables:`);
        tablesResult.rows.forEach((row, idx) => {
          if (idx < 10) {
            console.log(`      - ${row.table_name}`);
          }
        });
        if (tablesResult.rows.length > 10) {
          console.log(`      ... and ${tablesResult.rows.length - 10} more`);
        }
      } else {
        console.log('   ⚠️  No tables found in public schema');
      }

      // Test 8: Connection pool stats
      console.log();
      console.log('📈 Connection Pool Stats:');
      console.log(`   Total connections: ${pool.totalCount}`);
      console.log(`   Idle connections: ${pool.idleCount}`);
      console.log(`   Waiting clients: ${pool.waitingCount}`);

    } finally {
      client.release();
    }

    console.log();
    console.log('='.repeat(60));
    console.log('✅ All connection tests passed!');
    console.log('='.repeat(60));
    return true;

  } catch (error: any) {
    console.log();
    console.log('='.repeat(60));
    console.log('❌ Connection test failed!');
    console.log('='.repeat(60));
    console.log(`Error: ${error.message}`);
    if (error.stack) {
      console.log();
      console.log('Stack trace:');
      console.log(error.stack);
    }
    console.log();
    console.log('Troubleshooting tips:');
    console.log('1. Verify DATABASE_URL, DATABASE_URL_DEV, or DATABASE_URL_PROD is correct');
    console.log('2. Check that NODE_ENV is set to \'development\' or \'production\'');
    console.log('3. Check that SSL certificates are in the correct location (for Cloud SQL)');
    console.log('4. Ensure the database instance allows connections from your IP');
    console.log('5. Verify database credentials are correct');
    console.log('6. Check firewall rules');
    return false;
  } finally {
    // Close the pool
    await pool.end();
  }
}

// Run the test
testConnection()
  .then((success) => {
    process.exit(success ? 0 : 1);
  })
  .catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });

