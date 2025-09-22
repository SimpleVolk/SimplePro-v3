#!/bin/bash

# SimplePro Backup and Disaster Recovery Script
# This script handles database backups, log archival, and disaster recovery procedures

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
BACKUP_DIR="${BACKUP_DIR:-$PROJECT_ROOT/backups}"
CONFIG_FILE="$PROJECT_ROOT/.env.production"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Load environment variables
load_env() {
    if [ -f "$CONFIG_FILE" ]; then
        set -a
        source "$CONFIG_FILE"
        set +a
        log_info "Environment variables loaded from $CONFIG_FILE"
    else
        log_error "Configuration file not found: $CONFIG_FILE"
        exit 1
    fi
}

# Create backup directory structure
create_backup_structure() {
    local date_str=$(date +%Y/%m/%d)
    local timestamp=$(date +%Y%m%d_%H%M%S)

    DAILY_BACKUP_DIR="$BACKUP_DIR/$date_str"
    CURRENT_BACKUP_DIR="$DAILY_BACKUP_DIR/$timestamp"

    mkdir -p "$CURRENT_BACKUP_DIR"/{mongodb,redis,logs,config,volumes}

    log_info "Backup directory created: $CURRENT_BACKUP_DIR"
}

# Backup MongoDB database
backup_mongodb() {
    log_info "Starting MongoDB backup..."

    local backup_file="$CURRENT_BACKUP_DIR/mongodb/simplepro_prod_$(date +%Y%m%d_%H%M%S).archive"

    # Use mongodump to create backup
    docker exec simplepro-mongodb-prod mongodump \
        --uri="mongodb://${MONGODB_USERNAME}:${MONGODB_PASSWORD}@localhost:27017/simplepro_prod?authSource=admin" \
        --archive="$backup_file" \
        --gzip

    # Verify backup
    if [ -f "$backup_file" ] && [ -s "$backup_file" ]; then
        local size=$(du -h "$backup_file" | cut -f1)
        log_success "MongoDB backup completed: $backup_file ($size)"

        # Create checksum
        sha256sum "$backup_file" > "$backup_file.sha256"
    else
        log_error "MongoDB backup failed"
        return 1
    fi
}

# Backup Redis data
backup_redis() {
    log_info "Starting Redis backup..."

    # Trigger Redis save
    docker exec simplepro-redis-prod redis-cli -a "$REDIS_PASSWORD" BGSAVE

    # Wait for background save to complete
    while [ "$(docker exec simplepro-redis-prod redis-cli -a "$REDIS_PASSWORD" LASTSAVE)" = "$(docker exec simplepro-redis-prod redis-cli -a "$REDIS_PASSWORD" LASTSAVE)" ]; do
        sleep 1
    done

    # Copy Redis dump file
    docker cp simplepro-redis-prod:/data/dump.rdb "$CURRENT_BACKUP_DIR/redis/dump_$(date +%Y%m%d_%H%M%S).rdb"

    # Copy AOF file if it exists
    if docker exec simplepro-redis-prod test -f /data/appendonly.aof; then
        docker cp simplepro-redis-prod:/data/appendonly.aof "$CURRENT_BACKUP_DIR/redis/appendonly_$(date +%Y%m%d_%H%M%S).aof"
    fi

    log_success "Redis backup completed"
}

# Backup application logs
backup_logs() {
    log_info "Starting logs backup..."

    # Backup Docker logs
    local services=("simplepro-api-prod" "simplepro-web-prod" "simplepro-nginx-prod" "simplepro-mongodb-prod" "simplepro-redis-prod")

    for service in "${services[@]}"; do
        if docker ps --filter "name=$service" --format "{{.Names}}" | grep -q "$service"; then
            docker logs "$service" > "$CURRENT_BACKUP_DIR/logs/${service}_$(date +%Y%m%d_%H%M%S).log" 2>&1
        fi
    done

    # Backup application logs if they exist
    if [ -d "$PROJECT_ROOT/logs" ]; then
        cp -r "$PROJECT_ROOT/logs" "$CURRENT_BACKUP_DIR/logs/application_logs_$(date +%Y%m%d_%H%M%S)"
    fi

    # Backup nginx logs
    if docker volume ls --filter "name=simplepro_nginx_logs" --format "{{.Name}}" | grep -q "simplepro_nginx_logs"; then
        docker run --rm -v simplepro_nginx_logs:/logs -v "$CURRENT_BACKUP_DIR/logs":/backup alpine \
            cp -r /logs /backup/nginx_logs_$(date +%Y%m%d_%H%M%S)
    fi

    log_success "Logs backup completed"
}

