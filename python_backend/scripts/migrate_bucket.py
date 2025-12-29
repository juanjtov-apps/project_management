#!/usr/bin/env python3
"""
Migration script to copy images from production Replit bucket to development GCP bucket.

This script:
1. Connects to production bucket using replit-object-storage package (must run in Replit)
2. Downloads all images from production
3. Uploads them to development bucket using GCP Service Account credentials

Usage:
    # Run inside Replit with production credentials:
    python migrate_bucket.py --dry-run  # Preview what will be migrated
    python migrate_bucket.py --target-bucket your-dev-bucket  # Run migration

    # Or use environment variables:
    export OBJECT_STORAGE_BUCKET_ID_DEV="your-dev-bucket"
    export GCP_SERVICE_ACCOUNT_KEY_PATH="/path/to/key.json"
    python migrate_bucket.py
"""

import os
import sys
import argparse
import json
from pathlib import Path
from typing import Optional, Generator
from datetime import datetime

# Check if running in Replit (for replit-object-storage)
IN_REPLIT = bool(os.getenv("REPL_ID"))


def get_replit_client():
    """Get Replit Object Storage client. Only works when running in Replit."""
    if not IN_REPLIT:
        raise RuntimeError(
            "Replit Object Storage client requires running inside Replit. "
            "The replit-object-storage package uses the Replit sidecar."
        )

    try:
        from replit.object_storage import Client
        return Client()
    except ImportError:
        raise ImportError(
            "replit-object-storage package not installed. "
            "Run: pip install replit-object-storage"
        )


def get_gcp_client(credentials_path: Optional[str] = None, credentials_json: Optional[str] = None):
    """Get GCP Storage client using service account credentials."""
    try:
        from google.cloud import storage
    except ImportError:
        raise ImportError(
            "google-cloud-storage package not installed. "
            "Run: pip install google-cloud-storage"
        )

    if credentials_json:
        # Parse inline JSON credentials
        creds_dict = json.loads(credentials_json)
        from google.oauth2 import service_account
        credentials = service_account.Credentials.from_service_account_info(creds_dict)
        return storage.Client(credentials=credentials, project=creds_dict.get("project_id"))
    elif credentials_path and Path(credentials_path).exists():
        return storage.Client.from_service_account_json(credentials_path)
    else:
        raise ValueError(
            "GCP credentials not provided. Set GCP_SERVICE_ACCOUNT_KEY_PATH or "
            "GCP_SERVICE_ACCOUNT_KEY_JSON environment variable, or pass --gcp-credentials."
        )


def list_replit_objects(client, prefix: str = ".private/uploads/") -> Generator[str, None, None]:
    """List all objects in Replit bucket with given prefix."""
    print(f"Listing objects with prefix: {prefix}")

    # The replit-object-storage client has a list method
    try:
        objects = client.list(prefix=prefix)
        for obj in objects:
            yield obj.name
    except Exception as e:
        print(f"Error listing objects: {e}")
        # Try alternative method
        try:
            objects = list(client.list())
            for obj in objects:
                if obj.name.startswith(prefix):
                    yield obj.name
        except Exception as e2:
            print(f"Alternative listing also failed: {e2}")
            raise


def download_replit_object(client, object_name: str) -> bytes:
    """Download an object from Replit bucket."""
    return client.download_as_bytes(object_name)


def upload_to_gcp(gcp_client, bucket_name: str, object_name: str, data: bytes, content_type: str = "image/jpeg"):
    """Upload data to GCP bucket."""
    bucket = gcp_client.bucket(bucket_name)
    blob = bucket.blob(object_name)
    blob.upload_from_string(data, content_type=content_type)


def detect_content_type(object_name: str) -> str:
    """Detect content type from object name extension."""
    ext = Path(object_name).suffix.lower()
    content_types = {
        ".jpg": "image/jpeg",
        ".jpeg": "image/jpeg",
        ".png": "image/png",
        ".gif": "image/gif",
        ".webp": "image/webp",
        ".svg": "image/svg+xml",
        ".heic": "image/heic",
    }
    return content_types.get(ext, "application/octet-stream")


def check_object_exists_in_gcp(gcp_client, bucket_name: str, object_name: str) -> bool:
    """Check if an object already exists in the GCP bucket."""
    bucket = gcp_client.bucket(bucket_name)
    blob = bucket.blob(object_name)
    return blob.exists()


