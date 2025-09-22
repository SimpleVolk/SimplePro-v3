#!/bin/bash

# SimplePro Production Deployment Script
# This script deploys SimplePro to production with full validation and monitoring

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

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

# Change to project root
cd "$PROJECT_ROOT"

# Configuration
ENVIRONMENT="${ENVIRONMENT:-production}"
BACKUP_BEFORE_DEPLOY="${BACKUP_BEFORE_DEPLOY:-true}"
HEALTH_CHECK_TIMEOUT="${HEALTH_CHECK_TIMEOUT:-300}"
ROLLBACK_ON_FAILURE="${ROLLBACK_ON_FAILURE:-true}"

# Pre-deployment validation
pre_deployment_validation() {
    log_info "Running pre-deployment validation..."

    # Run environment validation
    if ! "$SCRIPT_DIR/validate-environment.sh"; then
        log_error "Environment validation failed. Aborting deployment."
        exit 1
    fi

    log_success "Pre-deployment validation completed"
}

# Setup secrets and environment
setup_environment() {
    log_info "Setting up production environment..."

    # Setup secrets if they don't exist
    if [ ! -d "$PROJECT_ROOT/.secrets" ]; then
        log_info "Setting up secrets for first time..."
        "$SCRIPT_DIR/secrets-management.sh" setup
    else
        log_info "Validating existing secrets..."
        "$SCRIPT_DIR/secrets-management.sh" validate
    fi

    # Generate SSL certificates if they don't exist
    if [ ! -f "$PROJECT_ROOT/docker/ssl/cert.pem" ]; then
        log_info "Generating SSL certificates..."
        chmod +x "$PROJECT_ROOT/docker/ssl/generate-certs.sh"
        "$PROJECT_ROOT/docker/ssl/generate-certs.sh"
    fi

    log_success "Environment setup completed"
}

# Create backup before deployment
create_backup() {
    if [ "$BACKUP_BEFORE_DEPLOY" = "true" ]; then
        log_info "Creating backup before deployment..."

        # Check if system is already running for backup
        if docker ps --filter "name=simplepro-mongodb-prod" --format "{{.Names}}" | grep -q "simplepro-mongodb-prod"; then
            "$SCRIPT_DIR/backup-restore.sh" backup
            log_success "Pre-deployment backup completed"
        else
            log_warning "System not running, skipping backup"
        fi
    else
        log_info "Backup before deployment is disabled"
    fi
}

# Build and deploy services
deploy_services() {
    log_info "Deploying SimplePro production services..."

    # Build applications first
    log_info "Building applications..."
    npm run build

    # Stop existing services gracefully
    if docker-compose -f docker-compose.prod.yml ps -q >/dev/null 2>&1; then
        log_info "Stopping existing services..."
        docker-compose -f docker-compose.prod.yml down --timeout 30
    fi

    # Pull latest images and build
    log_info "Building and starting services..."
    docker-compose -f docker-compose.prod.yml build --no-cache
    docker-compose -f docker-compose.prod.yml up -d

    log_success "Services deployment initiated"
}

# Wait for services to be healthy
wait_for_services() {
    log_info "Waiting for services to become healthy..."

    local timeout=$HEALTH_CHECK_TIMEOUT
    local elapsed=0
    local interval=10

    while [ $elapsed -lt $timeout ]; do
        local healthy_services=0
        local total_services=0

        # Check each service health
        for service in api web mongodb redis nginx; do
            ((total_services++))
            local container_name="simplepro-${service}-prod"

            if docker ps --filter "name=$container_name" --filter "health=healthy" --format "{{.Names}}" | grep -q "$container_name"; then
                ((healthy_services++))
            elif docker ps --filter "name=$container_name" --filter "health=starting" --format "{{.Names}}" | grep -q "$container_name"; then
                log_info "Service $service is starting..."
            else
                log_warning "Service $service health check failed"
            fi
        done

        if [ $healthy_services -eq $total_services ]; then
            log_success "All services are healthy"
            return 0
        fi

        log_info "Waiting for services... ($healthy_services/$total_services healthy)"
        sleep $interval
        ((elapsed += interval))
    done

    log_error "Services failed to become healthy within ${timeout}s"
    return 1
}

