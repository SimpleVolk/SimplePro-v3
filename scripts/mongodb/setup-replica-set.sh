#!/bin/bash

# MongoDB Replica Set Setup Script
# This script automates the complete setup of a MongoDB replica set

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

echo -e "${BLUE}================================================${NC}"
echo -e "${BLUE}MongoDB Replica Set Setup for SimplePro-v3${NC}"
echo -e "${BLUE}================================================${NC}"
echo ""

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo -e "${RED}ERROR: Docker is not running. Please start Docker first.${NC}"
    exit 1
fi

# Check if docker-compose is available
if ! command -v docker-compose &> /dev/null; then
    echo -e "${RED}ERROR: docker-compose is not installed.${NC}"
    exit 1
fi

# Load environment variables
if [ -f "$PROJECT_ROOT/.env.local" ]; then
    echo -e "${GREEN}✓${NC} Loading environment variables from .env.local"
    export $(cat "$PROJECT_ROOT/.env.local" | grep -v '^#' | xargs)
else
    echo -e "${YELLOW}⚠${NC}  Warning: .env.local not found, using defaults"
    export MONGODB_USERNAME=admin
    export MONGODB_PASSWORD=password123
    export MONGODB_DATABASE=simplepro
fi

# Step 1: Generate keyfile if not exists
echo ""
echo -e "${BLUE}Step 1: Generating replica set keyfile...${NC}"
if [ ! -f "$SCRIPT_DIR/keyfile" ]; then
    if command -v openssl &> /dev/null; then
        openssl rand -base64 756 > "$SCRIPT_DIR/keyfile"
        chmod 400 "$SCRIPT_DIR/keyfile"
        echo -e "${GREEN}✓${NC} Keyfile generated successfully"
    else
        echo -e "${RED}ERROR: OpenSSL not found. Cannot generate keyfile.${NC}"
        exit 1
    fi
else
    echo -e "${GREEN}✓${NC} Keyfile already exists"
fi

# Step 2: Stop existing containers (if any)
echo ""
echo -e "${BLUE}Step 2: Stopping existing MongoDB containers...${NC}"
cd "$PROJECT_ROOT"
docker-compose -f docker-compose.mongodb-replica.yml down -v 2>/dev/null || true
echo -e "${GREEN}✓${NC} Cleaned up existing containers"

# Step 3: Create network if not exists
echo ""
echo -e "${BLUE}Step 3: Creating Docker network...${NC}"
if ! docker network inspect storage-network > /dev/null 2>&1; then
    docker network create storage-network --subnet=172.22.0.0/24
    echo -e "${GREEN}✓${NC} Network created"
else
    echo -e "${GREEN}✓${NC} Network already exists"
fi

# Step 4: Start replica set containers
echo ""
echo -e "${BLUE}Step 4: Starting replica set containers...${NC}"
docker-compose -f docker-compose.mongodb-replica.yml up -d
echo -e "${GREEN}✓${NC} Containers started"

# Step 5: Wait for primary node to be ready
echo ""
echo -e "${BLUE}Step 5: Waiting for primary node to be ready...${NC}"
MAX_ATTEMPTS=30
ATTEMPT=0
while [ $ATTEMPT -lt $MAX_ATTEMPTS ]; do
    if docker exec simplepro-mongodb-primary mongosh --quiet --eval "db.adminCommand('ping')" > /dev/null 2>&1; then
        echo -e "${GREEN}✓${NC} Primary node is ready"
        break
    fi
    ATTEMPT=$((ATTEMPT + 1))
    echo -e "  Waiting... (attempt $ATTEMPT/$MAX_ATTEMPTS)"
    sleep 2
done

if [ $ATTEMPT -eq $MAX_ATTEMPTS ]; then
    echo -e "${RED}ERROR: Primary node failed to start after $MAX_ATTEMPTS attempts${NC}"
    exit 1
fi

# Step 6: Initialize replica set
echo ""
echo -e "${BLUE}Step 6: Initializing replica set...${NC}"
docker exec simplepro-mongodb-primary mongosh --quiet <<EOF
var config = {
  _id: "simplepro-rs",
  version: 1,
  members: [
    { _id: 0, host: "172.22.0.10:27017", priority: 2 },
    { _id: 1, host: "172.22.0.11:27017", priority: 1 },
    { _id: 2, host: "172.22.0.12:27017", priority: 1 }
  ]
};
try {
  var result = rs.initiate(config);
  if (result.ok === 1) {
    print('✓ Replica set initiated');
  } else {
    print('✗ Failed to initiate replica set');
    printjson(result);
  }
} catch (e) {
  if (e.codeName === 'AlreadyInitialized') {
    print('✓ Replica set already initialized');
  } else {
    print('✗ Error: ' + e);
    quit(1);
  }
}
EOF

# Step 7: Wait for replica set to stabilize
echo ""
echo -e "${BLUE}Step 7: Waiting for replica set to stabilize...${NC}"
sleep 15

