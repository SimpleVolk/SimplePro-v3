#!/bin/bash

# SimplePro Production Deployment Script
# This script handles production deployment with health checks and rollback capability

set -e  # Exit on error

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}SimplePro Production Deployment${NC}"
echo "=================================="
echo ""

# Check prerequisites
check_prerequisites() {
    echo "Checking prerequisites..."

    if ! command -v docker &> /dev/null; then
        echo -e "${RED}✗ Docker is not installed${NC}"
        exit 1
    fi

    if ! command -v docker-compose &> /dev/null; then
        echo -e "${RED}✗ Docker Compose is not installed${NC}"
        exit 1
    fi

    if [ ! -f .env.production ]; then
        echo -e "${RED}✗ .env.production file not found${NC}"
        echo "  Copy .env.production.example and configure it"
        exit 1
    fi

    echo -e "${GREEN}✓ Prerequisites check passed${NC}"
    echo ""
}

# Create required directories
setup_directories() {
    echo "Setting up directories..."

    mkdir -p data/mongodb data/redis data/minio backups logs
    chmod 755 data backups logs

    echo -e "${GREEN}✓ Directories created${NC}"
    echo ""
}

# Load environment variables
load_environment() {
    echo "Loading environment..."

    if [ -f .env.production ]; then
        set -a
        source .env.production
        set +a
        echo -e "${GREEN}✓ Environment loaded${NC}"
    else
        echo -e "${RED}✗ .env.production not found${NC}"
        exit 1
    fi
    echo ""
}

# Backup current deployment
backup_deployment() {
    echo "Creating backup..."

    BACKUP_DIR="backups/pre-deployment-$(date +%Y%m%d-%H%M%S)"
    mkdir -p "$BACKUP_DIR"

    # Backup docker-compose state
    docker-compose -f docker-compose.prod.yml ps > "$BACKUP_DIR/containers.txt" 2>&1 || true

    # Backup MongoDB
    if docker-compose -f docker-compose.prod.yml ps | grep -q mongodb; then
        echo "  Backing up MongoDB..."
        docker-compose -f docker-compose.prod.yml exec -T mongodb \
            mongodump --username admin --password "$MONGODB_PASSWORD" \
            --authenticationDatabase admin --archive > "$BACKUP_DIR/mongodb.archive" 2>/dev/null || true
    fi

    echo -e "${GREEN}✓ Backup created at $BACKUP_DIR${NC}"
    echo ""
}

# Deploy services
deploy_services() {
    echo "Deploying services..."

    # Pull latest images (if using registry)
    # docker-compose -f docker-compose.prod.yml pull

    # Build images
    echo "  Building images..."
    docker-compose -f docker-compose.prod.yml build --parallel

    # Start infrastructure services first
    echo "  Starting infrastructure..."
    docker-compose -f docker-compose.prod.yml up -d mongodb redis minio

    # Wait for infrastructure to be healthy
    echo "  Waiting for infrastructure (60s)..."
    sleep 60

    # Deploy API
    echo "  Deploying API..."
    docker-compose -f docker-compose.prod.yml up -d --no-deps api

    # Wait for API health check
    echo "  Waiting for API to be healthy (30s)..."
    sleep 30

    # Deploy Web
    echo "  Deploying Web..."
    docker-compose -f docker-compose.prod.yml up -d --no-deps web

    # Deploy remaining services
    echo "  Deploying monitoring services..."
    docker-compose -f docker-compose.prod.yml up -d

    echo -e "${GREEN}✓ Services deployed${NC}"
    echo ""
}

# Health checks
run_health_checks() {
    echo "Running health checks..."

    local failed=0

    # Check API
    echo -n "  API: "
    if curl -sf http://localhost:3001/api/health > /dev/null 2>&1; then
        echo -e "${GREEN}✓ Healthy${NC}"
    else
        echo -e "${RED}✗ Failed${NC}"
        failed=1
    fi

    # Check Web
    echo -n "  Web: "
    if curl -sf http://localhost:3009/ > /dev/null 2>&1; then
        echo -e "${GREEN}✓ Healthy${NC}"
    else
        echo -e "${RED}✗ Failed${NC}"
        failed=1
    fi

    # Check MongoDB
    echo -n "  MongoDB: "
    if docker-compose -f docker-compose.prod.yml exec -T mongodb mongosh --eval "db.adminCommand('ping')" > /dev/null 2>&1; then
        echo -e "${GREEN}✓ Healthy${NC}"
    else
        echo -e "${RED}✗ Failed${NC}"
        failed=1
    fi

    # Check Redis
    echo -n "  Redis: "
    if docker-compose -f docker-compose.prod.yml exec -T redis redis-cli -a "$REDIS_PASSWORD" ping > /dev/null 2>&1; then
        echo -e "${GREEN}✓ Healthy${NC}"
    else
        echo -e "${RED}✗ Failed${NC}"
        failed=1
    fi

    echo ""

    if [ $failed -eq 1 ]; then
        echo -e "${RED}✗ Health checks failed${NC}"
        return 1
    else
        echo -e "${GREEN}✓ All health checks passed${NC}"
        return 0
    fi
}

# Show deployment status
show_status() {
    echo ""
    echo -e "${BLUE}Deployment Status${NC}"
    echo "=================="
    docker-compose -f docker-compose.prod.yml ps
    echo ""

    echo -e "${BLUE}Service URLs${NC}"
    echo "============"
    echo "  Web Dashboard: http://localhost:3009"
    echo "  API: http://localhost:3001"
    echo "  API Docs: http://localhost:3001/api/docs"
    echo "  GraphQL: http://localhost:3001/graphql"
    echo "  MinIO Console: http://localhost:9001"
    echo "  Grafana: http://localhost:3001"
    echo "  Prometheus: http://localhost:9090"
    echo ""
}

# Main deployment flow
main() {
    check_prerequisites
    setup_directories
    load_environment

    # Confirm deployment
    echo -e "${YELLOW}Ready to deploy to production.${NC}"
    echo "This will:"
    echo "  1. Create a backup of current deployment"
    echo "  2. Build and deploy new images"
    echo "  3. Run health checks"
    echo ""
    read -p "Continue? (yes/no): " confirm

    if [ "$confirm" != "yes" ]; then
        echo "Deployment cancelled"
        exit 0
    fi
    echo ""

    backup_deployment
    deploy_services

    echo "Waiting for services to stabilize (30s)..."
    sleep 30
    echo ""

    if run_health_checks; then
        show_status
        echo -e "${GREEN}✓✓✓ Deployment successful! ✓✓✓${NC}"
        echo ""
        echo "Next steps:"
        echo "  - Monitor logs: docker-compose -f docker-compose.prod.yml logs -f"
        echo "  - Check Grafana dashboards for metrics"
        echo "  - Run smoke tests if available"
        exit 0
    else
        echo -e "${RED}✗✗✗ Deployment failed health checks ✗✗✗${NC}"
        echo ""
        echo "Options:"
        echo "  1. Check logs: docker-compose -f docker-compose.prod.yml logs"
        echo "  2. Rollback: docker-compose -f docker-compose.prod.yml down && restore from backup"
        echo "  3. Debug: docker-compose -f docker-compose.prod.yml ps"
        exit 1
    fi
}

# Run main deployment
main
