#!/bin/bash

# ==============================================================================
# MongoDB Automatic Backup & Rotation Script
# Target Host: Hostinger VPS (Ubuntu LTS)
# ==============================================================================

# Fail immediately if any command fails
set -e

# Configuration
DB_NAME="edu_core"
BACKUP_DIR="/var/backups/mongodb"
RETENTION_DAYS=14
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_PATH="$BACKUP_DIR/$DB_NAME-$TIMESTAMP"
ARCHIVE_NAME="$BACKUP_PATH.tar.gz"

echo "========================================="
echo "Starting MongoDB Backup"
echo "Timestamp: $(date)"
echo "========================================="

# Ensure backup directory exists
mkdir -p "$BACKUP_DIR"

# Run mongodump
echo "Creating database dump..."
mongodump --db="$DB_NAME" --out="$BACKUP_PATH"

# Compress backup
echo "Compressing backup..."
tar -czf "$ARCHIVE_NAME" -C "$BACKUP_DIR" "$DB_NAME-$TIMESTAMP"

# Remove the raw dump directory
rm -rf "$BACKUP_PATH"

echo "Backup created successfully: $ARCHIVE_NAME"

# ------------------------------------------------------------------------------
# PLUGGABLE CLOUD UPLOAD HOOK
# ------------------------------------------------------------------------------
# This script is modular. To automatically sync your backups to cloud storage
# (e.g. AWS S3, Backblaze B2, Cloudflare R2, or Google Cloud Storage),
# install your preferred CLI client and uncomment/configure the section below:
#
# echo "Uploading backup to cloud storage..."
# aws s3 cp "$ARCHIVE_NAME" s3://your-backup-bucket/mongodb/$(basename "$ARCHIVE_NAME")
# ------------------------------------------------------------------------------

# Retain latest backups and rotate old ones
echo "Cleaning up backups older than $RETENTION_DAYS days..."
find "$BACKUP_DIR" -name "$DB_NAME-*.tar.gz" -type f -mtime +$RETENTION_DAYS -delete

echo "========================================="
echo "Backup Completed Successfully"
echo "========================================="
