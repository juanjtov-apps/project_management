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
    
    # CORS
    cors_origins: list = ["*"]
    
    class Config:
        env_file = ".env"


settings = Settings()