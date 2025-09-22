#!/bin/bash

# SimplePro Environment Validation Script
# This script validates the deployment environment and configuration

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Counters
CHECKS_PASSED=0
CHECKS_FAILED=0
WARNINGS=0

# Logging functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[PASS]${NC} $1"
    ((CHECKS_PASSED++))
}

log_warning() {
    echo -e "${YELLOW}[WARN]${NC} $1"
    ((WARNINGS++))
}

log_error() {
    echo -e "${RED}[FAIL]${NC} $1"
    ((CHECKS_FAILED++))
}

# Check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Check Docker installation and version
check_docker() {
    log_info "Checking Docker installation..."

    if command_exists docker; then
        local docker_version=$(docker --version | cut -d' ' -f3 | cut -d',' -f1)
        log_success "Docker is installed (version: $docker_version)"

        # Check if Docker daemon is running
        if docker info >/dev/null 2>&1; then
            log_success "Docker daemon is running"
        else
            log_error "Docker daemon is not running"
        fi

        # Check Docker Compose
        if command_exists docker-compose || docker compose version >/dev/null 2>&1; then
            local compose_version=$(docker compose version 2>/dev/null || docker-compose --version | cut -d' ' -f3 | cut -d',' -f1)
            log_success "Docker Compose is available (version: $compose_version)"
        else
            log_error "Docker Compose is not available"
        fi
    else
        log_error "Docker is not installed"
    fi
}

# Check Node.js and npm
check_nodejs() {
    log_info "Checking Node.js installation..."

    if command_exists node; then
        local node_version=$(node --version)
        local major_version=$(echo "$node_version" | cut -d'.' -f1 | sed 's/v//')

        if [ "$major_version" -ge 20 ]; then
            log_success "Node.js is installed (version: $node_version)"
        else
            log_error "Node.js version is too old (found: $node_version, required: >= 20.0.0)"
        fi
    else
        log_error "Node.js is not installed"
    fi

    if command_exists npm; then
        local npm_version=$(npm --version)
        log_success "npm is installed (version: $npm_version)"
    else
        log_error "npm is not installed"
    fi
}

# Check system resources
check_system_resources() {
    log_info "Checking system resources..."

    # Check available memory
    if command_exists free; then
        local total_mem=$(free -m | awk '/^Mem:/{print $2}')
        if [ "$total_mem" -ge 4096 ]; then
            log_success "Sufficient memory available (${total_mem}MB)"
        else
            log_warning "Low memory available (${total_mem}MB, recommended: >= 4GB)"
        fi
    elif command_exists vm_stat; then
        # macOS
        local total_mem=$(vm_stat | perl -ne '/page size of (\d+)/ and $size=$1; /Pages free:\s+(\d+)/ and printf("%.0f", $1 * $size / 1048576)')
        log_success "Memory check completed (macOS)"
    else
        log_warning "Cannot check memory usage"
    fi

    # Check available disk space
    local available_space=$(df -h "$PROJECT_ROOT" | awk 'NR==2 {print $4}' | sed 's/[^0-9.]//g')
    if [ "$(echo "$available_space >= 10" | bc 2>/dev/null || echo "1")" -eq 1 ]; then
        log_success "Sufficient disk space available"
    else
        log_warning "Low disk space available (recommended: >= 10GB)"
    fi
}

# Check network connectivity
check_network() {
    log_info "Checking network connectivity..."

    # Check internet connectivity
    if ping -c 1 google.com >/dev/null 2>&1 || ping -c 1 8.8.8.8 >/dev/null 2>&1; then
        log_success "Internet connectivity is available"
    else
        log_warning "Internet connectivity check failed"
    fi

    # Check Docker Hub connectivity
    if docker pull hello-world:latest >/dev/null 2>&1; then
        log_success "Docker Hub connectivity is available"
        docker rmi hello-world:latest >/dev/null 2>&1
    else
        log_warning "Docker Hub connectivity check failed"
    fi
}

# Check required ports
check_ports() {
    log_info "Checking port availability..."

    local required_ports=(80 443 3000 3001 4000 6379 9000 9001 9090 9100 9121 9216 27017)

    for port in "${required_ports[@]}"; do
        if command_exists netstat; then
            if netstat -tuln 2>/dev/null | grep -q ":$port "; then
                log_warning "Port $port is already in use"
            else
                log_success "Port $port is available"
            fi
        elif command_exists ss; then
            if ss -tuln 2>/dev/null | grep -q ":$port "; then
                log_warning "Port $port is already in use"
            else
                log_success "Port $port is available"
            fi
        else
            log_warning "Cannot check port $port (netstat/ss not available)"
        fi
    done
}

