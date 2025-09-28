#!/bin/bash

# Secure Deployment Script for SimplePro-v3
# This script helps deploy the application with proper network security

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Helper functions
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

# Function to check prerequisites
check_prerequisites() {
    log_info "Checking prerequisites..."

    # Check if Docker is installed and running
    if ! command -v docker &> /dev/null; then
        log_error "Docker is not installed. Please install Docker first."
        exit 1
    fi

    if ! docker info &> /dev/null; then
        log_error "Docker is not running. Please start Docker first."
        exit 1
    fi

    # Check if Docker Compose is available
    if ! command -v docker-compose &> /dev/null; then
        log_error "Docker Compose is not installed. Please install Docker Compose first."
        exit 1
    fi

    # Check if required files exist
    local mode=$1
    local compose_file

    if [ "$mode" = "dev" ]; then
        compose_file="docker-compose.dev-secure.yml"
    else
        compose_file="docker-compose.prod-secure.yml"
    fi

    if [ ! -f "$compose_file" ]; then
        log_error "Compose file not found: $compose_file"
        exit 1
    fi

    # Check if SSL certificates exist
    if [ ! -d "./docker/ssl" ]; then
        log_warning "SSL certificates directory not found. Creating self-signed certificates..."
        create_ssl_certificates
    fi

    log_success "Prerequisites check completed"
}

# Function to create self-signed SSL certificates for development
create_ssl_certificates() {
    log_info "Creating self-signed SSL certificates..."

    mkdir -p ./docker/ssl

    # Create self-signed certificate
    openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
        -keyout ./docker/ssl/key.pem \
        -out ./docker/ssl/cert.pem \
        -subj "/C=US/ST=State/L=City/O=Organization/CN=localhost" \
        -extensions v3_req \
        -config <(
cat <<EOF
[req]
default_bits = 2048
prompt = no
distinguished_name = req_distinguished_name
req_extensions = v3_req

[req_distinguished_name]
C=US
ST=State
L=City
O=SimplePro
CN=localhost

[v3_req]
basicConstraints = CA:FALSE
keyUsage = nonRepudiation, digitalSignature, keyEncipherment
subjectAltName = @alt_names

[alt_names]
DNS.1 = localhost
DNS.2 = *.localhost
IP.1 = 127.0.0.1
IP.2 = ::1
EOF
        ) 2>/dev/null

    if [ -f "./docker/ssl/cert.pem" ] && [ -f "./docker/ssl/key.pem" ]; then
        log_success "SSL certificates created successfully"
    else
        log_error "Failed to create SSL certificates"
        exit 1
    fi
}

