#!/bin/bash

# SimplePro Staging Environment Cleanup Script
# Safely removes staging environment and optionally data volumes

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
MAGENTA='\033[0;35m'
NC='\033[0m' # No Color

# Configuration
COMPOSE_FILE="docker-compose.staging.yml"
NETWORK_NAME="simplepro-staging-network"

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

# Change to project root
cd "$PROJECT_ROOT"

# Banner
show_banner() {
    cat << "EOF"
╔═══════════════════════════════════════════════════════════════════╗
║                                                                   ║
║   SimplePro-v3 Staging Environment Cleanup                       ║
║   Safely remove staging containers and resources                 ║
║                                                                   ║
╚═══════════════════════════════════════════════════════════════════╝

EOF
}

# Check if staging is running
check_staging() {
    log_step "Checking staging environment status..."

    if docker-compose -f "$COMPOSE_FILE" ps -q 2>/dev/null | grep -q .; then
        log_info "Staging environment is currently running"
        docker-compose -f "$COMPOSE_FILE" ps
        echo ""
        return 0
    else
        log_warning "Staging environment is not running"
        return 1
    fi
}

# Stop services
stop_services() {
    log_step "Stopping staging services..."

    if docker-compose -f "$COMPOSE_FILE" ps -q 2>/dev/null | grep -q .; then
        docker-compose -f "$COMPOSE_FILE" stop
        log_success "Services stopped"
    else
        log_info "No running services to stop"
    fi
    echo ""
}

# Remove containers
remove_containers() {
    log_step "Removing staging containers..."

    if docker-compose -f "$COMPOSE_FILE" ps -aq 2>/dev/null | grep -q .; then
        docker-compose -f "$COMPOSE_FILE" rm -f
        log_success "Containers removed"
    else
        log_info "No containers to remove"
    fi
    echo ""
}

# Remove network
remove_network() {
    log_step "Removing staging network..."

    if docker network ls | grep -q "$NETWORK_NAME"; then
        docker network rm "$NETWORK_NAME" 2>/dev/null || log_warning "Network may still be in use"
        log_success "Network removed"
    else
        log_info "Network does not exist"
    fi
    echo ""
}

# Remove volumes
remove_volumes() {
    log_step "Removing staging volumes..."

    local volumes=(
        "simplepro-mongodb-staging"
        "simplepro-redis-staging"
        "simplepro-minio-staging"
        "simplepro-prometheus-staging"
        "simplepro-grafana-staging"
        "simplepro-nginx-logs-staging"
        "simplepro-api-logs-staging"
        "simplepro-api-uploads-staging"
    )

    local removed=0
    for volume in "${volumes[@]}"; do
        if docker volume ls | grep -q "$volume"; then
            docker volume rm "$volume" 2>/dev/null && {
                log_info "Removed volume: $volume"
                ((removed++))
            } || log_warning "Could not remove volume: $volume (may be in use)"
        fi
    done

    if [ $removed -gt 0 ]; then
        log_success "Removed $removed volume(s)"
    else
        log_info "No volumes to remove"
    fi
    echo ""
}

# Remove images
remove_images() {
    log_step "Removing staging images..."

    local images=(
        "simplepro/api:staging"
        "simplepro/web:staging"
    )

    local removed=0
    for image in "${images[@]}"; do
        if docker images | grep -q "$image"; then
            docker rmi "$image" 2>/dev/null && {
                log_info "Removed image: $image"
                ((removed++))
            } || log_warning "Could not remove image: $image (may be in use)"
        fi
    done

    if [ $removed -gt 0 ]; then
        log_success "Removed $removed image(s)"
    else
        log_info "No images to remove"
    fi
    echo ""
}

# Remove secrets (with confirmation)
remove_secrets() {
    log_step "Removing staging secrets..."

    if [ -d ".secrets/staging" ]; then
        log_warning "This will permanently delete all staging secrets!"
        read -p "Are you sure? (y/N): " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            rm -rf .secrets/staging
            log_success "Secrets removed"
        else
            log_info "Secrets preserved"
        fi
    else
        log_info "No secrets to remove"
    fi
    echo ""
}

