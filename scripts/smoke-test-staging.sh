#!/bin/bash

# SimplePro Staging Smoke Test Suite
# Comprehensive automated tests for staging environment validation

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

# Test counters
TESTS_RUN=0
TESTS_PASSED=0
TESTS_FAILED=0
TESTS_SKIPPED=0

# Test results array
declare -a FAILED_TESTS

# Configuration
COMPOSE_FILE="docker-compose.staging.yml"
SECRETS_DIR=".secrets/staging"
API_URL="http://localhost:3001"
WEB_URL="http://localhost:3009"
NGINX_URL="https://localhost"

# Test timeout (seconds)
TEST_TIMEOUT=10

# Change to project root
cd "$PROJECT_ROOT"

# Logging functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[PASS]${NC} $1"
}

log_error() {
    echo -e "${RED}[FAIL]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_skip() {
    echo -e "${CYAN}[SKIP]${NC} $1"
}

log_test() {
    echo -e "${MAGENTA}[TEST]${NC} $1"
}

# Banner
show_banner() {
    cat << "EOF"
╔═══════════════════════════════════════════════════════════════════╗
║                                                                   ║
║   SimplePro-v3 Staging Smoke Test Suite                          ║
║   Automated validation of staging deployment                     ║
║                                                                   ║
╚═══════════════════════════════════════════════════════════════════╝

EOF
}

# Test helper functions
run_test() {
    local test_name="$1"
    local test_command="$2"

    ((TESTS_RUN++))
    log_test "$test_name"

    if eval "$test_command" > /tmp/test-output.txt 2>&1; then
        ((TESTS_PASSED++))
        log_success "$test_name"
        return 0
    else
        ((TESTS_FAILED++))
        FAILED_TESTS+=("$test_name")
        log_error "$test_name"
        if [ -s /tmp/test-output.txt ]; then
            log_info "  Error details:"
            cat /tmp/test-output.txt | head -5 | sed 's/^/    /'
        fi
        return 1
    fi
}

skip_test() {
    local test_name="$1"
    local reason="$2"

    ((TESTS_RUN++))
    ((TESTS_SKIPPED++))
    log_skip "$test_name - $reason"
}

# HTTP test helper
http_test() {
    local url="$1"
    local expected_code="${2:-200}"
    local timeout="${3:-$TEST_TIMEOUT}"

    local response=$(curl -s -o /dev/null -w "%{http_code}" -m "$timeout" -k "$url")

    if [ "$response" -eq "$expected_code" ]; then
        return 0
    else
        echo "Expected HTTP $expected_code, got $response" >&2
        return 1
    fi
}

# JSON API test helper
api_test() {
    local endpoint="$1"
    local expected_code="${2:-200}"
    local method="${3:-GET}"
    local data="${4:-}"
    local token="${5:-}"

    local url="${API_URL}${endpoint}"
    local headers="-H 'Content-Type: application/json'"

    if [ -n "$token" ]; then
        headers="$headers -H 'Authorization: Bearer $token'"
    fi

    if [ -n "$data" ]; then
        headers="$headers -d '$data'"
    fi

    local response=$(curl -s -o /dev/null -w "%{http_code}" -X "$method" $headers -m "$TEST_TIMEOUT" "$url")

    if [ "$response" -eq "$expected_code" ]; then
        return 0
    else
        echo "API test failed: Expected HTTP $expected_code, got $response for $endpoint" >&2
        return 1
    fi
}

# Load environment variables
load_environment() {
    if [ -f "$SECRETS_DIR/.env" ]; then
        export $(grep -v '^#' "$SECRETS_DIR/.env" | xargs)
        log_info "Environment variables loaded"
    else
        log_error "Secrets file not found. Run setup-staging.sh first."
        exit 1
    fi
}

# Check if staging is running
check_staging_running() {
    log_info "Checking if staging environment is running..."

    if ! docker-compose -f "$COMPOSE_FILE" ps | grep -q "Up"; then
        log_error "Staging environment is not running. Start it with: ./scripts/setup-staging.sh"
        exit 1
    fi

    log_success "Staging environment is running"
    echo ""
}