# Step 8: Wait for primary election
echo ""
echo -e "${BLUE}Step 8: Waiting for primary election...${NC}"
MAX_ATTEMPTS=30
ATTEMPT=0
while [ $ATTEMPT -lt $MAX_ATTEMPTS ]; do
    PRIMARY=$(docker exec simplepro-mongodb-primary mongosh --quiet --eval "
        try {
            var status = rs.status();
            var primary = status.members.find(m => m.stateStr === 'PRIMARY');
            print(primary ? 'found' : 'none');
        } catch (e) {
            print('none');
        }
    " 2>/dev/null | tail -1)

    if [ "$PRIMARY" = "found" ]; then
        echo -e "${GREEN}✓${NC} Primary elected successfully"
        break
    fi
    ATTEMPT=$((ATTEMPT + 1))
    echo -e "  Waiting for primary... (attempt $ATTEMPT/$MAX_ATTEMPTS)"
    sleep 2
done

if [ $ATTEMPT -eq $MAX_ATTEMPTS ]; then
    echo -e "${RED}ERROR: Primary election failed after $MAX_ATTEMPTS attempts${NC}"
    exit 1
fi

# Step 9: Create admin user
echo ""
echo -e "${BLUE}Step 9: Creating admin user...${NC}"
docker exec simplepro-mongodb-primary mongosh admin --quiet <<EOF
try {
  db.createUser({
    user: "$MONGODB_USERNAME",
    pwd: "$MONGODB_PASSWORD",
    roles: [
      { role: 'root', db: 'admin' },
      { role: 'userAdminAnyDatabase', db: 'admin' },
      { role: 'readWriteAnyDatabase', db: 'admin' },
      { role: 'dbAdminAnyDatabase', db: 'admin' },
      { role: 'clusterAdmin', db: 'admin' }
    ]
  });
  print('✓ Admin user created');
} catch (e) {
  if (e.codeName === 'DuplicateKey') {
    print('✓ Admin user already exists');
  } else {
    print('✗ Error: ' + e);
  }
}
EOF

# Step 10: Create application user
echo ""
echo -e "${BLUE}Step 10: Creating application user...${NC}"
docker exec simplepro-mongodb-primary mongosh admin -u "$MONGODB_USERNAME" -p "$MONGODB_PASSWORD" --quiet <<EOF
var db = db.getSiblingDB('$MONGODB_DATABASE');
try {
  db.createUser({
    user: 'simplepro_app',
    pwd: '$MONGODB_PASSWORD',
    roles: [
      { role: 'readWrite', db: '$MONGODB_DATABASE' },
      { role: 'dbAdmin', db: '$MONGODB_DATABASE' }
    ]
  });
  print('✓ Application user created');
} catch (e) {
  if (e.codeName === 'DuplicateKey') {
    print('✓ Application user already exists');
  } else {
    print('✗ Error: ' + e);
  }
}
EOF

# Step 11: Display replica set status
echo ""
echo -e "${BLUE}Step 11: Verifying replica set status...${NC}"
docker exec simplepro-mongodb-primary mongosh -u "$MONGODB_USERNAME" -p "$MONGODB_PASSWORD" --authenticationDatabase admin --quiet <<EOF
var status = rs.status();
print('\nReplica Set: ' + status.set);
print('Members:');
status.members.forEach(function(member) {
    var icon = member.stateStr === 'PRIMARY' ? '★' :
               member.stateStr === 'SECONDARY' ? '●' : '○';
    print('  ' + icon + ' ' + member.name + ': ' + member.stateStr + ' (health: ' + member.health + ')');
});
EOF

# Step 12: Display connection information
echo ""
echo -e "${GREEN}================================================${NC}"
echo -e "${GREEN}Replica Set Setup Complete!${NC}"
echo -e "${GREEN}================================================${NC}"
echo ""
echo -e "${YELLOW}Connection String (with authentication):${NC}"
echo "mongodb://$MONGODB_USERNAME:$MONGODB_PASSWORD@localhost:27017,localhost:27018,localhost:27019/$MONGODB_DATABASE?replicaSet=simplepro-rs&authSource=admin&retryWrites=true&w=majority"
echo ""
echo -e "${YELLOW}Docker Internal Connection String:${NC}"
echo "mongodb://$MONGODB_USERNAME:$MONGODB_PASSWORD@172.22.0.10:27017,172.22.0.11:27017,172.22.0.12:27017/$MONGODB_DATABASE?replicaSet=simplepro-rs&authSource=admin&retryWrites=true&w=majority"
echo ""
echo -e "${YELLOW}Member Ports:${NC}"
echo "  Primary:    localhost:27017"
echo "  Secondary1: localhost:27018"
echo "  Secondary2: localhost:27019"
echo ""
echo -e "${YELLOW}Monitoring:${NC}"
echo "  MongoDB Exporter: http://localhost:9216/metrics"
echo ""
echo -e "${YELLOW}Next Steps:${NC}"
echo "  1. Update apps/api/.env.local with the connection string above"
echo "  2. Test the replica set: ./scripts/mongodb/check-replica-health.sh"
echo "  3. Test failover: docker stop simplepro-mongodb-primary"
echo "  4. Configure monitoring: Add Prometheus scraping for port 9216"
echo ""