# Run comprehensive health checks
run_health_checks() {
    log_info "Running comprehensive health checks..."

    # Test API endpoints
    local api_tests=(
        "http://localhost:4000/api/health"
        "https://localhost/api/health"
    )

    for endpoint in "${api_tests[@]}"; do
        if curl -f -k "$endpoint" >/dev/null 2>&1; then
            log_success "API health check passed: $endpoint"
        else
            log_error "API health check failed: $endpoint"
            return 1
        fi
    done

    # Test web application
    local web_tests=(
        "http://localhost:3000/health"
        "https://localhost/health"
    )

    for endpoint in "${web_tests[@]}"; do
        if curl -f -k "$endpoint" >/dev/null 2>&1; then
            log_success "Web health check passed: $endpoint"
        else
            log_error "Web health check failed: $endpoint"
            return 1
        fi
    done

    # Test database connectivity
    if docker exec simplepro-mongodb-prod mongosh --eval "db.adminCommand('ping')" >/dev/null 2>&1; then
        log_success "MongoDB connectivity check passed"
    else
        log_error "MongoDB connectivity check failed"
        return 1
    fi

    # Test Redis connectivity
    if docker exec simplepro-redis-prod redis-cli ping >/dev/null 2>&1; then
        log_success "Redis connectivity check passed"
    else
        log_error "Redis connectivity check failed"
        return 1
    fi

    log_success "Health checks completed successfully"
}

# Post-deployment tasks
post_deployment_tasks() {
    log_info "Running post-deployment tasks..."

    # Create initial backup after successful deployment
    "$SCRIPT_DIR/backup-restore.sh" backup

    # Display deployment summary
    cat << EOF

========================================
SimplePro Production Deployment Summary
========================================

Deployment Date: $(date)
Environment: $ENVIRONMENT
Status: SUCCESS

Services Running:
$(docker-compose -f docker-compose.prod.yml ps)

Access URLs:
- Web Application: https://localhost
- API Documentation: https://localhost/api
- Grafana Dashboard: http://localhost:3001
- Prometheus Metrics: http://localhost:9090
- MinIO Console: http://localhost:9001

Next Steps:
1. Configure domain name and SSL certificates for production
2. Set up monitoring alerts and notifications
3. Configure automated backups
4. Review security settings
5. Set up log aggregation

For support documentation, see: $PROJECT_ROOT/docs/
========================================

EOF

    log_success "Post-deployment tasks completed"
}

# Main deployment function
main() {
    echo "SimplePro Production Deployment"
    echo "==============================="
    echo ""

    log_info "Starting production deployment process..."

    # Deployment steps
    pre_deployment_validation
    setup_environment
    create_backup
    deploy_services
    wait_for_services
    run_health_checks
    post_deployment_tasks

    log_success "SimplePro production deployment completed successfully!"
}

# Handle command line arguments
case "${1:-deploy}" in
    "deploy"|"")
        main
        ;;
    "health")
        run_health_checks
        ;;
    "help"|"-h"|"--help")
        echo "SimplePro Production Deployment"
        echo ""
        echo "Usage: $0 [command]"
        echo ""
        echo "Commands:"
        echo "  deploy      Run full production deployment (default)"
        echo "  health      Run health checks only"
        echo "  help        Show this help message"
        echo ""
        echo "Environment Variables:"
        echo "  ENVIRONMENT              Deployment environment (default: production)"
        echo "  BACKUP_BEFORE_DEPLOY     Create backup before deploy (default: true)"
        echo "  HEALTH_CHECK_TIMEOUT     Health check timeout in seconds (default: 300)"
        echo "  ROLLBACK_ON_FAILURE      Rollback on deployment failure (default: true)"
        echo ""
        ;;
    *)
        log_error "Unknown command: $1"
        echo "Use '$0 help' for usage information"
        exit 1
        ;;
esac