"""
Database connection and session management.
"""
import asyncpg
from typing import Optional
from src.core.config import settings


class DatabaseManager:
    """Database connection manager."""
    
    def __init__(self):
        self.pool: Optional[asyncpg.Pool] = None
    
    async def connect(self):
        """Initialize database connection pool."""
        if not settings.database_url:
            raise ValueError("DATABASE_URL environment variable is required")
        
        self.pool = await asyncpg.create_pool(
            settings.database_url,
            min_size=1,
            max_size=10
        )
        print("Database connection pool created")
    
    async def disconnect(self):
        """Close database connection pool."""
        if self.pool:
            await self.pool.close()
            print("Database connection pool closed")
    
    async def execute_query(self, query: str, *args):
        """Execute a query and return results."""
        if not self.pool:
            raise RuntimeError("Database not connected")
        
        async with self.pool.acquire() as connection:
            return await connection.fetch(query, *args)
    
    async def execute_one(self, query: str, *args):
        """Execute a query and return single result."""
        if not self.pool:
            raise RuntimeError("Database not connected")
        
        async with self.pool.acquire() as connection:
            return await connection.fetchrow(query, *args)
    
    async def execute_command(self, query: str, *args):
        """Execute a command (INSERT, UPDATE, DELETE)."""
        if not self.pool:
            raise RuntimeError("Database not connected")
        
        async with self.pool.acquire() as connection:
            return await connection.execute(query, *args)


# Global database manager instance
db_manager = DatabaseManager()