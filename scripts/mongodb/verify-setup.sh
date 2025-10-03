#!/bin/bash

# MongoDB Replica Set Verification Script
# This script verifies the complete replica set setup

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}================================================${NC}"
echo -e "${BLUE}MongoDB Replica Set Verification${NC}"
echo -e "${BLUE}================================================${NC}"
echo ""

PASS=0
FAIL=0
WARN=0

# Test function
test_item() {
    local description="$1"
    local command="$2"
    local expected="$3"

    echo -n "Testing: $description... "

    if eval "$command" > /dev/null 2>&1; then
        if [ -z "$expected" ] || eval "$command" | grep -q "$expected"; then
            echo -e "${GREEN}✓ PASS${NC}"
            ((PASS++))
            return 0
        else
            echo -e "${RED}✗ FAIL${NC}"
            echo "  Expected: $expected"
            ((FAIL++))
            return 1
        fi
    else
        echo -e "${RED}✗ FAIL${NC}"
        ((FAIL++))
        return 1
    fi
}

# File checks
echo -e "${BLUE}File Checks:${NC}"
test_item "Docker Compose replica file exists" "test -f docker-compose.mongodb-replica.yml"
test_item "Setup script exists (Linux)" "test -f scripts/mongodb/setup-replica-set.sh"
test_item "Setup script exists (Windows)" "test -f scripts/mongodb/setup-replica-set.bat"
test_item "Health check script exists" "test -f scripts/mongodb/check-replica-health.sh"
test_item "Backup script exists" "test -f scripts/backup/mongodb-backup.sh"
test_item "Restore script exists" "test -f scripts/backup/mongodb-restore.sh"
test_item "Keyfile exists" "test -f scripts/mongodb/keyfile"
echo ""

# Container checks
echo -e "${BLUE}Container Checks:${NC}"
test_item "Primary container running" "docker ps | grep simplepro-mongodb-primary"
test_item "Secondary1 container running" "docker ps | grep simplepro-mongodb-secondary1"
test_item "Secondary2 container running" "docker ps | grep simplepro-mongodb-secondary2"
test_item "Exporter container running" "docker ps | grep simplepro-mongodb-exporter"
echo ""

# Network checks
echo -e "${BLUE}Network Checks:${NC}"
test_item "Storage network exists" "docker network inspect storage-network"
test_item "Primary has correct IP" "docker inspect simplepro-mongodb-primary | grep -q 172.22.0.10"
test_item "Secondary1 has correct IP" "docker inspect simplepro-mongodb-secondary1 | grep -q 172.22.0.11"
test_item "Secondary2 has correct IP" "docker inspect simplepro-mongodb-secondary2 | grep -q 172.22.0.12"
echo ""

# MongoDB checks (if credentials provided)
if [ -n "$MONGODB_USERNAME" ] && [ -n "$MONGODB_PASSWORD" ]; then
    echo -e "${BLUE}MongoDB Checks:${NC}"

    # Replica set status
    if docker exec simplepro-mongodb-primary mongosh -u "$MONGODB_USERNAME" -p "$MONGODB_PASSWORD" \
        --authenticationDatabase admin --quiet --eval "rs.status()" > /tmp/rs_status.txt 2>&1; then
        echo -e "Replica set status: ${GREEN}✓ PASS${NC}"
        ((PASS++))

        # Check for PRIMARY
        if grep -q "PRIMARY" /tmp/rs_status.txt; then
            echo -e "Primary node found: ${GREEN}✓ PASS${NC}"
            ((PASS++))
        else
            echo -e "Primary node found: ${RED}✗ FAIL${NC}"
            ((FAIL++))
        fi

        # Check for SECONDARY
        SECONDARY_COUNT=$(grep -c "SECONDARY" /tmp/rs_status.txt || echo "0")
        if [ "$SECONDARY_COUNT" -ge 2 ]; then
            echo -e "Secondary nodes found ($SECONDARY_COUNT): ${GREEN}✓ PASS${NC}"
            ((PASS++))
        else
            echo -e "Secondary nodes found ($SECONDARY_COUNT): ${YELLOW}⚠ WARN (expected 2)${NC}"
            ((WARN++))
        fi

        rm /tmp/rs_status.txt
    else
        echo -e "Replica set status: ${RED}✗ FAIL (auth error)${NC}"
        ((FAIL++))
    fi
    echo ""