# Function to setup environment variables
setup_environment() {
    local mode=$1

    log_info "Setting up environment variables for $mode mode..."

    # Create .env file if it doesn't exist
    local env_file=".env.${mode}"

    if [ ! -f "$env_file" ]; then
        log_info "Creating $env_file file..."

        if [ "$mode" = "dev" ]; then
            cat > "$env_file" <<EOF
# Development Environment Variables
NODE_ENV=development

# Database Configuration
MONGODB_PASSWORD=simplepro_dev_2024
REDIS_PASSWORD=simplepro_redis_2024

# JWT Configuration
JWT_SECRET=dev_jwt_secret_change_in_production
JWT_REFRESH_SECRET=dev_refresh_secret_change_in_production

# CORS Configuration
CORS_ORIGIN=http://localhost:80,https://localhost:443

# MinIO Configuration
MINIO_ROOT_USER=admin
MINIO_ROOT_PASSWORD=simplepro_minio_2024

# Development Admin Tools
MONGO_EXPRESS_PASSWORD=dev_admin_password

# Logging
LOG_LEVEL=debug
EOF
        else
            cat > "$env_file" <<EOF
# Production Environment Variables
NODE_ENV=production

# Database Configuration (CHANGE THESE IN PRODUCTION!)
MONGODB_USERNAME=admin
MONGODB_PASSWORD=CHANGE_THIS_SECURE_PASSWORD
REDIS_PASSWORD=CHANGE_THIS_SECURE_PASSWORD

# JWT Configuration (CHANGE THESE IN PRODUCTION!)
JWT_SECRET=CHANGE_THIS_SECURE_JWT_SECRET
JWT_REFRESH_SECRET=CHANGE_THIS_SECURE_REFRESH_SECRET

# Network Configuration
CORS_ORIGIN=https://yourdomain.com
DOMAIN_NAME=yourdomain.com
NEXT_PUBLIC_API_URL=https://yourdomain.com/api

# MinIO Configuration (CHANGE THESE IN PRODUCTION!)
MINIO_ROOT_USER=CHANGE_THIS_USERNAME
MINIO_ROOT_PASSWORD=CHANGE_THIS_SECURE_PASSWORD
MINIO_BROWSER_REDIRECT_URL=https://yourdomain.com/minio-console/

# Monitoring Configuration (CHANGE THESE IN PRODUCTION!)
GRAFANA_ADMIN_USER=admin
GRAFANA_ADMIN_PASSWORD=CHANGE_THIS_SECURE_PASSWORD
GRAFANA_ROOT_URL=https://yourdomain.com/grafana/

# Logging
LOG_LEVEL=info
EOF
        fi

        log_success "Environment file created: $env_file"

        if [ "$mode" = "prod" ]; then
            log_warning "IMPORTANT: Please update the production environment variables in $env_file"
            log_warning "All passwords and secrets must be changed before deployment!"
        fi
    else
        log_info "Environment file already exists: $env_file"
    fi
}

# Function to start services
start_services() {
    local mode=$1
    local compose_file

    if [ "$mode" = "dev" ]; then
        compose_file="docker-compose.dev-secure.yml"
    else
        compose_file="docker-compose.prod-secure.yml"
    fi

    log_info "Starting SimplePro-v3 in $mode mode..."
    log_info "Using compose file: $compose_file"

    # Load environment variables
    local env_file=".env.${mode}"
    if [ -f "$env_file" ]; then
        export $(grep -v '^#' "$env_file" | xargs)
        log_info "Loaded environment variables from $env_file"
    fi

    # Pull latest images
    log_info "Pulling latest images..."
    docker-compose -f "$compose_file" pull

    # Build and start services
    log_info "Building and starting services..."
    docker-compose -f "$compose_file" up -d --build

    # Wait for services to be healthy
    log_info "Waiting for services to be healthy..."
    local max_wait=300  # 5 minutes
    local wait_time=0

    while [ $wait_time -lt $max_wait ]; do
        if docker-compose -f "$compose_file" ps | grep -q "Up (healthy)"; then
            log_success "Services are healthy!"
            break
        fi

        if [ $wait_time -eq 0 ]; then
            log_info "Waiting for services to become healthy..."
        fi

        sleep 10
        wait_time=$((wait_time + 10))

        if [ $((wait_time % 60)) -eq 0 ]; then
            log_info "Still waiting... ($((wait_time / 60)) minute(s) elapsed)"
        fi
    done

    if [ $wait_time -ge $max_wait ]; then
        log_warning "Services took longer than expected to become healthy"
        log_info "You can check the status with: docker-compose -f $compose_file ps"
    fi

    # Show service status
    echo ""
    log_info "Service Status:"
    docker-compose -f "$compose_file" ps

    # Show access information
    echo ""
    log_info "=== Access Information ==="
    if [ "$mode" = "dev" ]; then
        echo "🌐 Main Application: https://localhost"
        echo "🔧 MinIO Console: http://localhost:9001 (localhost only)"
        echo "🗄️  Mongo Express: http://localhost:8081 (localhost only)"
    else
        echo "🌐 Main Application: https://localhost (or your domain)"
        echo "📊 Internal Monitoring: https://localhost/internal/monitoring/ (internal networks only)"
    fi

    echo ""
    log_success "SimplePro-v3 deployment completed in $mode mode!"
}