# Check environment files
check_environment_files() {
    log_info "Checking environment configuration..."

    local env_files=(".env.example" ".env.local" ".env.production")

    for env_file in "${env_files[@]}"; do
        if [ -f "$PROJECT_ROOT/$env_file" ]; then
            log_success "Environment file exists: $env_file"

            # Check if file is not empty
            if [ -s "$PROJECT_ROOT/$env_file" ]; then
                log_success "Environment file is not empty: $env_file"
            else
                log_warning "Environment file is empty: $env_file"
            fi
        else
            if [ "$env_file" = ".env.example" ]; then
                log_error "Required environment file missing: $env_file"
            else
                log_warning "Optional environment file missing: $env_file"
            fi
        fi
    done
}

# Check Docker configuration files
check_docker_config() {
    log_info "Checking Docker configuration..."

    local docker_files=(
        "docker-compose.dev.yml"
        "docker-compose.prod.yml"
        "docker/nginx/nginx.conf"
        "docker/nginx/default.conf"
        "docker/mongodb/mongod.conf"
        "docker/redis/redis.conf"
        "docker/prometheus/prometheus.yml"
    )

    for docker_file in "${docker_files[@]}"; do
        if [ -f "$PROJECT_ROOT/$docker_file" ]; then
            log_success "Docker config file exists: $docker_file"
        else
            log_error "Docker config file missing: $docker_file"
        fi
    done

    # Check Dockerfile for each service
    local dockerfiles=("apps/api/Dockerfile" "apps/web/Dockerfile")

    for dockerfile in "${dockerfiles[@]}"; do
        if [ -f "$PROJECT_ROOT/$dockerfile" ]; then
            log_success "Dockerfile exists: $dockerfile"
        else
            log_error "Dockerfile missing: $dockerfile"
        fi
    done
}

# Check project dependencies
check_dependencies() {
    log_info "Checking project dependencies..."

    if [ -f "$PROJECT_ROOT/package.json" ]; then
        log_success "package.json exists"

        if [ -f "$PROJECT_ROOT/package-lock.json" ]; then
            log_success "package-lock.json exists"
        else
            log_warning "package-lock.json missing (run 'npm install')"
        fi

        # Check if node_modules exists
        if [ -d "$PROJECT_ROOT/node_modules" ]; then
            log_success "node_modules directory exists"
        else
            log_warning "node_modules directory missing (run 'npm install')"
        fi
    else
        log_error "package.json missing"
    fi

    # Check NX configuration
    if [ -f "$PROJECT_ROOT/nx.json" ]; then
        log_success "NX configuration exists"
    else
        log_error "NX configuration missing"
    fi
}

# Check SSL certificates
check_ssl_certificates() {
    log_info "Checking SSL certificates..."

    local ssl_dir="$PROJECT_ROOT/docker/ssl"

    if [ -d "$ssl_dir" ]; then
        log_success "SSL directory exists"

        if [ -f "$ssl_dir/cert.pem" ] && [ -f "$ssl_dir/key.pem" ]; then
            log_success "SSL certificate files exist"

            # Check certificate validity
            if openssl x509 -in "$ssl_dir/cert.pem" -noout -checkend 86400 >/dev/null 2>&1; then
                log_success "SSL certificate is valid and not expiring soon"
            else
                log_warning "SSL certificate is invalid or expiring soon"
            fi
        else
            log_warning "SSL certificate files missing (run ssl/generate-certs.sh for development)"
        fi

        if [ -f "$ssl_dir/generate-certs.sh" ]; then
            log_success "SSL certificate generation script exists"
        else
            log_warning "SSL certificate generation script missing"
        fi
    else
        log_warning "SSL directory missing"
    fi
}

# Check secrets management
check_secrets() {
    log_info "Checking secrets management..."

    local secrets_dir="$PROJECT_ROOT/.secrets"

    if [ -d "$secrets_dir" ]; then
        log_success "Secrets directory exists"

        # Check directory permissions
        local perms=$(stat -c "%a" "$secrets_dir" 2>/dev/null || stat -f "%A" "$secrets_dir" 2>/dev/null)
        if [ "$perms" = "700" ]; then
            log_success "Secrets directory has correct permissions"
        else
            log_warning "Secrets directory has insecure permissions: $perms (should be 700)"
        fi
    else
        log_warning "Secrets directory missing (run scripts/secrets-management.sh setup)"
    fi

    if [ -f "$PROJECT_ROOT/scripts/secrets-management.sh" ]; then
        log_success "Secrets management script exists"
    else
        log_error "Secrets management script missing"
    fi
}