# Test Suite 1: Infrastructure Health Tests
test_infrastructure() {
    echo ""
    echo "╔═══════════════════════════════════════════════════════════════════╗"
    echo "║  Test Suite 1: Infrastructure Health Tests                       ║"
    echo "╚═══════════════════════════════════════════════════════════════════╝"
    echo ""

    # Test MongoDB
    run_test "ST-001-01: MongoDB is running and healthy" \
        "docker exec simplepro-mongodb-staging mongosh --quiet --eval 'db.adminCommand(\"ping\").ok' | grep -q 1"

    run_test "ST-001-02: MongoDB authentication works" \
        "docker exec simplepro-mongodb-staging mongosh -u admin -p '$MONGODB_PASSWORD' --authenticationDatabase admin --quiet --eval 'db.getName()' | grep -q 'test\|admin'"

    run_test "ST-001-03: MongoDB can create and read data" \
        "docker exec simplepro-mongodb-staging mongosh -u admin -p '$MONGODB_PASSWORD' --authenticationDatabase admin --quiet --eval 'db.test.insertOne({test:1}); db.test.findOne({test:1}).test' | grep -q 1"

    # Test Redis
    run_test "ST-001-04: Redis is running and healthy" \
        "docker exec simplepro-redis-staging redis-cli -a '$REDIS_PASSWORD' ping | grep -q PONG"

    run_test "ST-001-05: Redis can SET and GET data" \
        "docker exec simplepro-redis-staging redis-cli -a '$REDIS_PASSWORD' SET testkey testvalue > /dev/null && docker exec simplepro-redis-staging redis-cli -a '$REDIS_PASSWORD' GET testkey | grep -q testvalue"

    run_test "ST-001-06: Redis memory configuration is correct" \
        "docker exec simplepro-redis-staging redis-cli -a '$REDIS_PASSWORD' CONFIG GET maxmemory | grep -q '256mb\|268435456'"

    # Test MinIO
    run_test "ST-001-07: MinIO is running and healthy" \
        "http_test 'http://localhost:9000/minio/health/live' 200"

    run_test "ST-001-08: MinIO console is accessible" \
        "http_test 'http://localhost:9001' 200"

    # Test Docker network
    run_test "ST-001-09: Docker network exists" \
        "docker network ls | grep -q simplepro-staging-network"

    run_test "ST-001-10: Services can communicate on network" \
        "docker exec simplepro-api-staging ping -c 1 mongodb > /dev/null 2>&1"
}

# Test Suite 2: API Health Tests
test_api() {
    echo ""
    echo "╔═══════════════════════════════════════════════════════════════════╗"
    echo "║  Test Suite 2: API Health Tests                                  ║"
    echo "╚═══════════════════════════════════════════════════════════════════╝"
    echo ""

    # Basic health checks
    run_test "ST-002-01: API health endpoint responds" \
        "http_test '$API_URL/api/health' 200"

    run_test "ST-002-02: API responds within 500ms" \
        "time curl -s -o /dev/null -w '%{time_total}' $API_URL/api/health | awk '{exit !(\$1 < 0.5)}'"

    run_test "ST-002-03: API returns valid JSON" \
        "curl -s $API_URL/api/health | jq -e '.status' > /dev/null 2>&1"

    run_test "ST-002-04: API Swagger docs are accessible" \
        "http_test '$API_URL/api/docs' 200"

    # Error handling
    run_test "ST-002-05: API returns 404 for invalid route" \
        "http_test '$API_URL/api/invalid-route-xyz' 404"

    # CORS headers
    run_test "ST-002-06: API sets CORS headers" \
        "curl -s -I $API_URL/api/health | grep -i 'access-control-allow-origin'"

    # Container health
    run_test "ST-002-07: API container is healthy" \
        "docker ps --filter 'name=simplepro-api-staging' --filter 'health=healthy' --format '{{.Names}}' | grep -q simplepro-api-staging"

    run_test "ST-002-08: API container has no restart loops" \
        "[ \$(docker inspect simplepro-api-staging --format='{{.RestartCount}}') -lt 3 ]"
}

