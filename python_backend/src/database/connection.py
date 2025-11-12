"""
Database connection utilities for async operations
"""

import os
import ssl
import asyncpg
from typing import AsyncGenerator, Optional
from pathlib import Path

DATABASE_URL = os.getenv("DATABASE_URL")
if not DATABASE_URL:
    raise ValueError("DATABASE_URL environment variable is required")

# SSL certificate paths for Cloud SQL
DB_SSL_ROOT_CERT = os.getenv("DB_SSL_ROOT_CERT")  # server-ca.pem
DB_SSL_CERT = os.getenv("DB_SSL_CERT")  # client-cert.pem
DB_SSL_KEY = os.getenv("DB_SSL_KEY")  # client-key.pem
DB_SSL_DIR = os.getenv("DB_SSL_DIR")  # Directory containing certificates

# Global connection pool
_pool = None

def _create_ssl_context() -> Optional[ssl.SSLContext]:
    """Create SSL context for Cloud SQL connection"""
    # Check if we're connecting to Cloud SQL (GCP)
    is_cloud_sql = (
        'cloudsql' in DATABASE_URL.lower() or 
        'gcp' in DATABASE_URL.lower() or
        DB_SSL_ROOT_CERT or 
        DB_SSL_CERT or 
        DB_SSL_KEY or
        DB_SSL_DIR
    )
    
    if not is_cloud_sql:
        # For Neon or other providers, use simple SSL
        if 'neon.tech' in DATABASE_URL:
            return 'require'
        return None
    
    # Cloud SQL requires proper SSL certificates
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