# Backup configuration files
backup_config() {
    log_info "Starting configuration backup..."

    # Backup Docker configurations
    cp -r "$PROJECT_ROOT/docker" "$CURRENT_BACKUP_DIR/config/"

    # Backup environment files (excluding sensitive data)
    cp "$PROJECT_ROOT/.env.example" "$CURRENT_BACKUP_DIR/config/"

    # Backup docker-compose files
    cp "$PROJECT_ROOT"/docker-compose*.yml "$CURRENT_BACKUP_DIR/config/"

    # Backup scripts
    cp -r "$PROJECT_ROOT/scripts" "$CURRENT_BACKUP_DIR/config/"

    log_success "Configuration backup completed"
}

# Backup Docker volumes
backup_volumes() {
    log_info "Starting Docker volumes backup..."

    local volumes=("mongodb_data" "redis_data" "minio_data" "prometheus_data" "grafana_data")

    for volume in "${volumes[@]}"; do
        local full_volume_name="simplepro_${volume}"
        if docker volume ls --filter "name=$full_volume_name" --format "{{.Name}}" | grep -q "$full_volume_name"; then
            log_info "Backing up volume: $full_volume_name"

            # Create compressed backup of volume
            docker run --rm \
                -v "$full_volume_name:/data:ro" \
                -v "$CURRENT_BACKUP_DIR/volumes:/backup" \
                alpine \
                tar czf "/backup/${volume}_$(date +%Y%m%d_%H%M%S).tar.gz" -C /data .
        fi
    done

    log_success "Docker volumes backup completed"
}

# Create backup manifest
create_manifest() {
    log_info "Creating backup manifest..."

    local manifest_file="$CURRENT_BACKUP_DIR/MANIFEST.txt"

    cat > "$manifest_file" << EOF
SimplePro Backup Manifest
========================

Backup Date: $(date)
Backup Directory: $CURRENT_BACKUP_DIR
Backup Type: Full System Backup

Components Backed Up:
- MongoDB Database
- Redis Cache
- Application Logs
- Docker Logs
- Configuration Files
- Docker Volumes

Environment:
- Node Environment: $NODE_ENV
- Database URL: $DATABASE_URL
- Redis URL: $REDIS_URL

File Listing:
$(find "$CURRENT_BACKUP_DIR" -type f -exec ls -lh {} \; | sort)

Checksums:
$(find "$CURRENT_BACKUP_DIR" -name "*.sha256" -exec cat {} \;)

Total Backup Size: $(du -sh "$CURRENT_BACKUP_DIR" | cut -f1)
EOF

    log_success "Backup manifest created: $manifest_file"
}

# Compress backup
compress_backup() {
    log_info "Compressing backup..."

    local archive_name="simplepro_backup_$(date +%Y%m%d_%H%M%S).tar.gz"
    local archive_path="$DAILY_BACKUP_DIR/$archive_name"

    tar -czf "$archive_path" -C "$CURRENT_BACKUP_DIR" .

    # Create checksum for archive
    sha256sum "$archive_path" > "$archive_path.sha256"

    # Remove uncompressed backup
    rm -rf "$CURRENT_BACKUP_DIR"

    local size=$(du -h "$archive_path" | cut -f1)
    log_success "Backup compressed: $archive_path ($size)"
}

# Clean old backups
cleanup_old_backups() {
    log_info "Cleaning up old backups..."

    # Keep daily backups for 30 days
    find "$BACKUP_DIR" -name "*.tar.gz" -mtime +30 -delete
    find "$BACKUP_DIR" -name "*.sha256" -mtime +30 -delete

    # Remove empty directories
    find "$BACKUP_DIR" -type d -empty -delete

    log_success "Old backups cleaned up"
}

