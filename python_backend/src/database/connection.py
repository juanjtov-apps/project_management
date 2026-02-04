"""
Database connection utilities for async operations
"""

import os
import ssl
import asyncpg
from typing import AsyncGenerator, Optional
from pathlib import Path

# Select database URL based on environment
NODE_ENV = os.getenv("NODE_ENV", "").lower()
DATABASE_URL_DEV = os.getenv("DATABASE_URL_DEV")
DATABASE_URL_PROD = os.getenv("DATABASE_URL_PROD")
DATABASE_URL_FALLBACK = os.getenv("DATABASE_URL")

# Determine which database URL to use
if NODE_ENV == "development":
    DATABASE_URL = DATABASE_URL_DEV or DATABASE_URL_FALLBACK
elif NODE_ENV == "production":
    DATABASE_URL = DATABASE_URL_PROD or DATABASE_URL_FALLBACK
else:
    # Fallback: use DATABASE_URL if no environment-specific variable is set
    DATABASE_URL = DATABASE_URL_FALLBACK

if not DATABASE_URL:
    raise ValueError(
        "DATABASE_URL environment variable is required. "
        "Set DATABASE_URL, DATABASE_URL_DEV, or DATABASE_URL_PROD based on NODE_ENV."
    )

# SSL certificate paths for Cloud SQL
DB_SSL_ROOT_CERT = os.getenv("DB_SSL_ROOT_CERT")  # server-ca.pem
DB_SSL_CERT = os.getenv("DB_SSL_CERT")  # client-cert.pem
DB_SSL_KEY = os.getenv("DB_SSL_KEY")  # client-key.pem
DB_SSL_DIR = os.getenv("DB_SSL_DIR")  # Directory containing certificates

# Global connection pool
_pool = None

def _create_ssl_context() -> Optional[ssl.SSLContext]:
    """Create SSL context based on database type: Neon (dev/prod) or Cloud SQL"""
    db_url_lower = DATABASE_URL.lower()
    
    # Detect database type - Cloud SQL has highest priority (SSL certs present)
    is_cloud_sql = (
        'cloudsql' in db_url_lower or 
        'gcp' in db_url_lower or
        DB_SSL_ROOT_CERT or 
        DB_SSL_CERT or 
        DB_SSL_KEY or
        DB_SSL_DIR
    )
    
    is_neon = 'neon.tech' in db_url_lower
    
    # Determine environment for Neon databases
    is_production = NODE_ENV == "production"
    is_development = NODE_ENV == "development"
    
    # Cloud SQL detection (highest priority)
    if is_cloud_sql:
        # Cloud SQL: Full SSL certificate configuration
        print("=" * 60)
        print("🟢 DATABASE: Cloud SQL")
        print("   SSL Mode: Full certificate authentication")
        print("   Environment: Development")
        print("=" * 60)
        ssl_context = ssl.create_default_context(ssl.Purpose.SERVER_AUTH)
        ssl_context.check_hostname = False
        ssl_context.verify_mode = ssl.CERT_REQUIRED
        
        # Determine certificate paths
        root_cert_path = None
        client_cert_path = None
        client_key_path = None
        
        if DB_SSL_DIR:
            # If directory is provided, look for standard filenames
            ssl_dir = Path(DB_SSL_DIR)
            root_cert_path = ssl_dir / "server-ca.pem"
            client_cert_path = ssl_dir / "client-cert.pem"
            client_key_path = ssl_dir / "client-key.pem"
        else:
            # Use individual paths if provided
            if DB_SSL_ROOT_CERT:
                root_cert_path = Path(DB_SSL_ROOT_CERT)
            if DB_SSL_CERT:
                client_cert_path = Path(DB_SSL_CERT)
            if DB_SSL_KEY:
                client_key_path = Path(DB_SSL_KEY)
        
        # Load server CA certificate (required)
        if root_cert_path and root_cert_path.exists():
            ssl_context.load_verify_locations(str(root_cert_path))
            print(f"✅ Loaded SSL root certificate: {root_cert_path}")
        else:
            print("⚠️  Warning: SSL root certificate not found, connection may fail")
        
        # Load client certificate and key (optional but recommended)
        if client_cert_path and client_key_path:
            if client_cert_path.exists() and client_key_path.exists():
                ssl_context.load_cert_chain(
                    str(client_cert_path),
                    str(client_key_path)
                )
                print(f"✅ Loaded SSL client certificate: {client_cert_path}")
            else:
                print("⚠️  Warning: Client certificate/key not found, using server CA only")
        
        return ssl_context
    
    # Neon database detection
    if is_neon:
        # Neon: Simple SSL with 'require' mode
        env_label = "PRODUCTION" if is_production else "DEVELOPMENT"
        print("=" * 60)
        print(f"🔵 DATABASE: Neon ({env_label})")
        print("   SSL Mode: require")
        print(f"   Environment: {env_label}")
        print("=" * 60)
        return 'require'
    
    
    # Other providers: Check connection string for SSL requirements
    if 'sslmode=require' in db_url_lower:
        print("=" * 60)
        print("🔵 DATABASE: Custom Provider")
        print("   SSL Mode: require (from connection string)")
        print("=" * 60)
        return 'require'
    
    # No SSL required
    print("=" * 60)
    print("⚪ DATABASE: Local Development")
    print("   SSL Mode: None")
    print("   Environment: Local")
    print("=" * 60)
    return None

