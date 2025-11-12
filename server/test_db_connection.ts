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
  const dbUrl = process.env.DATABASE_URL || '';
  const displayUrl = dbUrl.length > 60 ? dbUrl.substring(0, 57) + '...' : dbUrl;
  console.log(`   DATABASE_URL: ${displayUrl}`);

  // Check SSL configuration
  const dbUrlLower = dbUrl.toLowerCase();
  const isNeon = dbUrlLower.includes('neon.tech');
  const isCloudSQL = 
    process.env.DB_SSL_DIR || 
    process.env.DB_SSL_ROOT_CERT || 
    process.env.DB_SSL_CERT || 
    process.env.DB_SSL_KEY ||
    dbUrlLower.includes('cloudsql') ||
    dbUrlLower.includes('gcp');

  console.log(`   Database Type: ${isNeon ? '🔵 Neon (Production)' : isCloudSQL ? '🟢 Cloud SQL (Development)' : '⚪ Other'}`);

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
    console.log('1. Verify DATABASE_URL is correct');
    console.log('2. Check that SSL certificates are in the correct location');
    console.log('3. Ensure the Cloud SQL instance allows connections from your IP');
    console.log('4. Verify database credentials are correct');
    console.log('5. Check firewall rules for Cloud SQL');
    console.log('6. For Cloud SQL, ensure server-ca.pem is present');
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