def migrate_prod_to_dev(
    source_prefix: str = ".private/uploads/",
    target_bucket: Optional[str] = None,
    gcp_credentials_path: Optional[str] = None,
    gcp_credentials_json: Optional[str] = None,
    dry_run: bool = False,
    skip_existing: bool = True,
):
    """Migrate objects from production Replit bucket to development GCP bucket."""

    print("=" * 60)
    print("Starting Production -> Development Migration")
    print("=" * 60)

    # Get target bucket from environment if not provided
    if not target_bucket:
        target_bucket = os.getenv("OBJECT_STORAGE_BUCKET_ID_DEV")
        if not target_bucket:
            raise ValueError(
                "Target bucket not specified. Set OBJECT_STORAGE_BUCKET_ID_DEV or use --target-bucket."
            )

    # Get GCP credentials
    if not gcp_credentials_path:
        gcp_credentials_path = os.getenv("GCP_SERVICE_ACCOUNT_KEY_PATH")
    if not gcp_credentials_json:
        gcp_credentials_json = os.getenv("GCP_SERVICE_ACCOUNT_KEY_JSON")

    print(f"Target bucket: {target_bucket}")
    print(f"Source prefix: {source_prefix}")
    print(f"Dry run: {dry_run}")
    print(f"Skip existing: {skip_existing}")
    print()

    # Initialize clients
    print("Connecting to Replit Object Storage...")
    replit_client = get_replit_client()

    print("Connecting to GCP Storage...")
    gcp_client = get_gcp_client(gcp_credentials_path, gcp_credentials_json)

    # List and migrate objects
    migrated = 0
    failed = 0
    skipped = 0

    print()
    print("Starting object migration...")
    print("-" * 40)

    for object_name in list_replit_objects(replit_client, source_prefix):
        try:
            print(f"  {object_name}", end=" ")

            if dry_run:
                print("(dry run - skipped)")
                skipped += 1
                continue

            # Check if object already exists in target
            if skip_existing and check_object_exists_in_gcp(gcp_client, target_bucket, object_name):
                print("(already exists - skipped)")
                skipped += 1
                continue

            # Download from Replit
            data = download_replit_object(replit_client, object_name)
            content_type = detect_content_type(object_name)

            # Upload to GCP
            upload_to_gcp(gcp_client, target_bucket, object_name, data, content_type)

            print(f"OK ({len(data)} bytes)")
            migrated += 1

        except Exception as e:
            print(f"ERROR: {e}")
            failed += 1

    print("-" * 40)
    print()
    print("Migration Summary:")
    print(f"   Migrated: {migrated}")
    print(f"   Failed: {failed}")
    print(f"   Skipped: {skipped}")
    print()

    if failed > 0:
        print("Some objects failed to migrate. Check errors above.")
        return 1

    print("Migration completed successfully!")
    return 0


def main():
    parser = argparse.ArgumentParser(
        description="Migrate images between Replit and GCP buckets"
    )

    parser.add_argument(
        "--direction",
        choices=["prod-to-dev", "dev-to-prod"],
        default="prod-to-dev",
        help="Migration direction (default: prod-to-dev)"
    )

    parser.add_argument(
        "--source-prefix",
        default=".private/uploads/",
        help="Prefix for objects to migrate (default: .private/uploads/)"
    )

    parser.add_argument(
        "--target-bucket",
        help="Target bucket name (defaults to OBJECT_STORAGE_BUCKET_ID_DEV)"
    )

    parser.add_argument(
        "--gcp-credentials",
        help="Path to GCP service account JSON key file"
    )

    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="List objects without actually migrating"
    )

    parser.add_argument(
        "--no-skip-existing",
        action="store_true",
        help="Don't skip objects that already exist in target bucket"
    )

    args = parser.parse_args()

    if args.direction == "prod-to-dev":
        return migrate_prod_to_dev(
            source_prefix=args.source_prefix,
            target_bucket=args.target_bucket,
            gcp_credentials_path=args.gcp_credentials,
            dry_run=args.dry_run,
            skip_existing=not args.no_skip_existing,
        )
    else:
        print("dev-to-prod migration not yet implemented")
        print("   (Production uses Replit Object Storage which requires Replit sidecar)")
        return 1


if __name__ == "__main__":
    sys.exit(main())