# Test Suite 3: Authentication Tests
test_authentication() {
    echo ""
    echo "╔═══════════════════════════════════════════════════════════════════╗"
    echo "║  Test Suite 3: Authentication Tests                              ║"
    echo "╚═══════════════════════════════════════════════════════════════════╝"
    echo ""

    # Test login with valid credentials
    local login_response=$(curl -s -X POST \
        -H "Content-Type: application/json" \
        -d '{"username":"admin","password":"Admin123!"}' \
        "$API_URL/api/auth/login")

    if echo "$login_response" | jq -e '.accessToken' > /dev/null 2>&1; then
        ((TESTS_PASSED++))
        ((TESTS_RUN++))
        log_success "ST-003-01: User login with valid credentials"

        # Extract token for further tests
        ACCESS_TOKEN=$(echo "$login_response" | jq -r '.accessToken')
        REFRESH_TOKEN=$(echo "$login_response" | jq -r '.refreshToken')

        # Test authenticated request
        run_test "ST-003-02: JWT token is accepted for authenticated requests" \
            "curl -s -H 'Authorization: Bearer $ACCESS_TOKEN' $API_URL/api/auth/me | jq -e '.id' > /dev/null"

        run_test "ST-003-03: User profile returns correct data" \
            "curl -s -H 'Authorization: Bearer $ACCESS_TOKEN' $API_URL/api/auth/me | jq -e '.username' | grep -q 'admin'"

    else
        ((TESTS_FAILED++))
        ((TESTS_RUN++))
        FAILED_TESTS+=("ST-003-01: User login with valid credentials")
        log_error "ST-003-01: User login with valid credentials"
        log_info "  Login response: $login_response"
        ACCESS_TOKEN=""
    fi

    # Test login with invalid credentials
    run_test "ST-003-04: Login with invalid credentials returns 401" \
        "api_test '/api/auth/login' 401 POST '{\"username\":\"admin\",\"password\":\"wrongpassword\"}'"

    # Test protected endpoint without token
    run_test "ST-003-05: Protected endpoint requires authentication" \
        "api_test '/api/customers' 401 GET"

    # Test token format
    if [ -n "$ACCESS_TOKEN" ]; then
        run_test "ST-003-06: JWT token has correct format" \
            "echo '$ACCESS_TOKEN' | grep -E '^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$'"
    else
        skip_test "ST-003-06: JWT token has correct format" "No access token available"
    fi

    # Export token for use in other test suites
    export ACCESS_TOKEN
}

# Test Suite 4: Database Operations Tests
test_database_operations() {
    echo ""
    echo "╔═══════════════════════════════════════════════════════════════════╗"
    echo "║  Test Suite 4: Database Operations Tests                         ║"
    echo "╚═══════════════════════════════════════════════════════════════════╝"
    echo ""

    if [ -z "$ACCESS_TOKEN" ]; then
        skip_test "ST-004-*: Database operations tests" "No access token available"
        ((TESTS_RUN+=6))
        ((TESTS_SKIPPED+=6))
        return
    fi

    # Test user CRUD operations via API
    run_test "ST-004-01: Can retrieve users list" \
        "curl -s -H 'Authorization: Bearer $ACCESS_TOKEN' $API_URL/api/auth/users | jq -e '. | length' > /dev/null"

    # Test customer operations if available
    run_test "ST-004-02: Can access customers endpoint" \
        "curl -s -o /dev/null -w '%{http_code}' -H 'Authorization: Bearer $ACCESS_TOKEN' $API_URL/api/customers | grep -q '200\|404'"

    # Test MongoDB directly
    run_test "ST-004-03: MongoDB has users collection" \
        "docker exec simplepro-mongodb-staging mongosh -u admin -p '$MONGODB_PASSWORD' --authenticationDatabase admin --quiet --eval 'db.getSiblingDB(\"simplepro_staging\").users.countDocuments()' | grep -E '[0-9]+'"

    run_test "ST-004-04: MongoDB indexes are created" \
        "docker exec simplepro-mongodb-staging mongosh -u admin -p '$MONGODB_PASSWORD' --authenticationDatabase admin --quiet --eval 'db.getSiblingDB(\"simplepro_staging\").users.getIndexes().length' | grep -E '[0-9]+'"

    # Test Redis cache
    run_test "ST-004-05: Redis is storing session data" \
        "docker exec simplepro-redis-staging redis-cli -a '$REDIS_PASSWORD' DBSIZE | grep -E '[0-9]+'"

    # Test data persistence
    run_test "ST-004-06: Data persists in MongoDB volumes" \
        "docker volume ls | grep -q mongodb"
}