else
    echo -e "${YELLOW}⚠ MongoDB credentials not provided, skipping MongoDB checks${NC}"
    echo -e "  Set MONGODB_USERNAME and MONGODB_PASSWORD to run MongoDB checks"
    echo ""
fi

# Documentation checks
echo -e "${BLUE}Documentation Checks:${NC}"
test_item "Database Operations Runbook exists" "test -f docs/operations/DATABASE_OPERATIONS_RUNBOOK.md"
test_item "Deployment Runbook exists" "test -f docs/operations/DEPLOYMENT_RUNBOOK.md"
test_item "Incident Response Runbook exists" "test -f docs/operations/INCIDENT_RESPONSE_RUNBOOK.md"
test_item "Backup Recovery Runbook exists" "test -f docs/operations/BACKUP_RECOVERY_RUNBOOK.md"
test_item "MongoDB Setup Guide exists" "test -f docs/operations/MONGODB_REPLICA_SET_SETUP.md"
test_item "Operations README exists" "test -f docs/operations/README.md"
echo ""

# Monitoring checks
echo -e "${BLUE}Monitoring Setup Checks:${NC}"
test_item "Prometheus config exists" "test -f monitoring/prometheus/prometheus-config.yml"
test_item "MongoDB alert rules exist" "test -f monitoring/prometheus/mongodb.rules.yml"
test_item "Grafana datasources config exists" "test -f monitoring/grafana/datasources.yml"
test_item "Alertmanager config exists" "test -f monitoring/alertmanager/config.yml"
test_item "Monitoring docker-compose exists" "test -f monitoring/docker-compose.monitoring.yml"
echo ""

# Exporter check
echo -e "${BLUE}Exporter Checks:${NC}"
if curl -s http://localhost:9216/metrics > /dev/null 2>&1; then
    echo -e "MongoDB Exporter accessible: ${GREEN}✓ PASS${NC}"
    ((PASS++))

    # Check for key metrics
    if curl -s http://localhost:9216/metrics | grep -q "mongodb_up"; then
        echo -e "MongoDB up metric present: ${GREEN}✓ PASS${NC}"
        ((PASS++))
    else
        echo -e "MongoDB up metric present: ${YELLOW}⚠ WARN${NC}"
        ((WARN++))
    fi
else
    echo -e "MongoDB Exporter accessible: ${RED}✗ FAIL${NC}"
    echo "  Start the replica set with: npm run replica:setup"
    ((FAIL++))
fi
echo ""

# Summary
echo -e "${BLUE}================================================${NC}"
echo -e "${BLUE}Verification Summary${NC}"
echo -e "${BLUE}================================================${NC}"
echo ""
echo -e "${GREEN}Passed:${NC}  $PASS"
if [ $WARN -gt 0 ]; then
    echo -e "${YELLOW}Warnings:${NC} $WARN"
fi
if [ $FAIL -gt 0 ]; then
    echo -e "${RED}Failed:${NC}  $FAIL"
fi
echo ""

# Overall result
TOTAL=$((PASS + FAIL + WARN))
if [ $FAIL -eq 0 ] && [ $WARN -eq 0 ]; then
    echo -e "${GREEN}✓ All checks passed! Replica set is fully operational.${NC}"
    exit 0
elif [ $FAIL -eq 0 ]; then
    echo -e "${YELLOW}⚠ All critical checks passed, but there are warnings.${NC}"
    exit 0
else
    echo -e "${RED}✗ Some checks failed. Please review the output above.${NC}"
    echo ""
    echo "Common fixes:"
    echo "  - Start replica set: npm run replica:setup"
    echo "  - Check container logs: docker logs simplepro-mongodb-primary"
    echo "  - Verify .env.local has correct credentials"
    exit 1
fi
