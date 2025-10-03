#!/bin/bash

# MongoDB Restore Script
# This script restores MongoDB from a backup

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

# Check arguments
if [ -z "$1" ]; then
    echo -e "${RED}ERROR: Backup date required${NC}"
    echo "Usage: $0 <backup_date>"
    echo "Example: $0 20251002_143000"
    echo ""
    echo "Available backups:"
    BACKUP_BASE_DIR="${BACKUP_DIR:-/backups/mongodb}"
    if [ -d "$BACKUP_BASE_DIR" ]; then
        ls -1 "$BACKUP_BASE_DIR" | grep -E '^[0-9]{8}_[0-9]{6}$'
    else
        echo "  No backups found in $BACKUP_BASE_DIR"
    fi
    exit 1
fi

BACKUP_DATE="$1"
BACKUP_BASE_DIR="${BACKUP_DIR:-/backups/mongodb}"
BACKUP_PATH="$BACKUP_BASE_DIR/$BACKUP_DATE"

# Verify backup exists
if [ ! -d "$BACKUP_PATH" ]; then
    echo -e "${RED}ERROR: Backup not found: $BACKUP_PATH${NC}"
    exit 1
fi

echo -e "${BLUE}================================================${NC}"
echo -e "${BLUE}MongoDB Restore - SimplePro-v3${NC}"
echo -e "${BLUE}================================================${NC}"
echo ""
echo -e "${YELLOW}⚠  WARNING: This will restore the database!${NC}"
echo ""
echo "Backup Date: $BACKUP_DATE"
echo "Backup Path: $BACKUP_PATH"
echo ""

# Display backup metadata
if [ -f "$BACKUP_PATH/backup-metadata.json" ]; then
    echo "Backup Metadata:"
    cat "$BACKUP_PATH/backup-metadata.json"
    echo ""
fi

# Confirmation prompt
read -p "Are you sure you want to proceed? (yes/no): " confirm
if [ "$confirm" != "yes" ]; then
    echo "Restore cancelled"
    exit 0
fi

echo ""

# Step 1: Verify checksums
echo -e "${BLUE}Step 1: Verifying backup integrity...${NC}"
if [ -f "$BACKUP_PATH/checksums.txt" ]; then
    cd "$BACKUP_PATH"
    if sha256sum -c checksums.txt --quiet; then
        echo -e "${GREEN}✓${NC} Backup integrity verified"
    else
        echo -e "${RED}✗${NC} Backup integrity check failed"
        exit 1
    fi
else
    echo -e "${YELLOW}⚠${NC}  Checksums not found, skipping integrity check"
fi

# Step 2: Stop application (optional)
echo -e "${BLUE}Step 2: Preparing for restore...${NC}"
echo -e "${YELLOW}⚠${NC}  Recommended: Stop the application before restoring"
read -p "Stop API container? (yes/no): " stop_api
if [ "$stop_api" == "yes" ]; then
    docker stop simplepro-api 2>/dev/null || echo "  API container not running"
fi

# Step 3: Copy backup to container
echo -e "${BLUE}Step 3: Copying backup to MongoDB container...${NC}"
docker cp "$BACKUP_PATH" simplepro-mongodb-primary:/tmp/restore
echo -e "${GREEN}✓${NC} Backup copied to container"

# Step 4: Drop existing database (optional)
echo ""
read -p "Drop existing database before restore? (yes/no): " drop_db
if [ "$drop_db" == "yes" ]; then
    echo -e "${BLUE}Step 4: Dropping existing database...${NC}"
    docker exec simplepro-mongodb-primary mongosh \
        -u "$MONGODB_USERNAME" \
        -p "$MONGODB_PASSWORD" \
        --authenticationDatabase admin \
        --eval "db.getSiblingDB('$MONGODB_DATABASE').dropDatabase()"
    echo -e "${GREEN}✓${NC} Database dropped"
else
    echo -e "${YELLOW}⚠${NC}  Skipping database drop (will merge with existing data)"
fi

# Step 5: Restore database
echo -e "${BLUE}Step 5: Restoring database...${NC}"

MONGODB_URI="mongodb://$MONGODB_USERNAME:$MONGODB_PASSWORD@localhost:27017/?authSource=admin"

# Restore with oplog if available
if [ -f "$BACKUP_PATH/oplog.bson.gz" ]; then
    echo "  Restoring with oplog replay..."
    if docker exec simplepro-mongodb-primary mongorestore \
        --uri="$MONGODB_URI" \
        --dir="/tmp/restore" \
        --gzip \
        --oplogReplay \
        --drop; then
        echo -e "${GREEN}✓${NC} Database restored with oplog replay"
    else
        echo -e "${RED}✗${NC} Restore failed"
        exit 1
    fi
else
    echo "  Restoring without oplog..."
    if docker exec simplepro-mongodb-primary mongorestore \
        --uri="$MONGODB_URI" \
        --dir="/tmp/restore" \
        --gzip \
        --drop; then
        echo -e "${GREEN}✓${NC} Database restored"
    else
        echo -e "${RED}✗${NC} Restore failed"
        exit 1
    fi
fi

# Step 6: Clean up
echo -e "${BLUE}Step 6: Cleaning up...${NC}"
docker exec simplepro-mongodb-primary rm -rf /tmp/restore
echo -e "${GREEN}✓${NC} Cleanup complete"

# Step 7: Verify restore
echo -e "${BLUE}Step 7: Verifying restore...${NC}"
COLLECTIONS=$(docker exec simplepro-mongodb-primary mongosh \
    -u "$MONGODB_USERNAME" \
    -p "$MONGODB_PASSWORD" \
    --authenticationDatabase admin \
    --quiet \
    --eval "db.getSiblingDB('$MONGODB_DATABASE').getCollectionNames().length")

echo -e "${GREEN}✓${NC} Restore verified: $COLLECTIONS collections restored"

# Step 8: Restart application
if [ "$stop_api" == "yes" ]; then
    echo -e "${BLUE}Step 8: Restarting API container...${NC}"
    docker start simplepro-api 2>/dev/null || echo "  Failed to start API container"
fi

# Display summary
echo ""
echo -e "${GREEN}================================================${NC}"
echo -e "${GREEN}Restore Complete!${NC}"
echo -e "${GREEN}================================================${NC}"
echo ""
echo "Database: $MONGODB_DATABASE"
echo "Collections Restored: $COLLECTIONS"
echo "Backup Date: $BACKUP_DATE"
echo ""
echo "Recommended next steps:"
echo "1. Verify application functionality"
echo "2. Check replica set status: ./scripts/mongodb/check-replica-health.sh"
echo "3. Review application logs for any errors"
echo ""