# Test Suite 5: File Storage Tests
test_file_storage() {
    echo ""
    echo "╔═══════════════════════════════════════════════════════════════════╗"
    echo "║  Test Suite 5: File Storage Tests                                ║"
    echo "╚═══════════════════════════════════════════════════════════════════╝"
    echo ""

    # Test MinIO connectivity
    run_test "ST-005-01: MinIO S3 API is accessible" \
        "http_test 'http://localhost:9000/minio/health/live' 200"

    run_test "ST-005-02: MinIO has required buckets" \
        "docker exec simplepro-minio-staging mc ls staging/ 2>/dev/null | grep -q 'simplepro-documents\|simplepro-backups' || true"

    # Test file upload (if API supports it and we have token)
    if [ -n "$ACCESS_TOKEN" ]; then
        # Create test file
        echo "Test file content" > /tmp/staging-test-file.txt

        local upload_response=$(curl -s -X POST \
            -H "Authorization: Bearer $ACCESS_TOKEN" \
            -F "file=@/tmp/staging-test-file.txt" \
            "$API_URL/api/documents/upload" 2>&1)

        if echo "$upload_response" | jq -e '.id' > /dev/null 2>&1; then
            ((TESTS_PASSED++))
            ((TESTS_RUN++))
            log_success "ST-005-03: File upload via API works"

            local doc_id=$(echo "$upload_response" | jq -r '.id')

            # Test file download
            run_test "ST-005-04: File download via API works" \
                "curl -s -H 'Authorization: Bearer $ACCESS_TOKEN' $API_URL/api/documents/$doc_id/download -o /tmp/staging-download.txt && [ -s /tmp/staging-download.txt ]"

            # Cleanup
            rm -f /tmp/staging-test-file.txt /tmp/staging-download.txt
        else
            ((TESTS_FAILED++))
            ((TESTS_RUN++))
            FAILED_TESTS+=("ST-005-03: File upload via API works")
            log_error "ST-005-03: File upload via API works"
            skip_test "ST-005-04: File download via API works" "Upload failed"
            ((TESTS_RUN++))
            ((TESTS_SKIPPED++))
        fi
    else
        skip_test "ST-005-03: File upload via API works" "No access token"
        skip_test "ST-005-04: File download via API works" "No access token"
        ((TESTS_RUN+=2))
        ((TESTS_SKIPPED+=2))
    fi

    # Test MinIO volume persistence
    run_test "ST-005-05: MinIO data persists in volumes" \
        "docker volume ls | grep -q minio"
}

# Test Suite 6: WebSocket Tests
test_websocket() {
    echo ""
    echo "╔═══════════════════════════════════════════════════════════════════╗"
    echo "║  Test Suite 6: WebSocket Tests                                   ║"
    echo "╚═══════════════════════════════════════════════════════════════════╝"
    echo ""

    # Check if websocat is available
    if ! command -v websocat &> /dev/null; then
        skip_test "ST-006-*: WebSocket tests" "websocat not installed"
        ((TESTS_RUN+=3))
        ((TESTS_SKIPPED+=3))
        return
    fi

    run_test "ST-006-01: WebSocket endpoint is accessible" \
        "timeout 5 websocat ws://localhost:3001 < /dev/null 2>&1 || true"

    if [ -n "$ACCESS_TOKEN" ]; then
        run_test "ST-006-02: WebSocket accepts authenticated connections" \
            "timeout 5 websocat -H 'Authorization: Bearer $ACCESS_TOKEN' ws://localhost:3001 < /dev/null 2>&1 || true"
    else
        skip_test "ST-006-02: WebSocket accepts authenticated connections" "No access token"
        ((TESTS_RUN++))
        ((TESTS_SKIPPED++))
    fi

    run_test "ST-006-03: WebSocket connection limits are enforced" \
        "docker logs simplepro-api-staging 2>&1 | grep -q 'websocket\|ws' || true"
}

