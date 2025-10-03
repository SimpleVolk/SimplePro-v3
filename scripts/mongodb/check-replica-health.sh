#!/bin/bash

# MongoDB Replica Set Health Check Script
# This script monitors the health and status of the MongoDB replica set

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

# Load environment variables
if [ -f "$PROJECT_ROOT/.env.local" ]; then
    export $(cat "$PROJECT_ROOT/.env.local" | grep -v '^#' | xargs)
else
    export MONGODB_USERNAME=admin
    export MONGODB_PASSWORD=password123
fi

echo -e "${BLUE}================================================${NC}"
echo -e "${BLUE}MongoDB Replica Set Health Check${NC}"
echo -e "${BLUE}================================================${NC}"
echo ""

# Check if containers are running
echo -e "${BLUE}Container Status:${NC}"
containers=("simplepro-mongodb-primary" "simplepro-mongodb-secondary1" "simplepro-mongodb-secondary2")
all_running=true

for container in "${containers[@]}"; do
    if docker ps --format '{{.Names}}' | grep -q "^${container}$"; then
        status=$(docker inspect --format='{{.State.Status}}' "$container")
        health=$(docker inspect --format='{{.State.Health.Status}}' "$container" 2>/dev/null || echo "no healthcheck")
        if [ "$status" = "running" ]; then
            echo -e "  ${GREEN}✓${NC} $container: running (health: $health)"
        else
            echo -e "  ${RED}✗${NC} $container: $status"
            all_running=false
        fi
    else
        echo -e "  ${RED}✗${NC} $container: not found"
        all_running=false
    fi
done

if [ "$all_running" = false ]; then
    echo ""
    echo -e "${RED}ERROR: Not all containers are running${NC}"
    echo "Start the replica set with: ./scripts/mongodb/setup-replica-set.sh"
    exit 1
fi

echo ""
echo -e "${BLUE}Replica Set Status:${NC}"

# Get replica set status
rs_status=$(docker exec simplepro-mongodb-primary mongosh -u "$MONGODB_USERNAME" -p "$MONGODB_PASSWORD" --authenticationDatabase admin --quiet --eval "
var status = rs.status();
print('Set Name: ' + status.set);
print('Date: ' + status.date);
print('MyState: ' + status.myState);
print('');
print('Members:');
status.members.forEach(function(member) {
    var stateIcon = member.stateStr === 'PRIMARY' ? '★' :
                   member.stateStr === 'SECONDARY' ? '●' :
                   member.stateStr === 'ARBITER' ? '○' : '?';
    var healthIcon = member.health === 1 ? '✓' : '✗';
    print('  ' + stateIcon + ' ' + member.name);
    print('    State: ' + member.stateStr);
    print('    Health: ' + healthIcon + ' ' + member.health);
    print('    Uptime: ' + Math.floor(member.uptime / 60) + 'm');
    if (member.optimeDate) {
        print('    Last Heartbeat: ' + member.lastHeartbeat);
        print('    Last Optime: ' + member.optimeDate);
    }
    print('');
});
" 2>/dev/null)

echo "$rs_status"

echo ""
echo -e "${BLUE}Replication Lag:${NC}"

# Check replication lag
docker exec simplepro-mongodb-primary mongosh -u "$MONGODB_USERNAME" -p "$MONGODB_PASSWORD" --authenticationDatabase admin --quiet --eval "
var status = rs.status();
var primary = status.members.find(m => m.stateStr === 'PRIMARY');
if (primary) {
    var primaryOptime = primary.optimeDate;
    print('Primary optime: ' + primaryOptime);
    print('');
    status.members.forEach(function(member) {
        if (member.stateStr === 'SECONDARY') {
            var lag = (primaryOptime - member.optimeDate) / 1000;
            var lagIcon = lag < 10 ? '✓' : lag < 60 ? '⚠' : '✗';
            print(lagIcon + ' ' + member.name + ': ' + lag.toFixed(2) + ' seconds behind');
        }
    });
} else {
    print('⚠ No primary found in replica set');
}
" 2>/dev/null

echo ""
echo -e "${BLUE}Connection Information:${NC}"

# Get connection stats
docker exec simplepro-mongodb-primary mongosh -u "$MONGODB_USERNAME" -p "$MONGODB_PASSWORD" --authenticationDatabase admin --quiet --eval "
var serverStatus = db.serverStatus();
print('Connections:');
print('  Current: ' + serverStatus.connections.current);
print('  Available: ' + serverStatus.connections.available);
print('  Total Created: ' + serverStatus.connections.totalCreated);
print('');
print('Operations:');
print('  Inserts: ' + serverStatus.opcounters.insert);
print('  Queries: ' + serverStatus.opcounters.query);
print('  Updates: ' + serverStatus.opcounters.update);
print('  Deletes: ' + serverStatus.opcounters.delete);
print('  Commands: ' + serverStatus.opcounters.command);
" 2>/dev/null

echo ""
echo -e "${BLUE}Database Statistics:${NC}"

# Get database stats
docker exec simplepro-mongodb-primary mongosh -u "$MONGODB_USERNAME" -p "$MONGODB_PASSWORD" --authenticationDatabase admin --quiet --eval "
var dbStats = db.getSiblingDB('simplepro').stats();
print('Database: simplepro');
print('  Collections: ' + dbStats.collections);
print('  Data Size: ' + (dbStats.dataSize / 1024 / 1024).toFixed(2) + ' MB');
print('  Storage Size: ' + (dbStats.storageSize / 1024 / 1024).toFixed(2) + ' MB');
print('  Indexes: ' + dbStats.indexes);
print('  Index Size: ' + (dbStats.indexSize / 1024 / 1024).toFixed(2) + ' MB');
print('  Documents: ' + dbStats.objects);
" 2>/dev/null

echo ""
echo -e "${BLUE}Performance Metrics:${NC}"

# Get performance metrics
docker exec simplepro-mongodb-primary mongosh -u "$MONGODB_USERNAME" -p "$MONGODB_PASSWORD" --authenticationDatabase admin --quiet --eval "
var serverStatus = db.serverStatus();
var wiredTiger = serverStatus.wiredTiger;
print('WiredTiger Cache:');
print('  Bytes In Cache: ' + (wiredTiger.cache['bytes currently in the cache'] / 1024 / 1024).toFixed(2) + ' MB');
print('  Max Bytes: ' + (wiredTiger.cache['maximum bytes configured'] / 1024 / 1024).toFixed(2) + ' MB');
print('  Pages Read: ' + wiredTiger.cache['pages read into cache']);
print('  Pages Written: ' + wiredTiger.cache['pages written from cache']);
print('');
print('Memory:');
print('  Resident: ' + (serverStatus.mem.resident) + ' MB');
print('  Virtual: ' + (serverStatus.mem.virtual) + ' MB');
" 2>/dev/null

echo ""
echo -e "${GREEN}================================================${NC}"
echo -e "${GREEN}Health Check Complete${NC}"
echo -e "${GREEN}================================================${NC}"
