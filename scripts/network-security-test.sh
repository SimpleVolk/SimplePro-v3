#!/bin/bash

# Network Security Testing Script for SimplePro-v3
# This script validates the network security configuration

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
COMPOSE_FILE_DEV="docker-compose.dev-secure.yml"
COMPOSE_FILE_PROD="docker-compose.prod-secure.yml"
TEST_TIMEOUT=30

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

# Function to check if port is accessible from outside
test_port_accessibility() {
    local port=$1
    local should_be_accessible=$2
    local description=$3

    log_info "Testing port $port accessibility: $description"

    if timeout 5 bash -c "</dev/tcp/localhost/$port" 2>/dev/null; then
        if [ "$should_be_accessible" = "true" ]; then
            log_success "Port $port is accessible as expected"
            return 0
        else
            log_error "Port $port is accessible but should be blocked!"
            return 1
        fi
    else
        if [ "$should_be_accessible" = "false" ]; then
            log_success "Port $port is properly blocked"
            return 0
        else
            log_error "Port $port is not accessible but should be!"
            return 1
        fi
    fi
}

# Function to test internal network connectivity
test_internal_connectivity() {
    local service1=$1
    local service2=$2
    local port=$3
    local network=$4

    log_info "Testing internal connectivity: $service1 -> $service2:$port on $network network"

    # Use docker exec to test connectivity from within a container
    if docker exec -it "simplepro-${service1}" timeout 5 nc -z "$service2" "$port" 2>/dev/null; then
        log_success "Internal connectivity working: $service1 can reach $service2:$port"
        return 0
    else
        log_error "Internal connectivity failed: $service1 cannot reach $service2:$port"
        return 1
    fi
}

# Function to test network isolation
test_network_isolation() {
    local service1=$1
    local service2=$2
    local port=$3
    local network1=$4
    local network2=$5

    log_info "Testing network isolation: $service1 ($network1) should NOT reach $service2 ($network2):$port"

    if docker exec -it "simplepro-${service1}" timeout 5 nc -z "$service2" "$port" 2>/dev/null; then
        log_error "Network isolation FAILED: $service1 can reach $service2:$port across networks"
        return 1
    else
        log_success "Network isolation working: $service1 cannot reach $service2:$port"
        return 0
    fi
}

# Function to check container security settings
test_container_security() {
    local container_name=$1

    log_info "Testing container security settings for $container_name"

    # Check if container is running as non-root
    local user_info
    user_info=$(docker exec "$container_name" whoami 2>/dev/null || echo "root")

    if [ "$user_info" != "root" ]; then
        log_success "Container $container_name is running as non-root user: $user_info"
    else
        log_warning "Container $container_name is running as root user"
    fi

    # Check security options
    local security_opts
    security_opts=$(docker inspect "$container_name" --format '{{.HostConfig.SecurityOpt}}' 2>/dev/null || echo "[]")

    if echo "$security_opts" | grep -q "no-new-privileges:true"; then
        log_success "Container $container_name has no-new-privileges enabled"
    else
        log_warning "Container $container_name does not have no-new-privileges enabled"
    fi
}

# Function to test SSL/TLS configuration
test_ssl_security() {
    local domain=${1:-localhost}
    local port=${2:-443}

    log_info "Testing SSL/TLS security for $domain:$port"

    # Check if SSL is working
    if openssl s_client -connect "$domain:$port" -verify_return_error < /dev/null 2>/dev/null; then
        log_success "SSL/TLS connection successful"
    else
        log_warning "SSL/TLS connection failed or certificate issues"
    fi

    # Check SSL protocols and ciphers
    local ssl_info
    ssl_info=$(nmap --script ssl-enum-ciphers -p "$port" "$domain" 2>/dev/null || echo "nmap not available")

    if echo "$ssl_info" | grep -q "TLSv1.3\|TLSv1.2"; then
        log_success "Modern TLS protocols detected"
    else
        log_warning "Could not verify TLS protocols (nmap required for detailed analysis)"
    fi
}

