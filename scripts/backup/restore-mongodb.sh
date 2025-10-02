#!/bin/bash
set -euo pipefail

# MongoDB Restore Script for SimplePro-v3
# This script restores a MongoDB backup from a specified archive

# Configuration
BACKUP_DIR="${BACKUP_DIR:-./backups/mongodb}"
MONGODB_URI="${MONGODB_URI:-mongodb://admin:simplepro_dev_2024@localhost:27017}"
DATABASE_NAME="${DATABASE_NAME:-simplepro}"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}=== SimplePro MongoDB Restore ===${NC}"
echo "Timestamp: $(date)"
echo ""

# Check if backup file is provided
if [ $# -eq 0 ]; then
    echo "Usage: $0 <backup-file> [--drop]"
    echo ""
    echo "Available backups:"
    ls -1ht "${BACKUP_DIR}"/*.tar.gz 2>/dev/null | head -10 || echo "No backups found"
    echo ""
    echo "To use latest backup: $0 latest"
    exit 1
fi

BACKUP_FILE="$1"
DROP_DATABASE="${2:-}"

# Handle 'latest' shortcut
if [ "${BACKUP_FILE}" = "latest" ]; then
    BACKUP_FILE=$(ls -1t "${BACKUP_DIR}"/*.tar.gz 2>/dev/null | head -1)
    if [ -z "${BACKUP_FILE}" ]; then
        echo -e "${RED}Error: No backup files found${NC}"
        exit 1
    fi
    echo "Using latest backup: ${BACKUP_FILE}"
fi

# Check if backup file exists
if [ ! -f "${BACKUP_FILE}" ]; then
    # Try adding backup directory prefix
    BACKUP_FILE="${BACKUP_DIR}/${BACKUP_FILE}"
    if [ ! -f "${BACKUP_FILE}" ]; then
        echo -e "${RED}Error: Backup file not found: ${BACKUP_FILE}${NC}"
        exit 1
    fi
fi

echo "Backup file: ${BACKUP_FILE}"
echo "Database: ${DATABASE_NAME}"
echo ""

# Verify checksum if available
CHECKSUM_FILE="${BACKUP_FILE}.sha256"
if [ -f "${CHECKSUM_FILE}" ]; then
    echo -e "${YELLOW}Verifying backup integrity...${NC}"
    if sha256sum -c "${CHECKSUM_FILE}"; then
        echo -e "${GREEN}✓ Backup integrity verified${NC}"
    else
        echo -e "${RED}✗ Backup integrity check failed${NC}"
        read -p "Continue anyway? (yes/no): " CONTINUE
        if [ "${CONTINUE}" != "yes" ]; then
            exit 1
        fi
    fi
else
    echo -e "${YELLOW}Warning: Checksum file not found. Skipping integrity check.${NC}"
fi

# Confirm restore operation
echo ""
echo -e "${RED}WARNING: This will restore the database from backup.${NC}"
if [ "${DROP_DATABASE}" = "--drop" ]; then
    echo -e "${RED}The --drop flag is set. Existing data will be DELETED.${NC}"
fi
echo ""
read -p "Are you sure you want to continue? (yes/no): " CONFIRM

if [ "${CONFIRM}" != "yes" ]; then
    echo "Restore cancelled"
    exit 0
fi

# Check if mongorestore is available
if ! command -v mongorestore &> /dev/null; then
    echo -e "${RED}Error: mongorestore not found. Please install MongoDB Database Tools.${NC}"
    exit 1
fi

# Extract backup
echo ""
echo -e "${YELLOW}Extracting backup archive...${NC}"
TEMP_DIR=$(mktemp -d)
tar -xzf "${BACKUP_FILE}" -C "${TEMP_DIR}"
echo -e "${GREEN}✓ Backup extracted${NC}"

# Find the backup directory
BACKUP_DATA_DIR=$(find "${TEMP_DIR}" -type d -name "${DATABASE_NAME}" | head -1)
if [ -z "${BACKUP_DATA_DIR}" ]; then
    echo -e "${RED}Error: Could not find database directory in backup${NC}"
    rm -rf "${TEMP_DIR}"
    exit 1
fi

# Perform restore
echo ""
echo -e "${YELLOW}Starting MongoDB restore...${NC}"

RESTORE_ARGS="--uri=${MONGODB_URI} --db=${DATABASE_NAME} --gzip"
if [ "${DROP_DATABASE}" = "--drop" ]; then
    RESTORE_ARGS="${RESTORE_ARGS} --drop"
fi

if mongorestore ${RESTORE_ARGS} "${BACKUP_DATA_DIR}"; then
    echo -e "${GREEN}✓ Database restored successfully${NC}"
else
    echo -e "${RED}✗ Restore failed${NC}"
    rm -rf "${TEMP_DIR}"
    exit 1
fi

# Cleanup
rm -rf "${TEMP_DIR}"

# Verify restore
echo ""
echo -e "${YELLOW}Verifying restore...${NC}"
COLLECTION_COUNT=$(mongosh "${MONGODB_URI}/${DATABASE_NAME}" --quiet --eval "db.getCollectionNames().length")
echo "Collections restored: ${COLLECTION_COUNT}"

echo ""
echo -e "${GREEN}=== Restore completed successfully ===${NC}"
echo "Next steps:"
echo "1. Verify application functionality"
echo "2. Check data integrity"
echo "3. Monitor application logs for errors"

exit 0
