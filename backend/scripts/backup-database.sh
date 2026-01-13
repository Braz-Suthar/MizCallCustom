#!/bin/bash

# Database Backup Script for MizCall
# This script is called by the admin API to create PostgreSQL backups

set -e

# Configuration from environment or defaults
DB_HOST="${DB_HOST:-localhost}"
DB_PORT="${DB_PORT:-5432}"
DB_NAME="${DB_NAME:-mizcallcustom}"
DB_USER="${DB_USER:-miz}"
BACKUP_DIR="${BACKUP_DIR:-/var/app/backups}"
FILENAME="$1"

if [ -z "$FILENAME" ]; then
    echo "Error: Filename not provided"
    exit 1
fi

# Create backup directory if it doesn't exist
mkdir -p "$BACKUP_DIR"

BACKUP_PATH="$BACKUP_DIR/$FILENAME"

echo "Starting backup..."
echo "Database: $DB_NAME"
echo "Host: $DB_HOST:$DB_PORT"
echo "Output: $BACKUP_PATH"

# Run pg_dump (password from PGPASSWORD env var)
PGPASSWORD="${PGPASSWORD:-${DB_PASSWORD:-mizpass}}" pg_dump \
    -h "$DB_HOST" \
    -p "$DB_PORT" \
    -U "$DB_USER" \
    -d "$DB_NAME" \
    -F c \
    -f "$BACKUP_PATH" \
    --verbose

# Check if backup was successful
if [ $? -eq 0 ]; then
    FILE_SIZE=$(stat -f%z "$BACKUP_PATH" 2>/dev/null || stat -c%s "$BACKUP_PATH" 2>/dev/null || echo "0")
    echo "Backup completed successfully"
    echo "File size: $FILE_SIZE bytes"
    
    # Update database record with success status
    psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" \
        -c "UPDATE database_backups SET status = 'completed', file_size = $FILE_SIZE, completed_at = NOW() WHERE filename = '$FILENAME'"
    
    exit 0
else
    echo "Backup failed"
    
    # Update database record with failed status
    psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" \
        -c "UPDATE database_backups SET status = 'failed', completed_at = NOW(), error_message = 'pg_dump failed' WHERE filename = '$FILENAME'"
    
    exit 1
fi