# Function to run comprehensive security tests
run_security_tests() {
    local mode=$1  # dev or prod
    local compose_file=$2

    log_info "Starting network security tests in $mode mode"
    log_info "Using compose file: $compose_file"

    # Ensure the environment is running
    if ! docker-compose -f "$compose_file" ps | grep -q "Up"; then
        log_error "Services are not running. Please start them first with:"
        log_error "docker-compose -f $compose_file up -d"
        return 1
    fi

    local test_failures=0

    echo ""
    log_info "=== Testing External Port Access ==="

    # Test ports that should be accessible
    test_port_accessibility 80 true "HTTP port (should redirect to HTTPS)" || ((test_failures++))
    test_port_accessibility 443 true "HTTPS port (main application access)" || ((test_failures++))

    # Test ports that should NOT be accessible directly
    test_port_accessibility 4000 false "API port (should be internal only)" || ((test_failures++))
    test_port_accessibility 3000 false "Web app port (should be internal only)" || ((test_failures++))
    test_port_accessibility 27017 false "MongoDB port (should be internal only)" || ((test_failures++))
    test_port_accessibility 6379 false "Redis port (should be internal only)" || ((test_failures++))
    test_port_accessibility 9000 false "MinIO API port (should be internal only)" || ((test_failures++))

    if [ "$mode" = "dev" ]; then
        # In development, some admin tools may be exposed to localhost only
        test_port_accessibility 9001 false "MinIO console (should be localhost only)" || ((test_failures++))
        test_port_accessibility 8081 false "Mongo Express (should be localhost only)" || ((test_failures++))
    fi

    echo ""
    log_info "=== Testing Internal Network Connectivity ==="

    # Test required internal connections
    if [ "$mode" = "dev" ]; then
        test_internal_connectivity "api-dev" "mongodb" 27017 "storage-network" || ((test_failures++))
        test_internal_connectivity "api-dev" "redis" 6379 "storage-network" || ((test_failures++))
        test_internal_connectivity "nginx-dev" "api-dev" 4000 "backend-network" || ((test_failures++))
        test_internal_connectivity "nginx-dev" "web-dev" 3000 "frontend-network" || ((test_failures++))
    else
        test_internal_connectivity "api" "mongodb" 27017 "storage-network" || ((test_failures++))
        test_internal_connectivity "api" "redis" 6379 "storage-network" || ((test_failures++))
        test_internal_connectivity "nginx" "api" 4000 "backend-network" || ((test_failures++))
        test_internal_connectivity "nginx" "web" 3000 "frontend-network" || ((test_failures++))
    fi

    echo ""
    log_info "=== Testing Container Security Settings ==="

    # Test container security for key services
    if [ "$mode" = "dev" ]; then
        test_container_security "simplepro-api-dev"
        test_container_security "simplepro-web-dev"
        test_container_security "simplepro-mongodb-dev"
        test_container_security "simplepro-redis-dev"
    else
        test_container_security "simplepro-api-prod"
        test_container_security "simplepro-web-prod"
        test_container_security "simplepro-mongodb-prod"
        test_container_security "simplepro-redis-prod"
    fi

    echo ""
    log_info "=== Testing SSL/TLS Security ==="

    test_ssl_security "localhost" 443

    echo ""
    log_info "=== Testing Rate Limiting ==="

    # Test rate limiting (basic check)
    log_info "Testing API rate limiting (sending multiple requests quickly)"
    local rate_limit_test=0
    for i in {1..10}; do
        if curl -s -o /dev/null -w "%{http_code}" "https://localhost/api/health" | grep -q "429"; then
            rate_limit_test=1
            break
        fi
        sleep 0.1
    done

    if [ $rate_limit_test -eq 1 ]; then
        log_success "Rate limiting is working (received 429 status)"
    else
        log_warning "Rate limiting may not be configured or limits not reached"
    fi

    echo ""
    log_info "=== Security Test Summary ==="

    if [ $test_failures -eq 0 ]; then
        log_success "All network security tests passed!"
        return 0
    else
        log_error "$test_failures test(s) failed. Please review the configuration."
        return 1
    fi
}

# Function to display network information
show_network_info() {
    local compose_file=$1

    echo ""
    log_info "=== Network Configuration Information ==="

    # Show Docker networks
    log_info "Docker Networks:"
    docker network ls | grep -E "(simplepro|frontend|backend|storage|monitoring)" || log_info "No SimplePro networks found"

    echo ""
    log_info "Network Details:"
    for network in frontend-network backend-network storage-network monitoring-network; do
        if docker network inspect "$network" >/dev/null 2>&1; then
            echo ""
            log_info "Network: $network"
            docker network inspect "$network" --format '{{range .IPAM.Config}}Subnet: {{.Subnet}}{{end}}'
            docker network inspect "$network" --format '{{if .Internal}}Internal: Yes{{else}}Internal: No{{end}}'
        fi
    done

    echo ""
    log_info "Container Network Assignments:"
    docker-compose -f "$compose_file" ps --format "table {{.Name}}\t{{.Ports}}"
}

# Function to clean up test environment
cleanup() {
    log_info "Cleaning up test environment..."
    # Optional: Add cleanup commands here
    log_info "Cleanup completed"
}

# Main function
main() {
    local mode=${1:-}
    local action=${2:-test}

    if [ -z "$mode" ]; then
        echo "Usage: $0 <dev|prod> [test|info|cleanup]"
        echo ""
        echo "Commands:"
        echo "  test     - Run comprehensive network security tests"
        echo "  info     - Show network configuration information"
        echo "  cleanup  - Clean up test environment"
        echo ""
        echo "Examples:"
        echo "  $0 dev test       # Test development configuration"
        echo "  $0 prod test      # Test production configuration"
        echo "  $0 dev info       # Show development network info"
        exit 1
    fi

    local compose_file
    if [ "$mode" = "dev" ]; then
        compose_file="$COMPOSE_FILE_DEV"
    elif [ "$mode" = "prod" ]; then
        compose_file="$COMPOSE_FILE_PROD"
    else
        log_error "Invalid mode: $mode. Use 'dev' or 'prod'"
        exit 1
    fi

    if [ ! -f "$compose_file" ]; then
        log_error "Compose file not found: $compose_file"
        exit 1
    fi

    case "$action" in
        test)
            run_security_tests "$mode" "$compose_file"
            ;;
        info)
            show_network_info "$compose_file"
            ;;
        cleanup)
            cleanup
            ;;
        *)
            log_error "Invalid action: $action. Use 'test', 'info', or 'cleanup'"
            exit 1
            ;;
    esac
}

# Trap cleanup on exit
trap cleanup EXIT

# Run main function with all arguments
main "$@"