# Check backup system
check_backup_system() {
    log_info "Checking backup system..."

    if [ -f "$PROJECT_ROOT/scripts/backup-restore.sh" ]; then
        log_success "Backup script exists"

        # Check if script is executable
        if [ -x "$PROJECT_ROOT/scripts/backup-restore.sh" ]; then
            log_success "Backup script is executable"
        else
            log_warning "Backup script is not executable (run 'chmod +x scripts/backup-restore.sh')"
        fi
    else
        log_error "Backup script missing"
    fi

    local backup_dir="$PROJECT_ROOT/backups"
    if [ -d "$backup_dir" ]; then
        log_success "Backup directory exists"
    else
        log_warning "Backup directory missing (will be created automatically)"
    fi
}

# Check monitoring configuration
check_monitoring() {
    log_info "Checking monitoring configuration..."

    # Check Prometheus configuration
    if [ -f "$PROJECT_ROOT/docker/prometheus/prometheus.yml" ]; then
        log_success "Prometheus configuration exists"
    else
        log_error "Prometheus configuration missing"
    fi

    # Check Grafana provisioning
    if [ -d "$PROJECT_ROOT/docker/grafana/provisioning" ]; then
        log_success "Grafana provisioning directory exists"
    else
        log_error "Grafana provisioning directory missing"
    fi

    # Check alert rules
    if [ -d "$PROJECT_ROOT/docker/prometheus/rules" ]; then
        log_success "Prometheus alert rules directory exists"
    else
        log_warning "Prometheus alert rules directory missing"
    fi
}

# Check CI/CD configuration
check_cicd() {
    log_info "Checking CI/CD configuration..."

    if [ -d "$PROJECT_ROOT/.github/workflows" ]; then
        log_success "GitHub workflows directory exists"

        local workflow_files=("ci-cd.yml" "dependency-update.yml")

        for workflow in "${workflow_files[@]}"; do
            if [ -f "$PROJECT_ROOT/.github/workflows/$workflow" ]; then
                log_success "GitHub workflow exists: $workflow"
            else
                log_warning "GitHub workflow missing: $workflow"
            fi
        done
    else
        log_warning "GitHub workflows directory missing"
    fi
}

# Generate validation report
generate_report() {
    log_info "Generating validation report..."

    local report_file="$PROJECT_ROOT/validation-report.txt"

    cat > "$report_file" << EOF
SimplePro Environment Validation Report
======================================

Generated on: $(date)
Validation script: $0

Summary:
- Checks Passed: $CHECKS_PASSED
- Checks Failed: $CHECKS_FAILED
- Warnings: $WARNINGS

$([ $CHECKS_FAILED -eq 0 ] && echo "✅ Environment validation PASSED" || echo "❌ Environment validation FAILED")

Recommendations:
$([ $CHECKS_FAILED -gt 0 ] && echo "- Fix failed checks before deployment")
$([ $WARNINGS -gt 0 ] && echo "- Review warnings and address if necessary")
$([ $CHECKS_FAILED -eq 0 ] && [ $WARNINGS -eq 0 ] && echo "- Environment is ready for deployment")

For detailed output, run the validation script with verbose logging.
EOF

    log_success "Validation report generated: $report_file"
}

# Main function
main() {
    echo "SimplePro Environment Validation"
    echo "================================"
    echo ""

    # Change to project root
    cd "$PROJECT_ROOT"

    # Run all validation checks
    check_docker
    check_nodejs
    check_system_resources
    check_network
    check_ports
    check_environment_files
    check_docker_config
    check_dependencies
    check_ssl_certificates
    check_secrets
    check_backup_system
    check_monitoring
    check_cicd

    echo ""
    echo "Validation Summary:"
    echo "=================="
    echo -e "Checks Passed: ${GREEN}$CHECKS_PASSED${NC}"
    echo -e "Checks Failed: ${RED}$CHECKS_FAILED${NC}"
    echo -e "Warnings: ${YELLOW}$WARNINGS${NC}"
    echo ""

    if [ $CHECKS_FAILED -eq 0 ]; then
        log_success "Environment validation completed successfully!"
        generate_report
        exit 0
    else
        log_error "Environment validation failed with $CHECKS_FAILED errors"
        generate_report
        exit 1
    fi
}

# Handle command line arguments
case "${1:-validate}" in
    "validate"|"")
        main
        ;;
    "help"|"-h"|"--help")
        echo "SimplePro Environment Validation"
        echo ""
        echo "Usage: $0 [command]"
        echo ""
        echo "Commands:"
        echo "  validate    Run environment validation (default)"
        echo "  help        Show this help message"
        echo ""
        echo "This script validates that the deployment environment"
        echo "has all required dependencies and configurations."
        echo ""
        ;;
    *)
        log_error "Unknown command: $1"
        echo "Use '$0 help' for usage information"
        exit 1
        ;;
esac