"""
Application configuration settings.
"""
import os
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    """Application settings."""
    
    # Database
    database_url: str = os.getenv("DATABASE_URL", "")
    database_url_dev: str = os.getenv("DATABASE_URL_DEV", "")
    database_url_prod: str = os.getenv("DATABASE_URL_PROD", "")
    
    # Cloud SQL SSL Certificates (for GCP Cloud SQL)
    # Option 1: Specify a directory containing all certificates
    db_ssl_dir: str = os.getenv("DB_SSL_DIR", "")
    # Option 2: Specify individual certificate paths
    db_ssl_root_cert: str = os.getenv("DB_SSL_ROOT_CERT", "")  # server-ca.pem
    db_ssl_cert: str = os.getenv("DB_SSL_CERT", "")  # client-cert.pem
    db_ssl_key: str = os.getenv("DB_SSL_KEY", "")  # client-key.pem
    
    # Server
    port: int = int(os.getenv("PORT", "8000"))
    host: str = "0.0.0.0"
    debug: bool = os.getenv("NODE_ENV") == "development"
    
    # File uploads
    upload_dir: str = "uploads"
    max_file_size: int = 10 * 1024 * 1024  # 10MB
    
    # CORS - allow all origins for development (will restrict later)
    cors_origins: list = ["*"]
    
    # Root user configuration
    # Comma-separated list of root user emails - REQUIRED for security
    # Must be set via ROOT_USER_EMAILS environment variable
    root_user_emails: str = os.getenv("ROOT_USER_EMAILS", "")
    
    class Config:
        env_file = ".env"
        # Ignore extra environment variables (like SESSION_SECRET, NODE_ENV which are Node.js-specific)
        # This prevents validation errors when these vars are set but not defined in the model
        extra = "ignore"
    
    @property
    def root_user_emails_list(self) -> list[str]:
        """Get list of root user emails from environment variable.
        
        Raises ValueError if ROOT_USER_EMAILS is not set.
        """
        if not self.root_user_emails:
            raise ValueError(
                "ROOT_USER_EMAILS environment variable is required but not set. "
                "Please set ROOT_USER_EMAILS to a comma-separated list of root user emails."
            )
        # Split by comma and strip whitespace
        emails = [email.strip() for email in self.root_user_emails.split(",") if email.strip()]
        if not emails:
            raise ValueError(
                "ROOT_USER_EMAILS environment variable is set but contains no valid emails. "
                "Please provide at least one root user email."
            )
        return emails


settings = Settings()