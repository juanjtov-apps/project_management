"""
Pytest configuration for API route tests.
"""
import pytest
from dotenv import load_dotenv

# Load environment variables before any imports that need DATABASE_URL
load_dotenv()

# Configure pytest-asyncio to use auto mode
pytest_plugins = ['pytest_asyncio']


def pytest_configure(config):
    """Register custom markers."""
    config.addinivalue_line(
        "markers", "asyncio: mark test as async"
    )
