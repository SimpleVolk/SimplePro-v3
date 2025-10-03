#!/bin/bash

# MongoDB Backup Script
# This script creates full backups of the MongoDB replica set

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

# Load environment variables
if [ -f "$PROJECT_ROOT/.env.local" ]; then
    export $(cat "$PROJECT_ROOT/.env.local" | grep -v '^#' | xargs)
else
    export MONGODB_USERNAME=admin
    export MONGODB_PASSWORD=password123
    export MONGODB_DATABASE=simplepro
fi

# Backup configuration
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_BASE_DIR="${BACKUP_DIR:-/backups/mongodb}"
BACKUP_DIR="$BACKUP_BASE_DIR/$DATE"
RETENTION_DAYS="${BACKUP_RETENTION_DAYS:-30}"

echo -e "${BLUE}================================================${NC}"
echo -e "${BLUE}MongoDB Backup - SimplePro-v3${NC}"
echo -e "${BLUE}================================================${NC}"
echo ""
echo "Backup Date: $(date)"
echo "Backup Directory: $BACKUP_DIR"
echo ""

# Create backup directory
mkdir -p "$BACKUP_DIR"

# Step 1: Full database dump
echo -e "${BLUE}Step 1: Creating full database dump...${NC}"

MONGODB_URI="mongodb://$MONGODB_USERNAME:$MONGODB_PASSWORD@localhost:27017/?authSource=admin"

if docker exec simplepro-mongodb-primary mongodump \
    --uri="$MONGODB_URI" \
    --out="/tmp/backup" \
    --gzip \
    --oplog; then
    echo -e "${GREEN}✓${NC} Database dump completed"
else
    echo -e "${RED}✗${NC} Database dump failed"
    exit 1
fi

# Step 2: Copy backup from container
echo -e "${BLUE}Step 2: Copying backup from container...${NC}"
docker cp simplepro-mongodb-primary:/tmp/backup "$BACKUP_DIR/"
docker exec simplepro-mongodb-primary rm -rf /tmp/backup

if [ -d "$BACKUP_DIR/backup" ]; then
    mv "$BACKUP_DIR/backup"/* "$BACKUP_DIR/"
    rmdir "$BACKUP_DIR/backup"
    echo -e "${GREEN}✓${NC} Backup copied successfully"
else
    echo -e "${RED}✗${NC} Failed to copy backup"
    exit 1
fi

# Step 3: Create backup metadata
echo -e "${BLUE}Step 3: Creating backup metadata...${NC}"

cat > "$BACKUP_DIR/backup-metadata.json" <<EOF
{
  "timestamp": "$(date -Iseconds)",
  "backup_date": "$DATE",
  "database": "$MONGODB_DATABASE",
  "replica_set": "simplepro-rs",
  "backup_type": "full",
  "compression": "gzip",
  "includes_oplog": true,
  "mongodb_version": "$(docker exec simplepro-mongodb-primary mongosh --version | head -n 1)",
  "hostname": "$(hostname)",
  "backup_size": "$(du -sh "$BACKUP_DIR" | cut -f1)"
}
EOF

echo -e "${GREEN}✓${NC} Metadata created"

# Step 4: Verify backup integrity
echo -e "${BLUE}Step 4: Verifying backup integrity...${NC}"

if [ -f "$BACKUP_DIR/oplog.bson.gz" ] && [ -d "$BACKUP_DIR/admin" ]; then
    COLLECTIONS=$(find "$BACKUP_DIR" -name "*.bson.gz" | wc -l)
    echo -e "${GREEN}✓${NC} Backup verified: $COLLECTIONS collections backed up"
else
    echo -e "${RED}✗${NC} Backup verification failed"
    exit 1
fi

# Step 5: Calculate checksums
echo -e "${BLUE}Step 5: Calculating checksums...${NC}"
cd "$BACKUP_DIR"
find . -type f -name "*.bson.gz" -exec sha256sum {} \; > checksums.txt
echo -e "${GREEN}✓${NC} Checksums calculated"

# Step 6: Clean up old backups
echo -e "${BLUE}Step 6: Cleaning up old backups...${NC}"
if [ -d "$BACKUP_BASE_DIR" ]; then
    OLD_BACKUPS=$(find "$BACKUP_BASE_DIR" -maxdepth 1 -type d -mtime +$RETENTION_DAYS)
    if [ -n "$OLD_BACKUPS" ]; then
        echo "$OLD_BACKUPS" | while read dir; do
            if [ "$dir" != "$BACKUP_BASE_DIR" ]; then
                echo "  Removing old backup: $(basename "$dir")"
                rm -rf "$dir"
            fi
        done
        echo -e "${GREEN}✓${NC} Old backups cleaned up"
    else
        echo -e "${GREEN}✓${NC} No old backups to clean up"
    fi
fi

# Step 7: Display backup summary
echo ""
echo -e "${GREEN}================================================${NC}"
echo -e "${GREEN}Backup Complete!${NC}"
echo -e "${GREEN}================================================${NC}"
echo ""
echo "Backup Location: $BACKUP_DIR"
echo "Backup Size: $(du -sh "$BACKUP_DIR" | cut -f1)"
echo "Collections: $COLLECTIONS"
echo "Retention: $RETENTION_DAYS days"
echo ""

# Optional: Upload to cloud storage (uncomment to enable)
# echo -e "${BLUE}Step 8: Uploading to S3...${NC}"
# if command -v aws &> /dev/null; then
#     S3_BUCKET="${BACKUP_S3_BUCKET:-simplepro-backups}"
#     S3_PREFIX="mongodb/$DATE"
#
#     if aws s3 cp "$BACKUP_DIR" "s3://$S3_BUCKET/$S3_PREFIX/" --recursive; then
#         echo -e "${GREEN}✓${NC} Uploaded to S3: s3://$S3_BUCKET/$S3_PREFIX/"
#     else
#         echo -e "${RED}✗${NC} Failed to upload to S3"
#     fi
# else
#     echo -e "${YELLOW}⚠${NC}  AWS CLI not found, skipping S3 upload"
# fi

echo ""
echo "To restore this backup, run:"
echo "./scripts/backup/mongodb-restore.sh $DATE"
echo ""
