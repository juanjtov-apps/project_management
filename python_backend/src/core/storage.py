"""
Multi-environment storage utility for GCP bucket operations.

Environment routing:
- Development: Uses GCP SDK directly with service account → dev bucket (photos_bucket_proespheredev)
- Production (Replit): Uses Replit sidecar proxy → prod bucket (replit-objstore-...)
"""
import os
from datetime import datetime, timedelta
from typing import Optional
import httpx

from .config import settings

# Replit sidecar endpoint (only available in Replit environment)
REPLIT_SIDECAR_ENDPOINT = "http://127.0.0.1:1106"

# Cache for GCP client
_gcp_storage_client = None


def is_replit_environment() -> bool:
    """Check if running in Replit environment (has sidecar available)."""
    return bool(os.getenv("REPL_ID") or os.getenv("REPLIT_DEPLOYMENT"))


def use_gcp_direct() -> bool:
    """Determine if we should use GCP SDK directly.

    Returns True for development mode (local machine).
    Returns False for production/Replit (uses sidecar).
    """
    # In development, always use GCP SDK directly
    if settings.is_development and not is_replit_environment():
        return True
    return False


def get_gcp_storage_client():
    """Get or create a GCP Storage client using service account credentials."""
    global _gcp_storage_client

    if _gcp_storage_client is not None:
        return _gcp_storage_client

    try:
        from google.cloud import storage

        key_path = settings.gcp_service_account_key_path
        key_json = settings.gcp_service_account_key_json

        if key_json:
            import json
            credentials_info = json.loads(key_json)
            _gcp_storage_client = storage.Client.from_service_account_info(credentials_info)
            print(f"✅ GCP client initialized from JSON credentials")
        elif key_path and os.path.exists(key_path):
            _gcp_storage_client = storage.Client.from_service_account_json(key_path)
            print(f"✅ GCP client initialized from key file: {key_path}")
        else:
            raise ValueError(
                "GCP credentials not configured for development. "
                "Set GCP_SERVICE_ACCOUNT_KEY_PATH or GCP_SERVICE_ACCOUNT_KEY_JSON."
            )

        return _gcp_storage_client
    except ImportError:
        raise ImportError("google-cloud-storage package not installed. Run: pip install google-cloud-storage")
    except Exception as e:
        print(f"❌ Failed to create GCP storage client: {e}")
        raise


def get_clean_private_dir(bucket_id: str, private_dir: str) -> str:
    """Strip bucket prefix from private_dir and return clean path."""
    clean_dir = private_dir
    if bucket_id and private_dir.startswith(f"/{bucket_id}"):
        clean_dir = private_dir[len(f"/{bucket_id}"):]
    elif bucket_id and private_dir.startswith(bucket_id):
        clean_dir = private_dir[len(bucket_id):]
    return clean_dir.lstrip('/')


async def _generate_signed_url_sidecar(
    bucket_name: str,
    object_name: str,
    method: str = "GET",
    expires_minutes: int = 60
) -> Optional[str]:
    """Generate signed URL using Replit sidecar (production only)."""
    try:
        expires_at = (datetime.utcnow() + timedelta(minutes=expires_minutes)).isoformat() + "Z"
        request_data = {
            "bucket_name": bucket_name,
            "object_name": object_name,
            "method": method,
            "expires_at": expires_at
        }

        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(
                f"{REPLIT_SIDECAR_ENDPOINT}/object-storage/signed-object-url",
                headers={"Content-Type": "application/json"},
                json=request_data
            )

            if response.status_code == 200:
                result = response.json()
                return result.get("signed_url")
            else:
                print(f"❌ Sidecar error: {response.status_code} - {response.text}")
                return None

    except Exception as e:
        print(f"❌ Error calling sidecar: {e}")
        return None


def _generate_signed_url_gcp(
    bucket_name: str,
    object_name: str,
    method: str = "GET",
    expires_minutes: int = 60
) -> Optional[str]:
    """Generate signed URL using GCP SDK directly (development)."""
    try:
        client = get_gcp_storage_client()
        bucket = client.bucket(bucket_name)
        blob = bucket.blob(object_name)

        url = blob.generate_signed_url(
            version="v4",
            expiration=timedelta(minutes=expires_minutes),
            method=method,
        )

        return url

    except Exception as e:
        print(f"❌ Error generating signed URL via GCP SDK: {e}")
        import traceback
        traceback.print_exc()
        return None


async def generate_signed_url(
    bucket_name: str,
    object_name: str,
    method: str = "GET",
    expires_minutes: int = 60
) -> Optional[str]:
    """
    Generate a signed URL for GCS object access.

    Routing:
    - Development (local): GCP SDK → dev bucket
    - Production (Replit): Sidecar → prod bucket
    """
    print(f"🔐 Generating signed URL: bucket={bucket_name}, object={object_name}, method={method}")

    if use_gcp_direct():
        print(f"🔧 [DEV] Using GCP SDK directly → {bucket_name}")
        return _generate_signed_url_gcp(bucket_name, object_name, method, expires_minutes)
    else:
        print(f"📡 [PROD] Using Replit sidecar → {bucket_name}")
        return await _generate_signed_url_sidecar(bucket_name, object_name, method, expires_minutes)


def get_storage_config() -> dict:
    """Get storage configuration based on current environment."""
    try:
        bucket_id = settings.active_bucket_id
        private_dir = settings.active_private_object_dir
    except ValueError as e:
        raise ValueError(str(e))

    clean_private_dir = get_clean_private_dir(bucket_id, private_dir)

    config = {
        "bucket_id": bucket_id,
        "private_dir": private_dir,
        "clean_private_dir": clean_private_dir,
        "is_production": settings.is_production,
        "is_development": settings.is_development,
        "use_gcp_direct": use_gcp_direct(),
    }

    print(f"📦 Storage config: bucket={bucket_id}, env={'dev' if settings.is_development else 'prod'}, gcp_direct={config['use_gcp_direct']}")

    return config


def get_object_path(object_id: str, clean_private_dir: str = ".private") -> str:
    """Construct the full object path in the bucket."""
    return f"{clean_private_dir}/uploads/{object_id}"
