#!/usr/bin/env python3
"""
Test script for Cloud SQL database connection
Tests the database connection with SSL certificates configured.
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
    print("🔍 Testing Cloud SQL Database Connection")
    print("=" * 60)
    print()
    
    # Display configuration
    print("📋 Configuration:")
    print(f"   DATABASE_URL: {DATABASE_URL[:50]}..." if len(DATABASE_URL) > 50 else f"   DATABASE_URL: {DATABASE_URL}")
    
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
            ssl_info = await conn.fetchval("SHOW ssl")
            print(f"   SSL Status: {ssl_info}")
            
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
        print("1. Verify DATABASE_URL is correct")
        print("2. Check that SSL certificates are in the correct location")
        print("3. Ensure the Cloud SQL instance allows connections from your IP")
        print("4. Verify database credentials are correct")
        print("5. Check firewall rules for Cloud SQL")
        return False
    
    finally:
        await close_db_pool()
        print("   ✅ Connection pool closed")


async def main():
    """Main test function"""
    if not DATABASE_URL:
        print("❌ Error: DATABASE_URL environment variable is not set")
        print()
        print("Please set it using:")
        print("  export DATABASE_URL='postgresql://user:pass@host:port/dbname'")
        sys.exit(1)
    
    success = await test_connection()
    sys.exit(0 if success else 1)


if __name__ == "__main__":
    asyncio.run(main())