# Function to stop services
stop_services() {
    local mode=$1
    local compose_file

    if [ "$mode" = "dev" ]; then
        compose_file="docker-compose.dev-secure.yml"
    else
        compose_file="docker-compose.prod-secure.yml"
    fi

    log_info "Stopping SimplePro-v3 services..."

    docker-compose -f "$compose_file" down

    log_success "Services stopped successfully"
}

# Function to run security tests
run_security_tests() {
    local mode=$1

    log_info "Running security tests for $mode mode..."

    if [ -f "./scripts/network-security-test.sh" ]; then
        chmod +x ./scripts/network-security-test.sh
        ./scripts/network-security-test.sh "$mode" test
    else
        log_error "Security test script not found: ./scripts/network-security-test.sh"
        exit 1
    fi
}

# Function to show logs
show_logs() {
    local mode=$1
    local service=${2:-}
    local compose_file

    if [ "$mode" = "dev" ]; then
        compose_file="docker-compose.dev-secure.yml"
    else
        compose_file="docker-compose.prod-secure.yml"
    fi

    if [ -n "$service" ]; then
        log_info "Showing logs for service: $service"
        docker-compose -f "$compose_file" logs -f "$service"
    else
        log_info "Showing logs for all services"
        docker-compose -f "$compose_file" logs -f
    fi
}

# Function to clean up
cleanup() {
    local mode=$1
    local compose_file

    if [ "$mode" = "dev" ]; then
        compose_file="docker-compose.dev-secure.yml"
    else
        compose_file="docker-compose.prod-secure.yml"
    fi

    log_warning "This will remove all containers, networks, and volumes for $mode mode"
    read -p "Are you sure? (y/N): " -n 1 -r
    echo

    if [[ $REPLY =~ ^[Yy]$ ]]; then
        log_info "Cleaning up $mode environment..."
        docker-compose -f "$compose_file" down -v --remove-orphans
        docker system prune -f
        log_success "Cleanup completed"
    else
        log_info "Cleanup cancelled"
    fi
}

# Main function
main() {
    local mode=${1:-}
    local action=${2:-start}

    echo "=== SimplePro-v3 Secure Deployment Script ==="
    echo ""

    if [ -z "$mode" ]; then
        echo "Usage: $0 <dev|prod> [start|stop|restart|test|logs|cleanup] [service]"
        echo ""
        echo "Modes:"
        echo "  dev      - Development environment with debugging tools"
        echo "  prod     - Production environment with maximum security"
        echo ""
        echo "Actions:"
        echo "  start    - Start the environment (default)"
        echo "  stop     - Stop the environment"
        echo "  restart  - Restart the environment"
        echo "  test     - Run security tests"
        echo "  logs     - Show logs (optionally for specific service)"
        echo "  cleanup  - Remove all containers, networks, and volumes"
        echo ""
        echo "Examples:"
        echo "  $0 dev start           # Start development environment"
        echo "  $0 prod start          # Start production environment"
        echo "  $0 dev test            # Test development security"
        echo "  $0 prod logs nginx     # Show nginx logs in production"
        echo "  $0 dev cleanup         # Clean up development environment"
        exit 1
    fi

    if [ "$mode" != "dev" ] && [ "$mode" != "prod" ]; then
        log_error "Invalid mode: $mode. Use 'dev' or 'prod'"
        exit 1
    fi

    case "$action" in
        start)
            check_prerequisites "$mode"
            setup_environment "$mode"
            start_services "$mode"
            ;;
        stop)
            stop_services "$mode"
            ;;
        restart)
            stop_services "$mode"
            sleep 2
            start_services "$mode"
            ;;
        test)
            run_security_tests "$mode"
            ;;
        logs)
            show_logs "$mode" "${3:-}"
            ;;
        cleanup)
            cleanup "$mode"
            ;;
        *)
            log_error "Invalid action: $action"
            exit 1
            ;;
    esac
}

# Run main function with all arguments
main "$@"