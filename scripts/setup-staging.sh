#!/bin/bash

# SimplePro Staging Environment Setup Script
# This script sets up a complete staging environment for testing production deployment

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
MAGENTA='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Configuration
ENVIRONMENT="staging"
COMPOSE_FILE="docker-compose.staging.yml"
NETWORK_NAME="simplepro-staging-network"
SECRETS_DIR=".secrets/staging"
DATA_DIR="./data/staging"

# Timeouts (in seconds)
INFRASTRUCTURE_TIMEOUT=120
API_TIMEOUT=90
WEB_TIMEOUT=60

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

log_step() {
    echo -e "${MAGENTA}[STEP]${NC} $1"
}

log_detail() {
    echo -e "${CYAN}  →${NC} $1"
}

# Banner
show_banner() {
    cat << "EOF"
╔═══════════════════════════════════════════════════════════════════╗
║                                                                   ║
║   SimplePro-v3 Staging Environment Setup                         ║
║   Production-like environment for deployment testing             ║
║                                                                   ║
╚═══════════════════════════════════════════════════════════════════╝

EOF
}

# Change to project root
cd "$PROJECT_ROOT"

# Check prerequisites
check_prerequisites() {
    log_step "Checking prerequisites..."

    local failed=0

    # Check Docker
    if command -v docker &> /dev/null; then
        local docker_version=$(docker --version | grep -oP '\d+\.\d+\.\d+' | head -1)
        log_success "Docker found: $docker_version"
    else
        log_error "Docker is not installed"
        failed=1
    fi

    # Check Docker Compose
    if command -v docker-compose &> /dev/null; then
        local compose_version=$(docker-compose --version | grep -oP '\d+\.\d+\.\d+' | head -1)
        log_success "Docker Compose found: $compose_version"
    else
        log_error "Docker Compose is not installed"
        failed=1
    fi

    # Check Docker daemon
    if docker info &> /dev/null; then
        log_success "Docker daemon is running"
    else
        log_error "Docker daemon is not running"
        failed=1
    fi

    # Check curl
    if command -v curl &> /dev/null; then
        log_success "curl found"
    else
        log_error "curl is not installed"
        failed=1
    fi

    # Check available disk space (need at least 10GB)
    local available_space=$(df -BG . | awk 'NR==2 {print $4}' | sed 's/G//')
    if [ "$available_space" -gt 10 ]; then
        log_success "Sufficient disk space: ${available_space}GB available"
    else
        log_warning "Low disk space: only ${available_space}GB available (10GB+ recommended)"
    fi

    # Check available memory
    if command -v free &> /dev/null; then
        local available_mem=$(free -g | awk 'NR==2 {print $7}')
        if [ "$available_mem" -gt 4 ]; then
            log_success "Sufficient memory: ${available_mem}GB available"
        else
            log_warning "Low memory: only ${available_mem}GB available (4GB+ recommended)"
        fi
    fi

    if [ $failed -eq 1 ]; then
        log_error "Prerequisites check failed. Please install missing dependencies."
        exit 1
    fi

    log_success "All prerequisites met"
    echo ""
}

# Check port availability
check_ports() {
    log_step "Checking port availability..."

    local ports=(80 443 3001 3009 27017 6379 9000 9001 9090 3000 9216 9121 9100)
    local failed=0

    for port in "${ports[@]}"; do
        if netstat -tuln 2>/dev/null | grep -q ":$port " || ss -tuln 2>/dev/null | grep -q ":$port "; then
            log_error "Port $port is already in use"
            failed=1
        else
            log_detail "Port $port is available"
        fi
    done

    if [ $failed -eq 1 ]; then
        log_warning "Some ports are in use. You may need to stop conflicting services."
        read -p "Continue anyway? (y/N): " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            exit 1
        fi
    else
        log_success "All required ports are available"
    fi

    echo ""
}