async def get_db_pool() -> asyncpg.Pool:
    """Get the database connection pool with robust error handling"""
    global _pool
    if _pool is None:
        try:
            # Create SSL context for Cloud SQL
            ssl_context = _create_ssl_context()
            
            _pool = await asyncpg.create_pool(
                DATABASE_URL,
                ssl=ssl_context,
                command_timeout=30,
                max_size=20,  # Limit pool size
                min_size=1,   # Keep at least one connection
                statement_cache_size=0,  # Disable statement caching to prevent InvalidCachedStatementError after schema changes
                server_settings={
                    'jit': 'off'  # Disable JIT for better connection stability
                }
            )
            # Test the connection
            async with _pool.acquire() as conn:
                await conn.fetchval("SELECT 1")
            print("✅ Database connection pool created and tested successfully")
        except Exception as e:
            print(f"❌ Failed to create database pool: {e}")
            _pool = None
            raise
    return _pool

async def close_db_pool():
    """Close the database connection pool"""
    global _pool
    if _pool:
        await _pool.close()
        _pool = None

async def get_db_connection() -> AsyncGenerator[asyncpg.Connection, None]:
    """Get a database connection from the pool"""
    pool = await get_db_pool()
    async with pool.acquire() as connection:
        yield connection


class DatabaseManager:
    """Database manager for executing queries with proper connection handling"""
    
    async def execute_query(self, query: str, *args) -> list:
        """Execute a SELECT query and return all results"""
        try:
            pool = await get_db_pool()
            async with pool.acquire() as connection:
                rows = await connection.fetch(query, *args)
                return rows
        except Exception as e:
            print(f"Database query error: {e}")
            raise
    
    async def execute_one(self, query: str, *args):
        """Execute a query and return one result"""
        try:
            pool = await get_db_pool()
            async with pool.acquire() as connection:
                row = await connection.fetchrow(query, *args)
                return row
        except Exception as e:
            print(f"Database execute_one error: {e}")
            raise
    
    async def execute(self, query: str, *args) -> str:
        """Execute a query without returning results"""
        try:
            pool = await get_db_pool()
            async with pool.acquire() as connection:
                result = await connection.execute(query, *args)
                return result
        except Exception as e:
            print(f"Database execute error: {e}")
            raise

# Global database manager instance
db_manager = DatabaseManager()