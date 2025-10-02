#!/bin/bash
set -euo pipefail

# MinIO Backup Script for SimplePro-v3
# This script creates backups of MinIO S3 buckets

# Configuration
BACKUP_DIR="${BACKUP_DIR:-./backups/minio}"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_NAME="${1:-backup}_${TIMESTAMP}"
MINIO_ENDPOINT="${MINIO_ENDPOINT:-http://localhost:9000}"
MINIO_ACCESS_KEY="${MINIO_ACCESS_KEY:-admin}"
MINIO_SECRET_KEY="${MINIO_SECRET_KEY:-simplepro_minio_2024}"
BUCKET_NAME="${BUCKET_NAME:-simplepro-documents}"
RETENTION_DAYS="${RETENTION_DAYS:-30}"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}=== SimplePro MinIO Backup ===${NC}"
echo "Timestamp: $(date)"
echo "Backup name: ${BACKUP_NAME}"
echo "Bucket: ${BUCKET_NAME}"
echo ""

# Create backup directory
mkdir -p "${BACKUP_DIR}"

# Check if mc (MinIO Client) is available
if ! command -v mc &> /dev/null; then
    echo -e "${YELLOW}MinIO Client (mc) not found. Installing...${NC}"

    # Detect OS and install mc
    if [[ "$OSTYPE" == "linux-gnu"* ]]; then
        curl -o /usr/local/bin/mc https://dl.min.io/client/mc/release/linux-amd64/mc
        chmod +x /usr/local/bin/mc
    elif [[ "$OSTYPE" == "darwin"* ]]; then
        brew install minio/stable/mc || curl -o /usr/local/bin/mc https://dl.min.io/client/mc/release/darwin-amd64/mc
        chmod +x /usr/local/bin/mc
    else
        echo -e "${RED}Error: Unsupported OS. Please install MinIO Client manually.${NC}"
        echo "Download from: https://min.io/docs/minio/linux/reference/minio-mc.html"
        exit 1
    fi
fi

# Configure MinIO client
echo -e "${YELLOW}Configuring MinIO client...${NC}"
mc alias set local "${MINIO_ENDPOINT}" "${MINIO_ACCESS_KEY}" "${MINIO_SECRET_KEY}" --api S3v4

# Check if bucket exists
if ! mc ls "local/${BUCKET_NAME}" &> /dev/null; then
    echo -e "${RED}Error: Bucket ${BUCKET_NAME} not found${NC}"
    exit 1
fi

# Perform backup
echo -e "${YELLOW}Starting MinIO backup...${NC}"
BACKUP_PATH="${BACKUP_DIR}/${BACKUP_NAME}"
mkdir -p "${BACKUP_PATH}"

if mc mirror "local/${BUCKET_NAME}" "${BACKUP_PATH}" --remove-orphans; then
    echo -e "${GREEN}✓ Backup completed successfully${NC}"
    echo "Backup location: ${BACKUP_PATH}"

    # Get backup size and file count
    FILE_COUNT=$(find "${BACKUP_PATH}" -type f | wc -l)
    BACKUP_SIZE=$(du -sh "${BACKUP_PATH}" | cut -f1)
    echo "Files backed up: ${FILE_COUNT}"
    echo "Backup size: ${BACKUP_SIZE}"

    # Create manifest file
    echo -e "${YELLOW}Creating backup manifest...${NC}"
    cat > "${BACKUP_PATH}/backup-manifest.json" <<EOF
{
  "timestamp": "$(date -Iseconds)",
  "bucket": "${BUCKET_NAME}",
  "file_count": ${FILE_COUNT},
  "backup_size": "${BACKUP_SIZE}",
  "endpoint": "${MINIO_ENDPOINT}"
}
EOF

    # Create compressed archive
    echo -e "${YELLOW}Compressing backup...${NC}"
    cd "${BACKUP_DIR}"
    tar -czf "${BACKUP_NAME}.tar.gz" "${BACKUP_NAME}"
    sha256sum "${BACKUP_NAME}.tar.gz" > "${BACKUP_NAME}.tar.gz.sha256"

    # Remove uncompressed backup
    rm -rf "${BACKUP_NAME}"

    echo -e "${GREEN}✓ Backup compressed and checksummed${NC}"
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

exit 0