# Create required directories
create_directories() {
    log_step "Creating required directories..."

    local directories=(
        "$DATA_DIR/mongodb"
        "$DATA_DIR/redis"
        "$DATA_DIR/minio"
        "$DATA_DIR/prometheus"
        "$DATA_DIR/grafana"
        "$DATA_DIR/nginx/logs"
        "backups/staging"
        "docker/ssl"
        "logs/staging"
    )

    for dir in "${directories[@]}"; do
        if [ ! -d "$dir" ]; then
            mkdir -p "$dir"
            log_detail "Created: $dir"
        else
            log_detail "Exists: $dir"
        fi
    done

    log_success "Directory structure ready"
    echo ""
}

# Generate staging secrets
generate_secrets() {
    log_step "Generating staging secrets..."

    # Check if secrets already exist
    if [ -d "$SECRETS_DIR" ] && [ -f "$SECRETS_DIR/.env" ]; then
        log_warning "Staging secrets already exist"
        read -p "Regenerate secrets? (y/N): " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            log_info "Using existing secrets"
            echo ""
            return
        fi
    fi

    # Create secrets directory
    mkdir -p "$SECRETS_DIR"

    # Generate random secrets
    log_detail "Generating secure random secrets..."

    local jwt_secret=$(openssl rand -base64 32)
    local jwt_refresh_secret=$(openssl rand -base64 32)
    local mongodb_password=$(openssl rand -base64 24)
    local redis_password=$(openssl rand -base64 24)
    local minio_root_user="staging-admin"
    local minio_root_password=$(openssl rand -base64 24)
    local grafana_password=$(openssl rand -base64 16)

    # Create .env file for staging
    cat > "$SECRETS_DIR/.env" << EOF
# SimplePro Staging Environment Configuration
# Generated: $(date)
# IMPORTANT: This is for staging only, not for production

# Environment
NODE_ENV=staging
ENVIRONMENT=staging

# Build Info
BUILD_DATE=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
VCS_REF=$(git rev-parse --short HEAD 2>/dev/null || echo "unknown")
VERSION=1.0.0-staging

# MongoDB
MONGODB_USERNAME=admin
MONGODB_PASSWORD=$mongodb_password

# Redis
REDIS_PASSWORD=$redis_password

# JWT Secrets
JWT_SECRET=$jwt_secret
JWT_REFRESH_SECRET=$jwt_refresh_secret

# MinIO
MINIO_ROOT_USER=$minio_root_user
MINIO_ROOT_PASSWORD=$minio_root_password
MINIO_BROWSER_REDIRECT_URL=http://localhost:9001

# Grafana
GRAFANA_ADMIN_USER=admin
GRAFANA_ADMIN_PASSWORD=$grafana_password

# Application URLs
NEXT_PUBLIC_API_URL=http://localhost:3001
NEXT_PUBLIC_WS_URL=ws://localhost:3001
ALLOWED_ORIGINS=http://localhost:3009,http://localhost:3000,http://localhost,https://localhost

# Logging
LOG_LEVEL=debug
EOF

    # Set proper permissions
    chmod 600 "$SECRETS_DIR/.env"

    # Create individual secret files for Docker secrets
    echo -n "$jwt_secret" > "$SECRETS_DIR/jwt_secret"
    echo -n "$jwt_refresh_secret" > "$SECRETS_DIR/jwt_refresh_secret"
    echo -n "$mongodb_password" > "$SECRETS_DIR/mongodb_password"
    echo -n "$redis_password" > "$SECRETS_DIR/redis_password"
    echo -n "$minio_root_password" > "$SECRETS_DIR/minio_root_password"
    echo -n "$grafana_password" > "$SECRETS_DIR/grafana_password"

    # Set permissions on secret files
    chmod 600 "$SECRETS_DIR"/*

    log_success "Secrets generated and stored in $SECRETS_DIR"
    log_warning "Keep these secrets secure! Never commit to version control."

    # Display credentials for convenience
    echo ""
    log_info "Staging Credentials:"
    echo "  MongoDB: admin / <see $SECRETS_DIR/mongodb_password>"
    echo "  Redis: <see $SECRETS_DIR/redis_password>"
    echo "  MinIO: $minio_root_user / <see $SECRETS_DIR/minio_root_password>"
    echo "  Grafana: admin / <see $SECRETS_DIR/grafana_password>"
    echo ""
}

# Generate SSL certificates
generate_ssl_certificates() {
    log_step "Generating SSL certificates..."

    local ssl_dir="docker/ssl"

    if [ -f "$ssl_dir/cert.pem" ] && [ -f "$ssl_dir/key.pem" ]; then
        log_info "SSL certificates already exist"
        echo ""
        return
    fi

    # Generate self-signed certificate for staging
    log_detail "Creating self-signed SSL certificate..."

    openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
        -keyout "$ssl_dir/key.pem" \
        -out "$ssl_dir/cert.pem" \
        -subj "/C=US/ST=State/L=City/O=SimplePro/OU=Staging/CN=localhost" \
        2>/dev/null

    chmod 644 "$ssl_dir/cert.pem"
    chmod 600 "$ssl_dir/key.pem"

    log_success "SSL certificates generated (valid for 365 days)"
    log_warning "These are self-signed certificates for testing only"
    echo ""
}

# Create Docker network
create_network() {
    log_step "Creating Docker network..."

    if docker network ls | grep -q "$NETWORK_NAME"; then
        log_info "Network $NETWORK_NAME already exists"
    else
        docker network create "$NETWORK_NAME"
        log_success "Network $NETWORK_NAME created"
    fi

    echo ""
}

# Validate environment configuration
validate_environment() {
    log_step "Validating environment configuration..."

    # Source the secrets
    if [ -f "$SECRETS_DIR/.env" ]; then
        export $(grep -v '^#' "$SECRETS_DIR/.env" | xargs)
        log_success "Environment variables loaded"
    else
        log_error "Secrets file not found: $SECRETS_DIR/.env"
        exit 1
    fi

    # Check required variables
    local required_vars=(
        "MONGODB_PASSWORD"
        "REDIS_PASSWORD"
        "JWT_SECRET"
        "JWT_REFRESH_SECRET"
        "MINIO_ROOT_PASSWORD"
    )

    local failed=0
    for var in "${required_vars[@]}"; do
        if [ -z "${!var}" ]; then
            log_error "Required variable $var is not set"
            failed=1
        else
            log_detail "$var is set"
        fi
    done

    if [ $failed -eq 1 ]; then
        log_error "Environment validation failed"
        exit 1
    fi

    log_success "Environment configuration is valid"
    echo ""
}

# Pull Docker images
pull_images() {
    log_step "Pulling Docker images..."

    log_detail "This may take several minutes..."

    if docker-compose -f "$COMPOSE_FILE" pull 2>&1 | tee /tmp/staging-pull.log; then
        log_success "All images pulled successfully"
    else
        log_warning "Some images may not have been pulled (will be built locally)"
    fi

    echo ""
}

# Build application images
build_images() {
    log_step "Building application images..."

    log_detail "Building API and Web applications..."
    log_detail "This may take 5-10 minutes on first build..."

    # Build with no cache to ensure fresh build
    if docker-compose -f "$COMPOSE_FILE" build --no-cache 2>&1 | tee /tmp/staging-build.log; then
        log_success "All images built successfully"
    else
        log_error "Image build failed. Check /tmp/staging-build.log for details."
        exit 1
    fi

    echo ""
}

# Start infrastructure services
start_infrastructure() {
    log_step "Starting infrastructure services (MongoDB, Redis, MinIO)..."

    # Start infrastructure
    docker-compose -f "$COMPOSE_FILE" up -d mongodb redis minio

    log_detail "Waiting for services to initialize..."
    sleep 10

    log_success "Infrastructure services started"
    echo ""
}

# Wait for infrastructure health
wait_infrastructure() {
    log_step "Waiting for infrastructure health checks..."

    local services=("mongodb" "redis" "minio")
    local timeout=$INFRASTRUCTURE_TIMEOUT
    local elapsed=0
    local interval=5

    while [ $elapsed -lt $timeout ]; do
        local all_healthy=true

        for service in "${services[@]}"; do
            local container="simplepro-${service}-staging"

            if docker ps --filter "name=$container" --filter "health=healthy" --format "{{.Names}}" | grep -q "$container"; then
                log_detail "$service is healthy"
            else
                all_healthy=false
                log_detail "$service is starting..."
            fi
        done

        if [ "$all_healthy" = true ]; then
            log_success "All infrastructure services are healthy"
            echo ""
            return 0
        fi

        sleep $interval
        elapsed=$((elapsed + interval))
    done

    log_error "Infrastructure services failed to become healthy within ${timeout}s"
    log_info "Checking service logs..."
    docker-compose -f "$COMPOSE_FILE" logs --tail=50 mongodb redis minio
    exit 1
}

# Initialize databases
initialize_databases() {
    log_step "Initializing databases..."

    # Create MongoDB admin user (if not already created)
    log_detail "Configuring MongoDB..."
    docker exec simplepro-mongodb-staging mongosh --eval "db.adminCommand('ping')" > /dev/null 2>&1

    # Create MinIO buckets
    log_detail "Creating MinIO buckets..."
    docker exec simplepro-minio-staging mc alias set staging http://localhost:9000 "$MINIO_ROOT_USER" "$MINIO_ROOT_PASSWORD" > /dev/null 2>&1 || true
    docker exec simplepro-minio-staging mc mb staging/simplepro-documents --ignore-existing > /dev/null 2>&1 || true
    docker exec simplepro-minio-staging mc mb staging/simplepro-backups --ignore-existing > /dev/null 2>&1 || true

    # Test Redis
    log_detail "Testing Redis connection..."
    docker exec simplepro-redis-staging redis-cli -a "$REDIS_PASSWORD" ping > /dev/null 2>&1

    log_success "Databases initialized"
    echo ""
}

# Start application services
start_applications() {
    log_step "Starting application services (API, Web)..."

    docker-compose -f "$COMPOSE_FILE" up -d api web

    log_detail "Applications starting..."
    sleep 5

    log_success "Application services started"
    echo ""
}

# Wait for API health
wait_api() {
    log_step "Waiting for API health check..."

    local timeout=$API_TIMEOUT
    local elapsed=0
    local interval=5

    while [ $elapsed -lt $timeout ]; do
        if curl -f http://localhost:3001/api/health > /dev/null 2>&1; then
            log_success "API is healthy"
            echo ""
            return 0
        fi

        log_detail "API is starting... (${elapsed}s elapsed)"
        sleep $interval
        elapsed=$((elapsed + interval))
    done

    log_error "API failed to become healthy within ${timeout}s"
    log_info "Checking API logs..."
    docker-compose -f "$COMPOSE_FILE" logs --tail=100 api
    exit 1
}

# Wait for Web health
wait_web() {
    log_step "Waiting for Web application health check..."

    local timeout=$WEB_TIMEOUT
    local elapsed=0
    local interval=5

    while [ $elapsed -lt $timeout ]; do
        if curl -f http://localhost:3009/ > /dev/null 2>&1; then
            log_success "Web application is healthy"
            echo ""
            return 0
        fi

        log_detail "Web is starting... (${elapsed}s elapsed)"
        sleep $interval
        elapsed=$((elapsed + interval))
    done

    log_error "Web failed to become healthy within ${timeout}s"
    log_info "Checking Web logs..."
    docker-compose -f "$COMPOSE_FILE" logs --tail=100 web
    exit 1
}

# Start proxy and monitoring
start_monitoring() {
    log_step "Starting Nginx and monitoring services..."

    docker-compose -f "$COMPOSE_FILE" up -d nginx prometheus grafana
    docker-compose -f "$COMPOSE_FILE" up -d mongodb-exporter redis-exporter node-exporter

    log_detail "Waiting for services to initialize..."
    sleep 10

    log_success "Proxy and monitoring services started"
    echo ""
}

# Display service status
show_status() {
    log_step "Service Status"
    echo ""

    docker-compose -f "$COMPOSE_FILE" ps

    echo ""
}

# Display access information
show_access_info() {
    cat << "EOF"

╔═══════════════════════════════════════════════════════════════════╗
║                  Staging Environment Ready!                       ║
╚═══════════════════════════════════════════════════════════════════╝

EOF

    log_success "Staging environment is up and running!"
    echo ""
    log_info "Access URLs:"
    echo "  Web Application:    http://localhost:3009"
    echo "                      https://localhost (via Nginx)"
    echo ""
    echo "  API:                http://localhost:3001"
    echo "  API Docs:           http://localhost:3001/api/docs"
    echo ""
    echo "  MinIO Console:      http://localhost:9001"
    echo "  Prometheus:         http://localhost:9090"
    echo "  Grafana:            http://localhost:3000"
    echo ""

    log_info "Default Credentials:"
    echo "  Application:        admin / Admin123!"
    echo "  MinIO:              $MINIO_ROOT_USER / <see $SECRETS_DIR/minio_root_password>"
    echo "  Grafana:            admin / <see $SECRETS_DIR/grafana_password>"
    echo ""

    log_info "Next Steps:"
    echo "  1. Run smoke tests:    ./scripts/smoke-test-staging.sh"
    echo "  2. View logs:          docker-compose -f $COMPOSE_FILE logs -f"
    echo "  3. Stop environment:   docker-compose -f $COMPOSE_FILE down"
    echo ""

    log_warning "Important Notes:"
    echo "  - This is a staging environment with self-signed SSL certificates"
    echo "  - Your browser will show security warnings for HTTPS - this is expected"
    echo "  - Secrets are stored in: $SECRETS_DIR"
    echo "  - Data persists in: $DATA_DIR"
    echo ""
}

# Cleanup function
cleanup_on_error() {
    log_error "Setup failed. Cleaning up..."
    docker-compose -f "$COMPOSE_FILE" down
    exit 1
}

# Main setup function
main() {
    show_banner

    # Set up error handling
    trap cleanup_on_error ERR

    # Execute setup steps
    check_prerequisites
    check_ports
    create_directories
    generate_secrets
    generate_ssl_certificates
    create_network
    validate_environment
    pull_images
    build_images
    start_infrastructure
    wait_infrastructure
    initialize_databases
    start_applications
    wait_api
    wait_web
    start_monitoring
    show_status
    show_access_info

    log_success "Staging environment setup complete!"
}

# Handle command line arguments
case "${1:-setup}" in
    "setup"|"")
        main
        ;;
    "--check-prereqs")
        check_prerequisites
        ;;
    "--generate-secrets")
        generate_secrets
        ;;
    "--create-directories")
        create_directories
        ;;
    "--wait-infrastructure")
        wait_infrastructure
        ;;
    "--init-databases")
        initialize_databases
        ;;
    "--wait-api")
        wait_api
        ;;
    "--wait-web")
        wait_web
        ;;
    "--status")
        show_status
        ;;
    "help"|"-h"|"--help")
        cat << EOF
SimplePro Staging Environment Setup

Usage: $0 [command]

Commands:
  setup                 Run full staging environment setup (default)
  --check-prereqs       Check prerequisites only
  --generate-secrets    Generate secrets only
  --create-directories  Create directory structure only
  --wait-infrastructure Wait for infrastructure services
  --init-databases      Initialize databases
  --wait-api            Wait for API health check
  --wait-web            Wait for Web health check
  --status              Show service status
  help                  Show this help message

Examples:
  $0                    # Full setup
  $0 --check-prereqs    # Check if system is ready
  $0 --status           # Show current status

EOF
        ;;
    *)
        log_error "Unknown command: $1"
        echo "Use '$0 help' for usage information"
        exit 1
        ;;
esac
