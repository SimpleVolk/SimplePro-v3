# MongoDB Replica Set Setup Guide

**Document Version:** 1.0
**Last Updated:** 2025-10-02
**Maintained By:** DevOps Team

## Table of Contents

1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Prerequisites](#prerequisites)
4. [Installation Steps](#installation-steps)
5. [Configuration](#configuration)
6. [Testing and Verification](#testing-and-verification)
7. [Monitoring Setup](#monitoring-setup)
8. [Troubleshooting](#troubleshooting)

---

## Overview

### What is a Replica Set?

A MongoDB replica set is a group of MongoDB servers that maintain the same data set, providing:
- **High Availability:** Automatic failover when primary fails
- **Data Redundancy:** Multiple copies of data across nodes
- **Read Scaling:** Distribute read operations across secondaries
- **Zero Downtime:** Maintenance without service interruption

### SimplePro-v3 Configuration

- **Replica Set Name:** simplepro-rs
- **Members:** 3 (1 Primary + 2 Secondaries)
- **Deployment:** Docker containers
- **Network:** Internal bridge network (172.22.0.0/24)

### Benefits

✅ **Elimination of SPOF** - No single point of failure
✅ **Automatic Failover** - Recovery in <30 seconds
✅ **Read Scaling** - Distribute reads across secondaries
✅ **Data Safety** - w:majority write concern
✅ **Zero Downtime Maintenance** - Update nodes one at a time

---

## Architecture

### Topology Diagram

```
┌─────────────────────────────────────────────────────┐
│                   Load Balancer                     │
│            (Nginx / Cloud ALB)                      │
└────────────┬────────────────────────────────────────┘
             │
             ▼
┌────────────────────────────────────────────────────┐
│              SimplePro API (NestJS)                │
│    Connection String: mongodb://primary,           │
│    secondary1,secondary2/simplepro?replicaSet=...  │
└────────────┬───────────────────────────────────────┘
             │
             ▼
┌────────────────────────────────────────────────────┐
│           MongoDB Replica Set                      │
│          (simplepro-rs)                            │
│                                                     │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────┐│
│  │   Primary    │  │ Secondary 1  │  │Secondary2││
│  │ 172.22.0.10  │  │ 172.22.0.11  │  │.22.0.12  ││
│  │   :27017     │  │   :27017     │  │ :27017   ││
│  │              │  │              │  │          ││
│  │ Reads/Writes │  │   Reads      │  │  Reads   ││
│  │   Priority 2 │  │  Priority 1  │  │Priority 1││
│  └──────┬───────┘  └──────┬───────┘  └────┬─────┘│
│         │                 │                │      │
│         └─────────────────┴────────────────┘      │
│              Replication (Oplog)                  │
└────────────────────────────────────────────────────┘
```

### Network Configuration

| Member | Container | IP | Port (Host) | Port (Container) | Role |
|--------|-----------|--------|-------------|------------------|------|
| Primary | mongodb-primary | 172.22.0.10 | 27017 | 27017 | Primary |
| Secondary 1 | mongodb-secondary1 | 172.22.0.11 | 27018 | 27017 | Secondary |
| Secondary 2 | mongodb-secondary2 | 172.22.0.12 | 27019 | 27017 | Secondary |
| Exporter | mongodb-exporter | - | 9216 | 9216 | Monitoring |

### Data Flow

1. **Write Operations:**
   - Client → Primary (all writes)
   - Primary → Secondaries (replication)
   - Acknowledged when w:majority nodes confirm

2. **Read Operations:**
   - Client → Secondaries (with readPreference: secondaryPreferred)
   - Fallback to Primary if secondaries unavailable
   - Transactions always read from Primary

3. **Failover:**
   - Primary fails (heartbeat timeout ~10s)
   - Secondaries initiate election (~5-15s)
   - New primary elected
   - Clients automatically reconnect to new primary

---

## Prerequisites

### System Requirements

**Hardware (per node):**
- CPU: 2+ cores
- RAM: 4 GB minimum, 8 GB recommended
- Disk: 50 GB+ SSD (depends on data size)
- Network: 1 Gbps LAN

**Software:**
- Docker: 20.10+
- Docker Compose: 1.29+
- OpenSSL: For keyfile generation
- Bash/PowerShell: For automation scripts

### Pre-Installation Checklist

- [ ] Docker and Docker Compose installed
- [ ] Sufficient disk space available (50 GB+)
- [ ] Network ports available (27017-27019, 9216)
- [ ] Firewall rules configured (if applicable)
- [ ] Backup of existing database (if migrating)
- [ ] Environment variables configured

---

## Installation Steps

### Step 1: Generate Replica Set Keyfile

The keyfile ensures secure communication between replica set members.

**Linux/Mac:**
```bash
cd D:\Claude\SimplePro-v3
./scripts/mongodb/generate-keyfile.sh
```

**Windows:**
```cmd
cd D:\Claude\SimplePro-v3
scripts\mongodb\generate-keyfile.bat
```

**Manual (if OpenSSL not available):**
```bash
# Generate 756 bytes of random data, base64 encoded
openssl rand -base64 756 > scripts/mongodb/keyfile
chmod 400 scripts/mongodb/keyfile
```

**Important:**
- ⚠️ Keep keyfile secure (never commit to version control)
- ⚠️ Same keyfile must be used on all replica set members
- ⚠️ File permissions must be 400 or 600

---

### Step 2: Configure Environment Variables

Create or update `.env.local`:

```bash
# MongoDB Replica Set Configuration
MONGODB_USERNAME=admin
MONGODB_PASSWORD=your-secure-password-here
MONGODB_DATABASE=simplepro

# MongoDB Replica Set Connection String
MONGODB_URI=mongodb://admin:your-secure-password-here@172.22.0.10:27017,172.22.0.11:27017,172.22.0.12:27017/simplepro?replicaSet=simplepro-rs&authSource=admin&retryWrites=true&w=majority

# Connection Pool Settings (optimized for replica set)
MONGODB_MAX_POOL_SIZE=100
MONGODB_MIN_POOL_SIZE=10
MONGODB_SERVER_SELECTION_TIMEOUT=5000
MONGODB_SOCKET_TIMEOUT=45000
MONGODB_READ_PREFERENCE=secondaryPreferred
MONGODB_AUTH_SOURCE=admin
```

---

### Step 3: Run Automated Setup

The setup script handles everything automatically.

**Linux/Mac:**
```bash
cd D:\Claude\SimplePro-v3
./scripts/mongodb/setup-replica-set.sh
```

**Windows:**
```cmd
cd D:\Claude\SimplePro-v3
scripts\mongodb\setup-replica-set.bat
```

**What the script does:**
1. Generates keyfile (if not exists)
2. Creates Docker network
3. Starts replica set containers
4. Waits for primary to be ready
5. Initializes replica set
6. Waits for primary election
7. Creates admin user
8. Creates application user
9. Displays status and connection strings

**Expected output:**
```
================================================
MongoDB Replica Set Setup for SimplePro-v3
================================================

Step 1: Generating replica set keyfile...
✓ Keyfile generated successfully

Step 2: Stopping existing MongoDB containers...
✓ Cleaned up existing containers

Step 3: Creating Docker network...
✓ Network already exists

Step 4: Starting replica set containers...
✓ Containers started

Step 5: Waiting for primary node to be ready...
✓ Primary node is ready

Step 6: Initializing replica set...
✓ Replica set initiated

Step 7: Waiting for replica set to stabilize...

Step 8: Waiting for primary election...
✓ Primary elected successfully

Step 9: Creating admin user...
✓ Admin user created

Step 10: Creating application user...
✓ Application user created

Step 11: Verifying replica set status...

Replica Set: simplepro-rs
Members:
  ★ 172.22.0.10:27017: PRIMARY (health: 1)
  ● 172.22.0.11:27017: SECONDARY (health: 1)
  ● 172.22.0.12:27017: SECONDARY (health: 1)

================================================
Replica Set Setup Complete!
================================================

Connection String (with authentication):
mongodb://admin:password123@localhost:27017,localhost:27018,localhost:27019/simplepro?replicaSet=simplepro-rs&authSource=admin&retryWrites=true&w=majority

Docker Internal Connection String:
mongodb://admin:password123@172.22.0.10:27017,172.22.0.11:27017,172.22.0.12:27017/simplepro?replicaSet=simplepro-rs&authSource=admin&retryWrites=true&w=majority

Member Ports:
  Primary:    localhost:27017
  Secondary1: localhost:27018
  Secondary2: localhost:27019

Monitoring:
  MongoDB Exporter: http://localhost:9216/metrics

Next Steps:
  1. Update apps/api/.env.local with the connection string above
  2. Test the replica set: ./scripts/mongodb/check-replica-health.sh
  3. Test failover: docker stop simplepro-mongodb-primary
  4. Configure monitoring: Add Prometheus scraping for port 9216
```

---

## Configuration

### Application Configuration

Update `apps/api/.env.local` with replica set connection string:

```bash
# Replace single-node connection with replica set connection
MONGODB_URI=mongodb://admin:password@172.22.0.10:27017,172.22.0.11:27017,172.22.0.12:27017/simplepro?replicaSet=simplepro-rs&authSource=admin&retryWrites=true&w=majority
```

The application (`apps/api/src/database/database.module.ts`) is already configured for replica sets with:
- Read preference: `secondaryPreferred`
- Write concern: `w:majority, j:true`
- Automatic failover handling
- Connection pooling optimization

### Replica Set Configuration

Current configuration in `rs.conf()`:

```javascript
{
  _id: "simplepro-rs",
  version: 1,
  members: [
    {
      _id: 0,
      host: "172.22.0.10:27017",
      priority: 2,  // Higher priority = preferred primary
      tags: { role: "primary" }
    },
    {
      _id: 1,
      host: "172.22.0.11:27017",
      priority: 1,
      tags: { role: "secondary" }
    },
    {
      _id: 2,
      host: "172.22.0.12:27017",
      priority: 1,
      tags: { role: "secondary" }
    }
  ],
  settings: {
    electionTimeoutMillis: 10000,
    heartbeatIntervalMillis: 2000,
    heartbeatTimeoutSecs: 10,
    catchUpTimeoutMillis: 60000,
    getLastErrorDefaults: {
      w: "majority",
      wtimeout: 10000
    }
  }
}
```

### Modifying Configuration

To change replica set configuration:

```bash
docker exec simplepro-mongodb-primary mongosh -u admin -p <password> \
  --authenticationDatabase admin

# Get current configuration
var config = rs.conf();

# Modify configuration (example: change priority)
config.members[0].priority = 5;
config.version++;  // MUST increment version

# Apply configuration
rs.reconfig(config);
```

---

## Testing and Verification

### Health Check

```bash
# Run health check script
./scripts/mongodb/check-replica-health.sh

# Expected output: All members healthy, lag <10s
```

### Manual Verification Commands

```bash
# Check replica set status
docker exec simplepro-mongodb-primary mongosh -u admin -p <password> \
  --authenticationDatabase admin --eval "rs.status()"

# Check member states
docker exec simplepro-mongodb-primary mongosh -u admin -p <password> \
  --authenticationDatabase admin --eval "
    rs.status().members.forEach(m =>
      print(m.name + ': ' + m.stateStr + ' (health: ' + m.health + ')')
    )
  "

# Check replication lag
docker exec simplepro-mongodb-primary mongosh -u admin -p <password> \
  --authenticationDatabase admin --eval "rs.printSecondaryReplicationInfo()"
```

### Failover Testing

Test automatic failover by stopping primary:

```bash
# 1. Check current primary
docker exec simplepro-mongodb-primary mongosh -u admin -p <password> \
  --authenticationDatabase admin --eval "
    rs.status().members.find(m => m.stateStr === 'PRIMARY').name
  "

# 2. Stop primary
docker stop simplepro-mongodb-primary

# 3. Watch election (should complete in 10-30 seconds)
watch -n 1 'docker exec simplepro-mongodb-secondary1 mongosh -u admin -p <password> \
  --authenticationDatabase admin --eval "rs.status()" | grep stateStr'

# 4. Verify new primary elected
docker exec simplepro-mongodb-secondary1 mongosh -u admin -p <password> \
  --authenticationDatabase admin --eval "
    rs.status().members.find(m => m.stateStr === 'PRIMARY').name
  "

# 5. Restart old primary (will rejoin as secondary)
docker start simplepro-mongodb-primary
sleep 30

# 6. Verify rejoined
./scripts/mongodb/check-replica-health.sh
```

### Application Connection Test

```bash
# Test application can connect and perform operations
cd D:\Claude\SimplePro-v3

# Start API
npm run dev:api

# In another terminal, test API
curl http://localhost:3001/health

# Expected: {"status":"ok","database":"connected"}

# Test database operation
curl -X POST http://localhost:3001/api/jobs \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"title":"Test Job"}'

# Should succeed
```

---

## Monitoring Setup

### Prometheus Configuration

The MongoDB exporter is already included in the replica set setup. Configure Prometheus to scrape it:

```bash
# Start monitoring stack
cd D:\Claude\SimplePro-v3
docker-compose -f monitoring/docker-compose.monitoring.yml up -d

# Verify Prometheus
curl http://localhost:9090/targets
# Should show mongodb target as "UP"

# Verify metrics
curl http://localhost:9216/metrics | grep mongodb_up
# Should return: mongodb_up 1
```

### Grafana Dashboard

1. **Access Grafana:** http://localhost:3000
2. **Login:** admin / admin (change password on first login)
3. **Add Dashboard:**
   - Go to Dashboards → Import
   - Upload: `monitoring/grafana/dashboards/mongodb-replica-set.json`
   - Select Prometheus data source

**Key Panels:**
- Replica set status
- Replication lag
- Operations per second
- Connection pool utilization
- Memory usage
- Disk usage
- Query performance

### Alerting

Alerts are configured in `monitoring/prometheus/mongodb.rules.yml`:

**Critical Alerts:**
- Replica set member down
- No primary in replica set
- Critical replication lag (>5 minutes)
- Connection pool exhausted
- Disk space <10%

**Warning Alerts:**
- High replication lag (>30 seconds)
- High connections (>800)
- Slow queries
- Low cache hit ratio

---

## Troubleshooting

### Replica Set Won't Initialize

**Problem:** `rs.initiate()` fails

**Solutions:**
```bash
# 1. Check containers are running
docker ps | grep mongodb

# 2. Check logs
docker logs simplepro-mongodb-primary

# 3. Verify network connectivity
docker exec simplepro-mongodb-primary ping -c 3 mongodb-secondary1

# 4. Check MongoDB is listening
docker exec simplepro-mongodb-primary mongosh --eval "db.adminCommand('ping')"

# 5. Try manual initialization
docker exec simplepro-mongodb-primary mongosh --eval "
  rs.initiate({
    _id: 'simplepro-rs',
    members: [
      { _id: 0, host: '172.22.0.10:27017' },
      { _id: 1, host: '172.22.0.11:27017' },
      { _id: 2, host: '172.22.0.12:27017' }
    ]
  })
"
```

### Authentication Failed

**Problem:** Cannot connect with credentials

**Solutions:**
```bash
# 1. Verify user exists
docker exec simprepro-mongodb-primary mongosh --eval "
  db.getSiblingDB('admin').getUsers()
"

# 2. Create user if missing
docker exec simplepro-mongodb-primary mongosh --eval "
  db.getSiblingDB('admin').createUser({
    user: 'admin',
    pwd: 'password123',
    roles: ['root']
  })
"

# 3. Verify connection string format
# Correct: mongodb://user:pass@host1,host2,host3/db?replicaSet=rs&authSource=admin
```

### High Replication Lag

**Problem:** Secondary lagging behind primary

**Solutions:**
```bash
# 1. Check secondary performance
docker stats simplepro-mongodb-secondary1

# 2. Check network between members
docker exec simplepro-mongodb-primary ping -c 10 mongodb-secondary1

# 3. Check oplog size
docker exec simprepro-mongodb-primary mongosh -u admin -p <password> \
  --authenticationDatabase admin --eval "
    db.getSiblingDB('local').oplog.rs.stats().maxSize / 1024 / 1024 / 1024
  "
# Should be several GB

# 4. Check for slow operations
docker exec simplepro-mongodb-primary mongosh -u admin -p <password> \
  --authenticationDatabase admin --eval "
    db.currentOp({'active': true, 'secs_running': { \$gt: 5 }})
  "
```

### Member Won't Join Replica Set

**Problem:** New member stuck in STARTUP or RECOVERING

**Solutions:**
```bash
# 1. Check member can reach primary
docker exec simplepro-mongodb-secondary1 ping -c 3 mongodb-primary

# 2. Check logs for errors
docker logs simprepro-mongodb-secondary1 --tail=100

# 3. Verify keyfile is identical
docker exec simplepro-mongodb-primary md5sum /etc/mongodb-keyfile
docker exec simplepro-mongodb-secondary1 md5sum /etc/mongodb-keyfile
# Should match

# 4. Remove and re-add member
docker exec simprepro-mongodb-primary mongosh -u admin -p <password> \
  --authenticationDatabase admin --eval "
    rs.remove('172.22.0.11:27017');
    rs.add('172.22.0.11:27017');
  "
```

---

## Document History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2025-10-02 | DevOps Team | Initial creation |

---

**End of Document**
