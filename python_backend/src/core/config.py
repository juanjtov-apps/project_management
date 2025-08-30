"""
Application configuration settings.
"""
import os
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    """Application settings."""
    
    # Database
    database_url: str = os.getenv("DATABASE_URL", "")
    
    # Server
    port: int = int(os.getenv("PORT", "8000"))
    host: str = "0.0.0.0"
    debug: bool = os.getenv("NODE_ENV") == "development"
    
    # File uploads
    upload_dir: str = "uploads"
    max_file_size: int = 10 * 1024 * 1024  # 10MB
    
    # CORS - specific origins required when using credentials
    cors_origins: list = [
        "http://localhost:5000",
        "http://127.0.0.1:5000", 
        "https://*.replit.dev",
        "https://*.replit.app"
    ]
    
    class Config:
        env_file = ".env"


settings = Settings()