# Quick cleanup (containers only)
quick_cleanup() {
    show_banner
    log_info "Performing quick cleanup (containers and network only)..."
    echo ""

    check_staging || true
    stop_services
    remove_containers
    remove_network

    log_success "Quick cleanup complete!"
    log_info "Data volumes and images have been preserved."
    echo ""
}

# Full cleanup (everything except secrets)
full_cleanup() {
    show_banner
    log_info "Performing full cleanup (containers, network, volumes, images)..."
    echo ""

    check_staging || true
    stop_services
    remove_containers
    remove_network
    remove_volumes
    remove_images

    log_success "Full cleanup complete!"
    log_info "Secrets have been preserved in .secrets/staging"
    log_warning "To remove secrets, run: $0 --remove-secrets"
    echo ""
}

# Complete cleanup (including secrets)
complete_cleanup() {
    show_banner
    log_error "WARNING: This will remove EVERYTHING including secrets!"
    log_warning "This action cannot be undone."
    echo ""
    read -p "Type 'DELETE STAGING' to confirm: " -r
    echo

    if [ "$REPLY" = "DELETE STAGING" ]; then
        log_info "Performing complete cleanup..."
        echo ""

        check_staging || true
        stop_services
        remove_containers
        remove_network
        remove_volumes
        remove_images
        remove_secrets

        log_success "Complete cleanup finished!"
        log_info "All staging resources have been removed."
        echo ""
    else
        log_error "Cleanup cancelled - confirmation text did not match"
        exit 1
    fi
}

# Show status
show_status() {
    show_banner
    log_info "Staging Environment Status"
    echo ""

    log_step "Running Containers:"
    docker-compose -f "$COMPOSE_FILE" ps 2>/dev/null || echo "  None"
    echo ""

    log_step "Staging Volumes:"
    docker volume ls | grep staging || echo "  None"
    echo ""

    log_step "Staging Images:"
    docker images | grep simplepro | grep staging || echo "  None"
    echo ""

    log_step "Staging Network:"
    docker network ls | grep staging || echo "  None"
    echo ""

    log_step "Staging Secrets:"
    if [ -d ".secrets/staging" ]; then
        echo "  .secrets/staging exists ($(du -sh .secrets/staging 2>/dev/null | cut -f1))"
    else
        echo "  None"
    fi
    echo ""
}

# Main help
show_help() {
    cat << EOF
SimplePro Staging Environment Cleanup

Usage: $0 [command]

Commands:
  quick           Stop and remove containers and network (default)
                  Preserves: volumes, images, secrets

  full            Remove containers, network, volumes, and images
                  Preserves: secrets

  complete        Remove EVERYTHING including secrets
                  WARNING: This cannot be undone!

  status          Show current staging environment status

  --remove-secrets  Remove only the secrets directory

  help            Show this help message

Examples:
  $0              # Quick cleanup
  $0 quick        # Same as above
  $0 full         # Remove everything except secrets
  $0 complete     # Remove absolutely everything
  $0 status       # Check what's currently deployed

Safety:
  - Quick cleanup is safe and can be run anytime
  - Full cleanup requires confirmation for volumes
  - Complete cleanup requires typing 'DELETE STAGING'

After cleanup, you can redeploy with:
  ./scripts/setup-staging.sh

EOF
}

# Main execution
case "${1:-quick}" in
    "quick"|"")
        quick_cleanup
        ;;
    "full")
        full_cleanup
        ;;
    "complete")
        complete_cleanup
        ;;
    "status")
        show_status
        ;;
    "--remove-secrets")
        show_banner
        remove_secrets
        ;;
    "help"|"-h"|"--help")
        show_help
        ;;
    *)
        log_error "Unknown command: $1"
        echo ""
        show_help
        exit 1
        ;;
esac