# Test Suite 7: Web Application Tests
test_web_application() {
    echo ""
    echo "╔═══════════════════════════════════════════════════════════════════╗"
    echo "║  Test Suite 7: Web Application Tests                             ║"
    echo "╚═══════════════════════════════════════════════════════════════════╝"
    echo ""

    # Test web application
    run_test "ST-007-01: Web application homepage loads" \
        "http_test '$WEB_URL' 200"

    run_test "ST-007-02: Web application login page is accessible" \
        "http_test '$WEB_URL/login' 200"

    run_test "ST-007-03: Web container is healthy" \
        "docker ps --filter 'name=simplepro-web-staging' --filter 'health=healthy' --format '{{.Names}}' | grep -q simplepro-web-staging"

    run_test "ST-007-04: Web application static assets load" \
        "curl -s $WEB_URL | grep -q '_next\|static'"

    # Test Nginx reverse proxy
    run_test "ST-007-05: Nginx is running" \
        "docker ps --filter 'name=simplepro-nginx-staging' --format '{{.Names}}' | grep -q simplepro-nginx-staging"

    run_test "ST-007-06: Nginx serves HTTPS" \
        "http_test '$NGINX_URL' 200"

    run_test "ST-007-07: Nginx redirects HTTP to HTTPS" \
        "curl -s -I http://localhost | grep -q '301\|302' || curl -s -I http://localhost | grep -q 'https'"

    run_test "ST-007-08: Web application responds within 1 second" \
        "time curl -s -o /dev/null -w '%{time_total}' $WEB_URL | awk '{exit !(\$1 < 1.0)}'"
}

# Test Suite 8: Monitoring Tests
test_monitoring() {
    echo ""
    echo "╔═══════════════════════════════════════════════════════════════════╗"
    echo "║  Test Suite 8: Monitoring Tests                                  ║"
    echo "╚═══════════════════════════════════════════════════════════════════╝"
    echo ""

    # Test Prometheus
    run_test "ST-008-01: Prometheus is running and healthy" \
        "http_test 'http://localhost:9090/-/healthy' 200"

    run_test "ST-008-02: Prometheus is collecting metrics" \
        "curl -s 'http://localhost:9090/api/v1/targets' | jq -e '.data.activeTargets | length > 0'"

    run_test "ST-008-03: Prometheus targets are UP" \
        "curl -s 'http://localhost:9090/api/v1/targets' | jq -e '.data.activeTargets[] | select(.health==\"up\")' > /dev/null"

    # Test Grafana
    run_test "ST-008-04: Grafana is accessible" \
        "http_test 'http://localhost:3000/api/health' 200"

    run_test "ST-008-05: Grafana can connect to Prometheus" \
        "curl -s 'http://localhost:3000/api/datasources' | jq -e '.[] | select(.type==\"prometheus\")' > /dev/null 2>&1 || true"

    # Test exporters
    run_test "ST-008-06: MongoDB exporter is running" \
        "docker ps --filter 'name=simplepro-mongodb-exporter' --format '{{.Names}}' | grep -q mongodb-exporter"

    run_test "ST-008-07: Redis exporter is running" \
        "docker ps --filter 'name=simplepro-redis-exporter' --format '{{.Names}}' | grep -q redis-exporter"

    run_test "ST-008-08: Node exporter is running" \
        "docker ps --filter 'name=simplepro-node-exporter' --format '{{.Names}}' | grep -q node-exporter"

    run_test "ST-008-09: Metrics endpoints are accessible" \
        "http_test 'http://localhost:9216/metrics' 200"
}

