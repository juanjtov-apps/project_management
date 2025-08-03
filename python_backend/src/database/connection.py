"""
Database connection utilities for async operations
"""

import os
import asyncpg
from typing import AsyncGenerator

DATABASE_URL = os.getenv("DATABASE_URL")
if not DATABASE_URL:
    raise ValueError("DATABASE_URL environment variable is required")

# Global connection pool
_pool = None

async def get_db_pool() -> asyncpg.Pool:
    """Get the database connection pool"""
    global _pool
    if _pool is None:
        _pool = await asyncpg.create_pool(DATABASE_URL)
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