# Restore MongoDB from backup
restore_mongodb() {
    local backup_file="$1"

    if [ ! -f "$backup_file" ]; then
        log_error "Backup file not found: $backup_file"
        return 1
    fi

    log_warning "This will replace the current MongoDB database. Are you sure? (y/N)"
    read -r confirm
    if [[ ! "$confirm" =~ ^[Yy]$ ]]; then
        log_info "Restore cancelled"
        return 0
    fi

    log_info "Restoring MongoDB from: $backup_file"

    # Verify checksum if available
    if [ -f "$backup_file.sha256" ]; then
        if sha256sum -c "$backup_file.sha256"; then
            log_success "Backup file checksum verified"
        else
            log_error "Backup file checksum verification failed"
            return 1
        fi
    fi

    # Stop API service to prevent data corruption
    docker stop simplepro-api-prod || true

    # Restore database
    docker exec simplepro-mongodb-prod mongorestore \
        --uri="mongodb://${MONGODB_USERNAME}:${MONGODB_PASSWORD}@localhost:27017/simplepro_prod?authSource=admin" \
        --archive="$backup_file" \
        --gzip \
        --drop

    # Restart API service
    docker start simplepro-api-prod

    log_success "MongoDB restore completed"
}

# Restore Redis from backup
restore_redis() {
    local backup_file="$1"

    if [ ! -f "$backup_file" ]; then
        log_error "Backup file not found: $backup_file"
        return 1
    fi

    log_warning "This will replace the current Redis data. Are you sure? (y/N)"
    read -r confirm
    if [[ ! "$confirm" =~ ^[Yy]$ ]]; then
        log_info "Restore cancelled"
        return 0
    fi

    log_info "Restoring Redis from: $backup_file"

    # Stop Redis service
    docker stop simplepro-redis-prod

    # Copy backup file to Redis container
    docker cp "$backup_file" simplepro-redis-prod:/data/dump.rdb

    # Restart Redis service
    docker start simplepro-redis-prod

    log_success "Redis restore completed"
}

# Health check after backup/restore
health_check() {
    log_info "Running health checks..."

    local services=("simplepro-api-prod" "simplepro-web-prod" "simplepro-mongodb-prod" "simplepro-redis-prod")
    local failed_services=()

    for service in "${services[@]}"; do
        if docker ps --filter "name=$service" --filter "status=running" --format "{{.Names}}" | grep -q "$service"; then
            log_success "$service is running"
        else
            log_error "$service is not running"
            failed_services+=("$service")
        fi
    done

    # Test API health endpoint
    if curl -f http://localhost:4000/api/health > /dev/null 2>&1; then
        log_success "API health check passed"
    else
        log_error "API health check failed"
        failed_services+=("api-health")
    fi

    # Test web health endpoint
    if curl -f http://localhost:3000/health > /dev/null 2>&1; then
        log_success "Web health check passed"
    else
        log_error "Web health check failed"
        failed_services+=("web-health")
    fi

    if [ ${#failed_services[@]} -eq 0 ]; then
        log_success "All health checks passed"
        return 0
    else
        log_error "Health check failures: ${failed_services[*]}"
        return 1
    fi
}

# Main backup function
perform_backup() {
    log_info "Starting SimplePro full system backup..."

    create_backup_structure
    backup_mongodb
    backup_redis
    backup_logs
    backup_config
    backup_volumes
    create_manifest
    compress_backup
    cleanup_old_backups

    log_success "Backup completed successfully!"
    health_check
}

# Main function
main() {
    case "${1:-backup}" in
        "backup"|"full")
            load_env
            perform_backup
            ;;
        "restore-mongodb")
            load_env
            restore_mongodb "$2"
            ;;
        "restore-redis")
            load_env
            restore_redis "$2"
            ;;
        "cleanup")
            cleanup_old_backups
            ;;
        "health")
            load_env
            health_check
            ;;
        "help"|"-h"|"--help")
            echo "SimplePro Backup and Disaster Recovery"
            echo ""
            echo "Usage: $0 [command] [options]"
            echo ""
            echo "Commands:"
            echo "  backup              Perform full system backup (default)"
            echo "  restore-mongodb     Restore MongoDB from backup file"
            echo "  restore-redis       Restore Redis from backup file"
            echo "  cleanup             Clean up old backup files"
            echo "  health              Run system health checks"
            echo "  help                Show this help message"
            echo ""
            echo "Environment Variables:"
            echo "  BACKUP_DIR          Backup directory (default: ./backups)"
            echo ""
            echo "Examples:"
            echo "  $0 backup"
            echo "  $0 restore-mongodb /path/to/backup.archive"
            echo "  $0 restore-redis /path/to/dump.rdb"
            echo ""
            ;;
        *)
            log_error "Unknown command: $1"
            echo "Use '$0 help' for usage information"
            exit 1
            ;;
    esac
}

# Run main function
main "$@"