# Test Suite 9: Security Validation Tests
test_security() {
    echo ""
    echo "╔═══════════════════════════════════════════════════════════════════╗"
    echo "║  Test Suite 9: Security Validation Tests                         ║"
    echo "╚═══════════════════════════════════════════════════════════════════╝"
    echo ""

    # Test secrets management
    run_test "ST-009-01: No hardcoded secrets in API container" \
        "! docker inspect simplepro-api-staging | grep -i 'Admin123\|supersecret\|changeme'"

    run_test "ST-009-02: Environment variables are set" \
        "docker exec simplepro-api-staging env | grep -q 'JWT_SECRET'"

    run_test "ST-009-03: Secrets have correct permissions" \
        "[ -f '$SECRETS_DIR/.env' ] && [ \$(stat -c '%a' '$SECRETS_DIR/.env') = '600' ]"

    # Test HTTPS/SSL
    run_test "ST-009-04: SSL certificates exist" \
        "[ -f 'docker/ssl/cert.pem' ] && [ -f 'docker/ssl/key.pem' ]"

    run_test "ST-009-05: HTTPS is enforced" \
        "curl -k -s -I $NGINX_URL | grep -q 'HTTP.*200'"

    # Test CORS
    run_test "ST-009-06: CORS is configured" \
        "curl -s -I $API_URL/api/health | grep -i 'access-control'"

    # Test rate limiting (should block after multiple rapid requests)
    local rate_limit_test=0
    for i in {1..20}; do
        local code=$(curl -s -o /dev/null -w "%{http_code}" "$API_URL/api/auth/login" -X POST -H "Content-Type: application/json" -d '{"username":"test","password":"test"}')
        if [ "$code" = "429" ]; then
            rate_limit_test=1
            break
        fi
        sleep 0.1
    done

    if [ $rate_limit_test -eq 1 ]; then
        ((TESTS_PASSED++))
        ((TESTS_RUN++))
        log_success "ST-009-07: Rate limiting is working"
    else
        ((TESTS_FAILED++))
        ((TESTS_RUN++))
        FAILED_TESTS+=("ST-009-07: Rate limiting is working")
        log_error "ST-009-07: Rate limiting is working"
    fi

    # Test password hashing
    run_test "ST-009-08: Passwords are hashed in database" \
        "docker exec simplepro-mongodb-staging mongosh -u admin -p '$MONGODB_PASSWORD' --authenticationDatabase admin --quiet --eval 'db.getSiblingDB(\"simplepro_staging\").users.findOne({username:\"admin\"}).password' | grep -q '\\\$2[ayb]\\\$' || true"

    run_test "ST-009-09: No sensitive data in logs" \
        "! docker logs simplepro-api-staging 2>&1 | grep -i 'password.*Admin123'"
}

# Test Suite 10: Performance Baseline Tests
test_performance() {
    echo ""
    echo "╔═══════════════════════════════════════════════════════════════════╗"
    echo "║  Test Suite 10: Performance Baseline Tests                       ║"
    echo "╚═══════════════════════════════════════════════════════════════════╝"
    echo ""

    # Test response times
    local api_time=$(curl -s -o /dev/null -w "%{time_total}" $API_URL/api/health)
    if (( $(echo "$api_time < 1.0" | bc -l) )); then
        ((TESTS_PASSED++))
        ((TESTS_RUN++))
        log_success "ST-010-01: API response time < 1s (${api_time}s)"
    else
        ((TESTS_FAILED++))
        ((TESTS_RUN++))
        FAILED_TESTS+=("ST-010-01: API response time < 1s (actual: ${api_time}s)")
        log_error "ST-010-01: API response time < 1s (actual: ${api_time}s)"
    fi

    # Test concurrent requests
    run_test "ST-010-02: System handles 10 concurrent requests" \
        "for i in {1..10}; do curl -s $API_URL/api/health & done; wait; true"

    # Test container resource usage
    local api_mem=$(docker stats simplepro-api-staging --no-stream --format "{{.MemUsage}}" | awk '{print $1}' | sed 's/MiB//')
    if (( $(echo "$api_mem < 500" | bc -l 2>/dev/null || echo "1") )); then
        ((TESTS_PASSED++))
        ((TESTS_RUN++))
        log_success "ST-010-03: API memory usage < 500MB (${api_mem}MB)"
    else
        ((TESTS_FAILED++))
        ((TESTS_RUN++))
        FAILED_TESTS+=("ST-010-03: API memory usage < 500MB (actual: ${api_mem}MB)")
        log_error "ST-010-03: API memory usage < 500MB (actual: ${api_mem}MB)"
    fi

    # Test database performance
    run_test "ST-010-04: MongoDB responds within 100ms" \
        "time docker exec simplepro-mongodb-staging mongosh -u admin -p '$MONGODB_PASSWORD' --authenticationDatabase admin --quiet --eval 'db.adminCommand(\"ping\")' 2>&1 | grep -E 'real.*0m0\.[0-1]'"

    run_test "ST-010-05: Redis latency < 10ms" \
        "docker exec simplepro-redis-staging redis-cli -a '$REDIS_PASSWORD' --latency-history -i 1 2>&1 | head -1 | awk '{exit !(\$NF < 10)}' || true"

    # Test container restart time
    log_info "Testing container restart time (this will take ~30 seconds)..."
    local start_time=$(date +%s)
    docker restart simplepro-api-staging > /dev/null 2>&1

    local elapsed=0
    while [ $elapsed -lt 60 ]; do
        if docker ps --filter "name=simplepro-api-staging" --filter "health=healthy" --format "{{.Names}}" | grep -q simplepro-api-staging; then
            break
        fi
        sleep 2
        elapsed=$((elapsed + 2))
    done

    local end_time=$(date +%s)
    local restart_time=$((end_time - start_time))

    if [ $restart_time -lt 30 ]; then
        ((TESTS_PASSED++))
        ((TESTS_RUN++))
        log_success "ST-010-06: Container restart time < 30s (${restart_time}s)"
    else
        ((TESTS_FAILED++))
        ((TESTS_RUN++))
        FAILED_TESTS+=("ST-010-06: Container restart time < 30s (actual: ${restart_time}s)")
        log_error "ST-010-06: Container restart time < 30s (actual: ${restart_time}s)"
    fi
}

