#!/bin/bash
set -euo pipefail

# MongoDB Backup Script for SimplePro-v3
# This script creates timestamped backups of the MongoDB database

# Configuration
BACKUP_DIR="${BACKUP_DIR:-./backups/mongodb}"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_NAME="${1:-backup}_${TIMESTAMP}"
MONGODB_URI="${MONGODB_URI:-mongodb://admin:simplepro_dev_2024@localhost:27017}"
DATABASE_NAME="${DATABASE_NAME:-simplepro}"
RETENTION_DAYS="${RETENTION_DAYS:-30}"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}=== SimplePro MongoDB Backup ===${NC}"
echo "Timestamp: $(date)"
echo "Backup name: ${BACKUP_NAME}"
echo "Database: ${DATABASE_NAME}"
echo ""

# Create backup directory
mkdir -p "${BACKUP_DIR}"

# Check if mongodump is available
if ! command -v mongodump &> /dev/null; then
    echo -e "${RED}Error: mongodump not found. Please install MongoDB Database Tools.${NC}"
    echo "Download from: https://www.mongodb.com/try/download/database-tools"
    exit 1
fi

# Perform backup
echo -e "${YELLOW}Starting MongoDB backup...${NC}"
BACKUP_PATH="${BACKUP_DIR}/${BACKUP_NAME}"

if mongodump --uri="${MONGODB_URI}" --db="${DATABASE_NAME}" --out="${BACKUP_PATH}" --gzip; then
    echo -e "${GREEN}✓ Backup completed successfully${NC}"
    echo "Backup location: ${BACKUP_PATH}"

    # Get backup size
    BACKUP_SIZE=$(du -sh "${BACKUP_PATH}" | cut -f1)
    echo "Backup size: ${BACKUP_SIZE}"

    # Create checksum for verification
    echo -e "${YELLOW}Creating backup checksum...${NC}"
    cd "${BACKUP_DIR}"
    tar -czf "${BACKUP_NAME}.tar.gz" "${BACKUP_NAME}"
    sha256sum "${BACKUP_NAME}.tar.gz" > "${BACKUP_NAME}.tar.gz.sha256"

    # Remove uncompressed backup
    rm -rf "${BACKUP_NAME}"

    echo -e "${GREEN}✓ Backup compressed and checksummed${NC}"
    echo "Archive: ${BACKUP_DIR}/${BACKUP_NAME}.tar.gz"
else
    echo -e "${RED}✗ Backup failed${NC}"
    exit 1
fi

# Cleanup old backups
echo ""
echo -e "${YELLOW}Cleaning up backups older than ${RETENTION_DAYS} days...${NC}"
DELETED_COUNT=$(find "${BACKUP_DIR}" -name "*.tar.gz" -type f -mtime +${RETENTION_DAYS} | wc -l)

if [ "${DELETED_COUNT}" -gt 0 ]; then
    find "${BACKUP_DIR}" -name "*.tar.gz" -type f -mtime +${RETENTION_DAYS} -delete
    find "${BACKUP_DIR}" -name "*.sha256" -type f -mtime +${RETENTION_DAYS} -delete
    echo -e "${GREEN}✓ Deleted ${DELETED_COUNT} old backup(s)${NC}"
else
    echo "No old backups to delete"
fi

# List recent backups
echo ""
echo "Recent backups:"
ls -lht "${BACKUP_DIR}"/*.tar.gz 2>/dev/null | head -5 || echo "No backups found"

echo ""
echo -e "${GREEN}=== Backup completed successfully ===${NC}"
echo "Next steps:"
echo "1. Verify backup integrity: ./scripts/backup/verify-backup.sh ${BACKUP_NAME}.tar.gz"
echo "2. Upload to remote storage (optional)"
echo "3. Test restore procedure periodically"

exit 0
