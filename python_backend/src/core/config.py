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

    # Object Storage Configuration (environment-specific)
    object_storage_bucket_id_dev: str = os.getenv("OBJECT_STORAGE_BUCKET_ID_DEV", "")
    object_storage_bucket_id_prod: str = os.getenv("OBJECT_STORAGE_BUCKET_ID_PROD", "")
    private_object_dir_dev: str = os.getenv("PRIVATE_OBJECT_DIR_DEV", "")
    private_object_dir_prod: str = os.getenv("PRIVATE_OBJECT_DIR_PROD", "")

    # Legacy fallback variables (for backward compatibility)
    default_object_storage_bucket_id: str = os.getenv("DEFAULT_OBJECT_STORAGE_BUCKET_ID", "")
    private_object_dir: str = os.getenv("PRIVATE_OBJECT_DIR", "")

    # GCP Service Account for dev environment (not needed in Replit production)
    gcp_service_account_key_path: str = os.getenv("GCP_SERVICE_ACCOUNT_KEY_PATH", "")
    gcp_service_account_key_json: str = os.getenv("GCP_SERVICE_ACCOUNT_KEY_JSON", "")

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

    @property
    def node_env(self) -> str:
        """Get current environment (development or production)."""
        return os.getenv("NODE_ENV", "").lower()

    @property
    def is_production(self) -> bool:
        """Check if running in production."""
        return self.node_env == "production"

    @property
    def is_development(self) -> bool:
        """Check if running in development."""
        return self.node_env == "development"

    @property
    def active_bucket_id(self) -> str:
        """Get the active bucket ID based on environment.

        Raises ValueError if bucket is not configured for the current environment.
        """
        if self.is_production:
            bucket_id = self.object_storage_bucket_id_prod or self.default_object_storage_bucket_id
            if not bucket_id:
                raise ValueError(
                    "Object storage bucket not configured for production. "
                    "Set OBJECT_STORAGE_BUCKET_ID_PROD or DEFAULT_OBJECT_STORAGE_BUCKET_ID."
                )
            return bucket_id
        elif self.is_development:
            bucket_id = self.object_storage_bucket_id_dev or self.default_object_storage_bucket_id
            if not bucket_id:
                raise ValueError(
                    "Object storage bucket not configured for development. "
                    "Set OBJECT_STORAGE_BUCKET_ID_DEV or DEFAULT_OBJECT_STORAGE_BUCKET_ID."
                )
            return bucket_id
        else:
            # Fallback for unknown environment
            bucket_id = self.default_object_storage_bucket_id
            if not bucket_id:
                raise ValueError(
                    f"Object storage bucket not configured. NODE_ENV='{self.node_env}' is not recognized. "
                    "Set NODE_ENV to 'development' or 'production' and configure appropriate bucket variables."
                )
            return bucket_id

    @property
    def active_private_object_dir(self) -> str:
        """Get the active private object directory based on environment.

        Raises ValueError if not configured for the current environment.
        """
        if self.is_production:
            dir_path = self.private_object_dir_prod or self.private_object_dir
            if not dir_path:
                raise ValueError(
                    "Private object directory not configured for production. "
                    "Set PRIVATE_OBJECT_DIR_PROD or PRIVATE_OBJECT_DIR."
                )
            return dir_path
        elif self.is_development:
            dir_path = self.private_object_dir_dev or self.private_object_dir
            if not dir_path:
                raise ValueError(
                    "Private object directory not configured for development. "
                    "Set PRIVATE_OBJECT_DIR_DEV or PRIVATE_OBJECT_DIR."
                )
            return dir_path
        else:
            dir_path = self.private_object_dir
            if not dir_path:
                raise ValueError(
                    f"Private object directory not configured. NODE_ENV='{self.node_env}' is not recognized."
                )
            return dir_path


settings = Settings()