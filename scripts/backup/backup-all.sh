#!/bin/bash
set -euo pipefail

# Complete Backup Script for SimplePro-v3
# This script orchestrates backups of all system components

# Configuration
BACKUP_ROOT="${BACKUP_ROOT:-./backups}"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_TAG="${1:-scheduled}"
LOG_FILE="${BACKUP_ROOT}/backup-${TIMESTAMP}.log"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Create backup root directory
mkdir -p "${BACKUP_ROOT}"

# Setup logging
exec 1> >(tee -a "${LOG_FILE}")
exec 2>&1

echo -e "${BLUE}╔══════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║  SimplePro-v3 Complete Backup               ║${NC}"
echo -e "${BLUE}╚══════════════════════════════════════════════╝${NC}"
echo ""
echo "Started: $(date)"
echo "Backup tag: ${BACKUP_TAG}"
echo "Log file: ${LOG_FILE}"
echo ""

# Initialize status tracking
BACKUP_STATUS=0
COMPONENTS_BACKED_UP=0
TOTAL_COMPONENTS=3

# Function to check if service is running
check_service() {
    local service_name=$1
    local check_command=$2

    echo -e "${YELLOW}Checking ${service_name}...${NC}"
    if eval "${check_command}" &> /dev/null; then
        echo -e "${GREEN}✓ ${service_name} is running${NC}"
        return 0
    else
        echo -e "${RED}✗ ${service_name} is not running${NC}"
        return 1
    fi
}

# 1. Backup MongoDB
echo ""
echo -e "${BLUE}[1/${TOTAL_COMPONENTS}] Backing up MongoDB...${NC}"
echo "────────────────────────────────────────────────"

if check_service "MongoDB" "docker ps | grep simplepro-mongodb"; then
    if BACKUP_DIR="${BACKUP_ROOT}/mongodb" ./scripts/backup/backup-mongodb.sh "${BACKUP_TAG}"; then
        echo -e "${GREEN}✓ MongoDB backup completed${NC}"
        COMPONENTS_BACKED_UP=$((COMPONENTS_BACKED_UP + 1))
    else
        echo -e "${RED}✗ MongoDB backup failed${NC}"
        BACKUP_STATUS=1
    fi
else
    echo -e "${YELLOW}⊘ MongoDB not running, skipping backup${NC}"
fi

# 2. Backup MinIO/S3
echo ""
echo -e "${BLUE}[2/${TOTAL_COMPONENTS}] Backing up MinIO S3...${NC}"
echo "────────────────────────────────────────────────"

if check_service "MinIO" "docker ps | grep simplepro-minio"; then
    if BACKUP_DIR="${BACKUP_ROOT}/minio" ./scripts/backup/backup-minio.sh "${BACKUP_TAG}"; then
        echo -e "${GREEN}✓ MinIO backup completed${NC}"
        COMPONENTS_BACKED_UP=$((COMPONENTS_BACKED_UP + 1))
    else
        echo -e "${RED}✗ MinIO backup failed${NC}"
        BACKUP_STATUS=1
    fi
else
    echo -e "${YELLOW}⊘ MinIO not running, skipping backup${NC}"
fi

# 3. Backup configuration files
echo ""
echo -e "${BLUE}[3/${TOTAL_COMPONENTS}] Backing up configuration files...${NC}"
echo "────────────────────────────────────────────────"

CONFIG_BACKUP_DIR="${BACKUP_ROOT}/config/${BACKUP_TAG}_${TIMESTAMP}"
mkdir -p "${CONFIG_BACKUP_DIR}"

# List of config files to backup
CONFIG_FILES=(
    "docker-compose.prod.yml"
    "docker-compose.dev.yml"
    "docker-compose.monitoring.yml"
    ".env.production"
    ".env.staging"
    "monitoring/prometheus/prometheus.yml"
    "monitoring/grafana/provisioning"
)

echo "Backing up configuration files..."
for config_file in "${CONFIG_FILES[@]}"; do
    if [ -e "${config_file}" ]; then
        # Create directory structure
        config_dir=$(dirname "${config_file}")
        mkdir -p "${CONFIG_BACKUP_DIR}/${config_dir}"

        # Copy file or directory
        cp -r "${config_file}" "${CONFIG_BACKUP_DIR}/${config_file}"
        echo "  ✓ ${config_file}"
    else
        echo "  ⊘ ${config_file} (not found)"
    fi
done

# Create archive
cd "${BACKUP_ROOT}/config"
tar -czf "${BACKUP_TAG}_${TIMESTAMP}.tar.gz" "${BACKUP_TAG}_${TIMESTAMP}"
sha256sum "${BACKUP_TAG}_${TIMESTAMP}.tar.gz" > "${BACKUP_TAG}_${TIMESTAMP}.tar.gz.sha256"
rm -rf "${BACKUP_TAG}_${TIMESTAMP}"

echo -e "${GREEN}✓ Configuration backup completed${NC}"
COMPONENTS_BACKED_UP=$((COMPONENTS_BACKED_UP + 1))

# Generate backup report
echo ""
echo -e "${BLUE}════════════════════════════════════════════════${NC}"
echo -e "${BLUE}Backup Summary${NC}"
echo -e "${BLUE}════════════════════════════════════════════════${NC}"
echo "Completed: $(date)"
echo "Duration: $(($(date +%s) - $(date -d "$(head -1 ${LOG_FILE} | grep -oP '\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}')" +%s))) seconds" || echo "Duration: N/A"
echo "Components backed up: ${COMPONENTS_BACKED_UP}/${TOTAL_COMPONENTS}"
echo ""

# Calculate total backup size
if [ -d "${BACKUP_ROOT}/mongodb" ] || [ -d "${BACKUP_ROOT}/minio" ] || [ -d "${BACKUP_ROOT}/config" ]; then
    TOTAL_SIZE=$(du -sh "${BACKUP_ROOT}" | cut -f1)
    echo "Total backup size: ${TOTAL_SIZE}"
fi

echo ""
echo "Backup locations:"
echo "  - MongoDB: ${BACKUP_ROOT}/mongodb/"
echo "  - MinIO: ${BACKUP_ROOT}/minio/"
echo "  - Config: ${BACKUP_ROOT}/config/"
echo ""
echo "Log file: ${LOG_FILE}"

# Final status
echo ""
if [ ${BACKUP_STATUS} -eq 0 ]; then
    echo -e "${GREEN}✓ All backups completed successfully${NC}"
else
    echo -e "${YELLOW}⚠ Some backups had issues. Check the log for details.${NC}"
fi

# Optional: Upload to remote storage
if [ -n "${BACKUP_REMOTE_STORAGE:-}" ]; then
    echo ""
    echo -e "${YELLOW}Uploading backups to remote storage...${NC}"
    # Add your remote storage upload command here
    # Example: aws s3 sync "${BACKUP_ROOT}" "s3://your-bucket/backups/"
fi

exit ${BACKUP_STATUS}
