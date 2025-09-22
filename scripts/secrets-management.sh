#!/bin/bash

# SimplePro Secrets Management Script
# This script manages secrets and environment variables for production deployment

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
SECRETS_DIR="$PROJECT_ROOT/.secrets"
ENV_FILE="$PROJECT_ROOT/.env.production"

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

# Generate secure random passwords
generate_password() {
    local length=${1:-32}
    openssl rand -base64 "$length" | tr -d "=+/" | cut -c1-"$length"
}

# Generate JWT secrets
generate_jwt_secret() {
    openssl rand -hex 64
}

# Create secrets directory
create_secrets_dir() {
    if [ ! -d "$SECRETS_DIR" ]; then
        log_info "Creating secrets directory..."
        mkdir -p "$SECRETS_DIR"
        chmod 700 "$SECRETS_DIR"
        log_success "Secrets directory created"
    fi
}

# Generate production secrets
generate_secrets() {
    log_info "Generating production secrets..."

    # MongoDB credentials
    MONGODB_USERNAME="admin"
    MONGODB_PASSWORD=$(generate_password 24)

    # Redis password
    REDIS_PASSWORD=$(generate_password 24)

    # JWT secrets
    JWT_SECRET=$(generate_jwt_secret)
    JWT_REFRESH_SECRET=$(generate_jwt_secret)

    # MinIO credentials
    MINIO_ROOT_USER="simplepro-admin"
    MINIO_ROOT_PASSWORD=$(generate_password 24)

    # Grafana admin password
    GRAFANA_ADMIN_PASSWORD=$(generate_password 16)

    # Save secrets to secure files
    echo "$MONGODB_PASSWORD" > "$SECRETS_DIR/mongodb_password"
    echo "$REDIS_PASSWORD" > "$SECRETS_DIR/redis_password"
    echo "$JWT_SECRET" > "$SECRETS_DIR/jwt_secret"
    echo "$JWT_REFRESH_SECRET" > "$SECRETS_DIR/jwt_refresh_secret"
    echo "$MINIO_ROOT_PASSWORD" > "$SECRETS_DIR/minio_password"
    echo "$GRAFANA_ADMIN_PASSWORD" > "$SECRETS_DIR/grafana_password"

    # Set secure permissions
    chmod 600 "$SECRETS_DIR"/*

    log_success "Production secrets generated and saved to $SECRETS_DIR"
}

# Create production environment file
create_production_env() {
    log_info "Creating production environment file..."

    cat > "$ENV_FILE" << EOF
# SimplePro Production Environment Configuration
# Generated on: $(date)

# Node.js Environment
NODE_ENV=production

# Application Configuration
PORT=4000
LOG_LEVEL=info

# Database Configuration
MONGODB_USERNAME=admin
MONGODB_PASSWORD=$(cat "$SECRETS_DIR/mongodb_password")
DATABASE_URL=mongodb://admin:$(cat "$SECRETS_DIR/mongodb_password")@mongodb:27017/simplepro_prod?authSource=admin

# Redis Configuration
REDIS_PASSWORD=$(cat "$SECRETS_DIR/redis_password")
REDIS_URL=redis://:$(cat "$SECRETS_DIR/redis_password")@redis:6379

# JWT Configuration
JWT_SECRET=$(cat "$SECRETS_DIR/jwt_secret")
JWT_REFRESH_SECRET=$(cat "$SECRETS_DIR/jwt_refresh_secret")
JWT_EXPIRES_IN=1h
JWT_REFRESH_EXPIRES_IN=7d

# CORS Configuration
CORS_ORIGIN=https://yourdomain.com
CORS_CREDENTIALS=true

# MinIO Configuration
MINIO_ROOT_USER=simplepro-admin
MINIO_ROOT_PASSWORD=$(cat "$SECRETS_DIR/minio_password")
MINIO_BROWSER_REDIRECT_URL=https://yourdomain.com:9001

# Grafana Configuration
GRAFANA_ADMIN_USER=admin
GRAFANA_ADMIN_PASSWORD=$(cat "$SECRETS_DIR/grafana_password")

# SSL Configuration
SSL_ENABLED=true

# Monitoring Configuration
METRICS_ENABLED=true
PROMETHEUS_ENABLED=true

# Backup Configuration
BACKUP_ENABLED=true
BACKUP_SCHEDULE=0 2 * * *
BACKUP_RETENTION_DAYS=30

# Email Configuration (if needed)
# SMTP_HOST=smtp.gmail.com
# SMTP_PORT=587
# SMTP_USER=your-email@gmail.com
# SMTP_PASS=your-app-password

# External Services (if needed)
# SLACK_WEBHOOK_URL=https://hooks.slack.com/services/...
# WEBHOOK_SECRET=your-webhook-secret
EOF

    chmod 600 "$ENV_FILE"
    log_success "Production environment file created: $ENV_FILE"
}

# Validate secrets
validate_secrets() {
    log_info "Validating secrets..."

    local errors=0

    # Check if secrets directory exists
    if [ ! -d "$SECRETS_DIR" ]; then
        log_error "Secrets directory not found: $SECRETS_DIR"
        ((errors++))
    fi

    # Check required secret files
    local required_secrets=("mongodb_password" "redis_password" "jwt_secret" "jwt_refresh_secret" "minio_password" "grafana_password")

    for secret in "${required_secrets[@]}"; do
        if [ ! -f "$SECRETS_DIR/$secret" ]; then
            log_error "Secret file not found: $secret"
            ((errors++))
        else
            # Check file permissions
            local perms=$(stat -c "%a" "$SECRETS_DIR/$secret" 2>/dev/null || stat -f "%A" "$SECRETS_DIR/$secret" 2>/dev/null)
            if [ "$perms" != "600" ]; then
                log_warning "Insecure permissions on $secret: $perms (should be 600)"
            fi

            # Check file is not empty
            if [ ! -s "$SECRETS_DIR/$secret" ]; then
                log_error "Secret file is empty: $secret"
                ((errors++))
            fi
        fi
    done

    if [ $errors -eq 0 ]; then
        log_success "All secrets validated successfully"
        return 0
    else
        log_error "Found $errors validation errors"
        return 1
    fi
}

# Rotate secrets (for periodic security updates)
rotate_secrets() {
    log_info "Rotating secrets..."

    # Backup current secrets
    local backup_dir="$SECRETS_DIR/backup-$(date +%Y%m%d-%H%M%S)"
    mkdir -p "$backup_dir"
    cp "$SECRETS_DIR"/*.* "$backup_dir/" 2>/dev/null || true

    # Generate new secrets
    generate_secrets
    create_production_env

    log_warning "Secrets rotated. Old secrets backed up to: $backup_dir"
    log_warning "Remember to restart all services with new secrets!"
}

# Clean up old backups
cleanup_old_backups() {
    log_info "Cleaning up old secret backups..."

    # Remove backups older than 30 days
    find "$SECRETS_DIR" -name "backup-*" -type d -mtime +30 -exec rm -rf {} + 2>/dev/null || true

    log_success "Old backups cleaned up"
}

# Main function
main() {
    case "${1:-setup}" in
        "setup")
            log_info "Setting up SimplePro secrets management..."
            create_secrets_dir
            generate_secrets
            create_production_env
            validate_secrets
            log_success "Secrets management setup complete!"
            ;;
        "validate")
            validate_secrets
            ;;
        "rotate")
            rotate_secrets
            ;;
        "cleanup")
            cleanup_old_backups
            ;;
        "help"|"-h"|"--help")
            echo "SimplePro Secrets Management"
            echo ""
            echo "Usage: $0 [command]"
            echo ""
            echo "Commands:"
            echo "  setup      Setup secrets for first time (default)"
            echo "  validate   Validate existing secrets"
            echo "  rotate     Rotate all secrets (creates backup)"
            echo "  cleanup    Remove old secret backups"
            echo "  help       Show this help message"
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