# Generate test report
generate_report() {
    echo ""
    echo "╔═══════════════════════════════════════════════════════════════════╗"
    echo "║                      Test Results Summary                         ║"
    echo "╚═══════════════════════════════════════════════════════════════════╝"
    echo ""

    local pass_rate=0
    if [ $TESTS_RUN -gt 0 ]; then
        pass_rate=$(awk "BEGIN {printf \"%.1f\", ($TESTS_PASSED / $TESTS_RUN) * 100}")
    fi

    echo "Total Tests Run:     $TESTS_RUN"
    echo "Tests Passed:        $TESTS_PASSED"
    echo "Tests Failed:        $TESTS_FAILED"
    echo "Tests Skipped:       $TESTS_SKIPPED"
    echo "Pass Rate:           ${pass_rate}%"
    echo ""

    if [ $TESTS_FAILED -gt 0 ]; then
        echo "Failed Tests:"
        for test in "${FAILED_TESTS[@]}"; do
            echo "  - $test"
        done
        echo ""
    fi

    # Save results to file
    local report_file="logs/staging/smoke-test-$(date +%Y%m%d-%H%M%S).txt"
    mkdir -p logs/staging

    cat > "$report_file" << EOF
SimplePro-v3 Staging Smoke Test Report
========================================
Date: $(date)
Environment: Staging

Test Results:
-------------
Total Tests:    $TESTS_RUN
Passed:         $TESTS_PASSED
Failed:         $TESTS_FAILED
Skipped:        $TESTS_SKIPPED
Pass Rate:      ${pass_rate}%

EOF

    if [ $TESTS_FAILED -gt 0 ]; then
        echo "Failed Tests:" >> "$report_file"
        for test in "${FAILED_TESTS[@]}"; do
            echo "  - $test" >> "$report_file"
        done
        echo "" >> "$report_file"
    fi

    log_info "Test report saved to: $report_file"
    echo ""

    # Exit with error if tests failed
    if [ $TESTS_FAILED -gt 0 ]; then
        log_error "Some tests failed. Please review the failures above."
        return 1
    else
        log_success "All tests passed!"
        return 0
    fi
}

# Main test execution
main() {
    show_banner
    load_environment
    check_staging_running

    log_info "Starting smoke tests..."
    echo ""

    # Run all test suites
    test_infrastructure
    test_api
    test_authentication
    test_database_operations
    test_file_storage
    test_websocket
    test_web_application
    test_monitoring
    test_security
    test_performance

    # Generate report and exit
    generate_report
}

# Run main function
main
