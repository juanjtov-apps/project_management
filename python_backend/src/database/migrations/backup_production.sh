#!/bin/bash
# Production Database Backup Script
# Run BEFORE applying any migrations to production
#
# Usage: ./backup_production.sh
#
# Prerequisites:
#   - pg_dump installed (comes with PostgreSQL)
#   - DATABASE_URL_PROD environment variable set
#   - DB_BACKUP_DIR environment variable set (backup directory path)
#
# The script will:
#   1. Create a timestamped backup file
#   2. Compress it with gzip
#   3. Verify the backup size

set -e

TIMESTAMP=$(date +%Y%m%d_%H%M%S)
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Load environment variables from .env if not already set
if [ -z "$DATABASE_URL_PROD" ] || [ -z "$DB_BACKUP_DIR" ]; then
    if [ -f "${SCRIPT_DIR}/../../../.env" ]; then
        set -a
        source "${SCRIPT_DIR}/../../../.env"
        set +a
    fi
fi

# Check for DB_BACKUP_DIR
if [ -z "$DB_BACKUP_DIR" ]; then
    echo "ERROR: DB_BACKUP_DIR environment variable not set"
    echo "Set it in your environment or in python_backend/.env"
    exit 1
fi

BACKUP_DIR="$DB_BACKUP_DIR"
BACKUP_FILE="${BACKUP_DIR}/proesphere_prod_${TIMESTAMP}.sql"

# Create backup directory if not exists
mkdir -p "$BACKUP_DIR"

# Check for DATABASE_URL_PROD
if [ -z "$DATABASE_URL_PROD" ]; then
    echo "ERROR: DATABASE_URL_PROD environment variable not set"
    echo "Set it in your environment or in python_backend/.env"
    exit 1
fi

echo "=============================================="
echo "  Proesphere Production Database Backup"
echo "=============================================="
echo ""
echo "Timestamp: $(date)"
echo "Backup file: ${BACKUP_FILE}"
echo ""

# Confirm before proceeding
read -p "Continue with backup? (y/N) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Backup cancelled."
    exit 0
fi

echo ""
echo "Starting backup..."

# Use pg_dump for full backup
# --format=plain: SQL text format (readable, can be edited)
# --no-owner: Don't output ownership commands
# --no-privileges: Don't output privilege commands
# --verbose: Show progress
pg_dump "$DATABASE_URL_PROD" \
    --format=plain \
    --no-owner \
    --no-privileges \
    --verbose \
    > "$BACKUP_FILE"

# Check if backup was created successfully
if [ ! -f "$BACKUP_FILE" ]; then
    echo "ERROR: Backup file was not created"
    exit 1
fi

# Compress the backup
echo ""
echo "Compressing backup..."
gzip "$BACKUP_FILE"

COMPRESSED_FILE="${BACKUP_FILE}.gz"

# Verify and show backup info
echo ""
echo "=============================================="
echo "  Backup Complete!"
echo "=============================================="
echo ""
echo "Backup file: ${COMPRESSED_FILE}"
ls -lh "$COMPRESSED_FILE"
echo ""
echo "To restore from this backup:"
echo "  gunzip -c ${COMPRESSED_FILE} | psql \$DATABASE_URL_PROD"
echo ""
echo "IMPORTANT: Test restore on a non-production database first!"
