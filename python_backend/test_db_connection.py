#!/usr/bin/env python3
"""
Test script for database connection
Tests the database connection with environment-based URL selection.
"""

import asyncio
import os
import sys
from pathlib import Path

# Add the src directory to the path
sys.path.insert(0, str(Path(__file__).parent / "src"))

from database.connection import get_db_pool, close_db_pool, DATABASE_URL, DB_SSL_DIR, DB_SSL_ROOT_CERT, DB_SSL_CERT, DB_SSL_KEY


async def test_connection():
    """Test database connection and perform basic queries"""
    print("=" * 60)
    print("🔍 Testing Database Connection")
    print("=" * 60)
    print()
    
    # Display configuration
    print("📋 Configuration:")
    
    # Show environment
    node_env = os.getenv("NODE_ENV", "").lower()
    print(f"   NODE_ENV: {node_env or '(not set)'}")
    
    # Show which database URL variables are set
    database_url_dev = os.getenv("DATABASE_URL_DEV")
    database_url_prod = os.getenv("DATABASE_URL_PROD")
    database_url_fallback = os.getenv("DATABASE_URL")
    
    print()
    print("   Environment Variables:")
    if database_url_dev:
        display_dev = database_url_dev[:50] + "..." if len(database_url_dev) > 50 else database_url_dev
        print(f"   ✅ DATABASE_URL_DEV: {display_dev}")
    else:
        print(f"   ⚪ DATABASE_URL_DEV: (not set)")
    
    if database_url_prod:
        display_prod = database_url_prod[:50] + "..." if len(database_url_prod) > 50 else database_url_prod
        print(f"   ✅ DATABASE_URL_PROD: {display_prod}")
    else:
        print(f"   ⚪ DATABASE_URL_PROD: (not set)")
    
    if database_url_fallback:
        display_fallback = database_url_fallback[:50] + "..." if len(database_url_fallback) > 50 else database_url_fallback
        print(f"   ✅ DATABASE_URL: {display_fallback}")
    else:
        print(f"   ⚪ DATABASE_URL: (not set)")
    
    # Determine which one is being used
    print()
    print("   Selected Database URL:")
    if node_env == "development":
        if database_url_dev:
            print(f"   🔵 Using: DATABASE_URL_DEV (NODE_ENV=development)")
        elif database_url_fallback:
            print(f"   🔵 Using: DATABASE_URL (fallback, NODE_ENV=development)")
        else:
            print(f"   ❌ No database URL available for development")
    elif node_env == "production":
        if database_url_prod:
            print(f"   🔵 Using: DATABASE_URL_PROD (NODE_ENV=production)")
        elif database_url_fallback:
            print(f"   🔵 Using: DATABASE_URL (fallback, NODE_ENV=production)")
        else:
            print(f"   ❌ No database URL available for production")
    else:
        if database_url_fallback:
            print(f"   🔵 Using: DATABASE_URL (NODE_ENV not set)")
        else:
            print(f"   ❌ No database URL available")
    
    # Show the actual URL being used (masked)
    if DATABASE_URL:
        display_url = DATABASE_URL[:50] + "..." if len(DATABASE_URL) > 50 else DATABASE_URL
        # Mask password in URL
        if "@" in display_url and "://" in display_url:
            parts = display_url.split("@")
            if len(parts) == 2:
                protocol_user_pass = parts[0]
                if ":" in protocol_user_pass:
                    protocol_user = protocol_user_pass.split(":")[0] + ":***"
                    display_url = protocol_user + "@" + parts[1]
        print(f"   URL: {display_url}")
    
    # Detect database type
    db_url_lower = DATABASE_URL.lower() if DATABASE_URL else ""
    is_neon = 'neon.tech' in db_url_lower
    is_cloud_sql = (
        'cloudsql' in db_url_lower or 
        'gcp' in db_url_lower or
        DB_SSL_ROOT_CERT or 
        DB_SSL_CERT or 
        DB_SSL_KEY or
        DB_SSL_DIR
    )
    
    print()
    if is_neon:
        env_label = "PRODUCTION" if node_env == "production" else "DEVELOPMENT"
        print(f"   Database Type: 🔵 Neon ({env_label})")
    elif is_cloud_sql:
        print(f"   Database Type: 🟢 Cloud SQL")
    else:
        print(f"   Database Type: ⚪ Other")
    
    if DB_SSL_DIR:
        print(f"   DB_SSL_DIR: {DB_SSL_DIR}")
        ssl_dir = Path(DB_SSL_DIR)
        if ssl_dir.exists():
            print(f"   ✅ SSL directory exists")
            for cert_file in ["server-ca.pem", "client-cert.pem", "client-key.pem"]:
                cert_path = ssl_dir / cert_file
                if cert_path.exists():
                    print(f"   ✅ Found: {cert_file}")
                else:
                    print(f"   ⚠️  Missing: {cert_file}")
        else:
            print(f"   ❌ SSL directory does not exist")
    elif DB_SSL_ROOT_CERT or DB_SSL_CERT or DB_SSL_KEY:
        if DB_SSL_ROOT_CERT:
            print(f"   DB_SSL_ROOT_CERT: {DB_SSL_ROOT_CERT}")
            print(f"   {'✅' if Path(DB_SSL_ROOT_CERT).exists() else '❌'} File exists")
        if DB_SSL_CERT:
            print(f"   DB_SSL_CERT: {DB_SSL_CERT}")
            print(f"   {'✅' if Path(DB_SSL_CERT).exists() else '❌'} File exists")
        if DB_SSL_KEY:
            print(f"   DB_SSL_KEY: {DB_SSL_KEY}")
            print(f"   {'✅' if Path(DB_SSL_KEY).exists() else '❌'} File exists")
    else:
        if not is_neon:
            print("   ⚠️  No SSL certificates configured")
    
    print()
    print("-" * 60)
    print()
    
    # Test connection
    print("🔌 Testing Connection...")
    try:
        pool = await get_db_pool()
        print("   ✅ Connection pool created successfully")
        
        # Test basic query
        async with pool.acquire() as conn:
            result = await conn.fetchval("SELECT 1")
            print(f"   ✅ Basic query test passed (result: {result})")
            
            # Get PostgreSQL version
            version = await conn.fetchval("SELECT version()")
            print(f"   ✅ PostgreSQL version: {version.split(',')[0]}")
            
            # Get current database name
            db_name = await conn.fetchval("SELECT current_database()")
            print(f"   ✅ Connected to database: {db_name}")
            
            # Get current user
            user = await conn.fetchval("SELECT current_user")
            print(f"   ✅ Connected as user: {user}")
            
            # Test listing tables
            print()
            print("📊 Testing Database Schema...")
            tables = await conn.fetch("""
                SELECT table_name 
                FROM information_schema.tables 
                WHERE table_schema = 'public' 
                ORDER BY table_name
            """)
            
            if tables:
                print(f"   ✅ Found {len(tables)} tables:")
                for table in tables[:10]:  # Show first 10 tables
                    print(f"      - {table['table_name']}")
                if len(tables) > 10:
                    print(f"      ... and {len(tables) - 10} more")
            else:
                print("   ⚠️  No tables found in public schema")
            
            # Test SSL connection info
            print()
            print("🔒 Testing SSL Connection...")
            try:
                ssl_info = await conn.fetchval("SHOW ssl")
                print(f"   SSL Status: {ssl_info}")
            except:
                print("   ℹ️  SSL status query not available")
            
            # Try to get SSL version if available
            try:
                ssl_version = await conn.fetchval("SHOW ssl_version")
                print(f"   SSL Version: {ssl_version}")
            except:
                pass
        
        print()
        print("=" * 60)
        print("✅ All connection tests passed!")
        print("=" * 60)
        return True
        
    except Exception as e:
        print()
        print("=" * 60)
        print("❌ Connection test failed!")
        print("=" * 60)
        print(f"Error: {e}")
        print()
        print("Troubleshooting tips:")
        print("1. Verify DATABASE_URL, DATABASE_URL_DEV, or DATABASE_URL_PROD is correct")
        print("2. Check that NODE_ENV is set to 'development' or 'production'")
        print("3. Check that SSL certificates are in the correct location (for Cloud SQL)")
        print("4. Ensure the database instance allows connections from your IP")
        print("5. Verify database credentials are correct")
        print("6. Check firewall rules")
        return False
    
    finally:
        await close_db_pool()
        print("   ✅ Connection pool closed")


async def main():
    """Main test function"""
    if not DATABASE_URL:
        print("❌ Error: No database URL available")
        print()
        print("Please set one of the following:")
        print("  export DATABASE_URL='postgresql://user:pass@host:port/dbname'")
        print("  export DATABASE_URL_DEV='postgresql://user:pass@host:port/dbname' (for development)")
        print("  export DATABASE_URL_PROD='postgresql://user:pass@host:port/dbname' (for production)")
        print("  export NODE_ENV='development' or 'production'")
        sys.exit(1)
    
    success = await test_connection()
    sys.exit(0 if success else 1)


if __name__ == "__main__":
    asyncio.run(main())
