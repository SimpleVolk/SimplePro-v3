# Staging Deployment Quick Reference

**Quick access guide for SimplePro-v3 staging deployment**

## Quick Start

```bash
# 1. Deploy staging environment
./scripts/setup-staging.sh

# 2. Run smoke tests
./scripts/smoke-test-staging.sh

# 3. Access the application
# Web: https://localhost
# Login: admin / Admin123!
```

## Essential Commands

### Deployment

```bash
# Full setup (first time)
./scripts/setup-staging.sh

# Check prerequisites only
./scripts/setup-staging.sh --check-prereqs

# Show service status
./scripts/setup-staging.sh --status
docker-compose -f docker-compose.staging.yml ps

# View logs
docker-compose -f docker-compose.staging.yml logs -f
docker-compose -f docker-compose.staging.yml logs -f api
docker-compose -f docker-compose.staging.yml logs -f web
```

### Testing

```bash
# Run all smoke tests
./scripts/smoke-test-staging.sh

# Manual health checks
curl http://localhost:3001/api/health
curl http://localhost:3009/
curl -k https://localhost/health
```

### Service Management

```bash
# Stop all services
docker-compose -f docker-compose.staging.yml stop

# Start all services
docker-compose -f docker-compose.staging.yml start

# Restart specific service
docker-compose -f docker-compose.staging.yml restart api
docker-compose -f docker-compose.staging.yml restart web

# Rebuild and restart
docker-compose -f docker-compose.staging.yml up -d --build api
```

### Cleanup

```bash
# Quick cleanup (containers only)
./scripts/cleanup-staging.sh quick

# Full cleanup (includes volumes)
./scripts/cleanup-staging.sh full

# Complete cleanup (everything)
./scripts/cleanup-staging.sh complete

# Check what's running
./scripts/cleanup-staging.sh status
```

## Access URLs

| Service | URL | Credentials |
|---------|-----|-------------|
| **Web App (HTTPS)** | https://localhost | admin / Admin123! |
| **Web App (HTTP)** | http://localhost:3009 | admin / Admin123! |
| **API** | http://localhost:3001 | - |
| **API Docs** | http://localhost:3001/api/docs | - |
| **MinIO Console** | http://localhost:9001 | See `.secrets/staging/.env` |
| **Grafana** | http://localhost:3000 | admin / (see secrets) |
| **Prometheus** | http://localhost:9090 | - |

## Default Credentials

### Application
- **Username:** `admin`
- **Password:** `Admin123!`

### Infrastructure
- **MongoDB:** `admin` / (see `.secrets/staging/mongodb_password`)
- **Redis:** (see `.secrets/staging/redis_password`)
- **MinIO:** `staging-admin` / (see `.secrets/staging/minio_root_password`)
- **Grafana:** `admin` / (see `.secrets/staging/grafana_password`)

### View Secrets

```bash
# View all secrets
cat .secrets/staging/.env

# View specific secret
cat .secrets/staging/mongodb_password
cat .secrets/staging/grafana_password
```

## Common Tasks

### Get Access Token

```bash
# Login and get token
TOKEN=$(curl -s -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"Admin123!"}' | jq -r '.accessToken')

# Use token for authenticated request
curl -H "Authorization: Bearer $TOKEN" http://localhost:3001/api/customers
```

### Test File Upload

```bash
# Create test file
echo "Test content" > test-file.txt

# Upload file (requires token)
curl -X POST http://localhost:3001/api/documents/upload \
  -H "Authorization: Bearer $TOKEN" \
  -F "file=@test-file.txt"
```

### Database Access

```bash
# MongoDB shell
docker exec -it simplepro-mongodb-staging mongosh \
  -u admin -p $(cat .secrets/staging/mongodb_password) \
  --authenticationDatabase admin

# MongoDB queries
docker exec simplepro-mongodb-staging mongosh \
  -u admin -p $(cat .secrets/staging/mongodb_password) \
  --authenticationDatabase admin \
  --eval "db.getSiblingDB('simplepro_staging').users.find()"

# Redis CLI
docker exec -it simplepro-redis-staging redis-cli \
  -a $(cat .secrets/staging/redis_password)

# Redis commands
docker exec simplepro-redis-staging redis-cli \
  -a $(cat .secrets/staging/redis_password) KEYS '*'
```

### View Metrics

```bash
# Prometheus metrics
curl http://localhost:9090/api/v1/query?query=up

# API metrics
curl http://localhost:3001/metrics

# MongoDB metrics
curl http://localhost:9216/metrics

# Redis metrics
curl http://localhost:9121/metrics

# System metrics
curl http://localhost:9100/metrics
```

## Troubleshooting

### Services Won't Start

```bash
# Check logs
docker-compose -f docker-compose.staging.yml logs

# Check specific service
docker-compose -f docker-compose.staging.yml logs api
docker-compose -f docker-compose.staging.yml logs mongodb

# Check container status
docker ps -a | grep simplepro
```

### Port Conflicts

```bash
# Find what's using a port (Windows)
netstat -ano | findstr :3001

# Find what's using a port (Linux/Mac)
lsof -i :3001

# Stop all staging services
docker-compose -f docker-compose.staging.yml down
```

### Reset Everything

```bash
# Complete reset
./scripts/cleanup-staging.sh complete
./scripts/setup-staging.sh
```

### Health Check Failed

```bash
# Check service health
docker ps | grep simplepro

# Inspect health check
docker inspect simplepro-api-staging | jq '.[0].State.Health'

# Manual health check
curl http://localhost:3001/api/health
curl http://localhost:3009/
```

### SSL Certificate Issues

```bash
# Browser: Accept the self-signed certificate
# Or use curl with -k flag
curl -k https://localhost

# Regenerate certificates
rm -f docker/ssl/cert.pem docker/ssl/key.pem
./scripts/setup-staging.sh
```

### Secrets Missing

```bash
# Regenerate secrets
rm -rf .secrets/staging
./scripts/setup-staging.sh --generate-secrets
```

### Database Connection Failed

```bash
# Check MongoDB status
docker exec simplepro-mongodb-staging mongosh --eval "db.adminCommand('ping')"

# Check Redis status
docker exec simplepro-redis-staging redis-cli ping

# Restart database
docker-compose -f docker-compose.staging.yml restart mongodb
docker-compose -f docker-compose.staging.yml restart redis
```

## Performance Testing

### Basic Load Test

```bash
# Install Apache Bench
# Windows: Download from https://www.apachelounge.com/download/
# Mac: brew install ab
# Linux: sudo apt-get install apache2-utils

# Test health endpoint
ab -n 1000 -c 10 http://localhost:3001/api/health

# Test with authentication
ab -n 500 -c 10 \
  -H "Authorization: Bearer $TOKEN" \
  http://localhost:3001/api/customers
```

### Monitor Resources

```bash
# Real-time resource usage
docker stats

# Specific container
docker stats simplepro-api-staging

# Export metrics
docker stats --no-stream > staging-metrics.txt
```

## File Locations

### Configuration Files
- Docker Compose: `docker-compose.staging.yml`
- Nginx Config: `docker/nginx/staging.conf`
- Secrets: `.secrets/staging/`
- SSL Certs: `docker/ssl/`

### Scripts
- Setup: `scripts/setup-staging.sh`
- Smoke Tests: `scripts/smoke-test-staging.sh`
- Cleanup: `scripts/cleanup-staging.sh`

### Documentation
- Test Plan: `docs/deployment/STAGING_DEPLOYMENT_TEST_PLAN.md`
- Test Report: `docs/deployment/STAGING_DEPLOYMENT_TEST_REPORT.md`
- Quick Reference: `docs/deployment/STAGING_QUICK_REFERENCE.md`

### Logs
- Test Reports: `logs/staging/smoke-test-*.txt`
- Container Logs: Use `docker-compose logs`

## Test Suites

### Run Specific Test Suite

The smoke test script runs 10 test suites:
1. Infrastructure Health (10 tests)
2. API Health (8 tests)
3. Authentication (6 tests)
4. Database Operations (6 tests)
5. File Storage (5 tests)
6. WebSocket (3 tests)
7. Web Application (8 tests)
8. Monitoring (9 tests)
9. Security Validation (9 tests)
10. Performance Baseline (6 tests)

Total: 60+ automated tests

### Expected Results
- Pass Rate: > 95%
- Duration: 15-20 minutes
- Failed Tests: < 3

## Monitoring Checklist

### After Deployment

- [ ] All containers show "healthy" status
- [ ] API health endpoint returns 200
- [ ] Web application loads
- [ ] Can login with default credentials
- [ ] Prometheus shows all targets "UP"
- [ ] Grafana displays metrics
- [ ] No errors in logs

### During Testing

- [ ] Response times acceptable (< 1s)
- [ ] No memory leaks (check `docker stats`)
- [ ] No container restarts
- [ ] Authentication works correctly
- [ ] File upload/download works
- [ ] WebSocket connections establish

## Environment Variables

### Key Variables (in `.secrets/staging/.env`)

```bash
NODE_ENV=staging
MONGODB_PASSWORD=<random>
REDIS_PASSWORD=<random>
JWT_SECRET=<random>
JWT_REFRESH_SECRET=<random>
MINIO_ROOT_USER=staging-admin
MINIO_ROOT_PASSWORD=<random>
GRAFANA_ADMIN_PASSWORD=<random>
```

### Override Variables

```bash
# Set custom values before deployment
export MONGODB_PASSWORD=my-custom-password
export LOG_LEVEL=debug
./scripts/setup-staging.sh
```

## Network Information

### Network Details
- **Name:** simplepro-staging-network
- **Type:** Bridge
- **Subnet:** 172.25.0.0/16

### Service Communication
All services communicate using service names:
- `mongodb:27017`
- `redis:6379`
- `minio:9000`
- `api:4000`
- `web:3009`

### Inspect Network

```bash
# List networks
docker network ls | grep staging

# Inspect network
docker network inspect simplepro-staging-network

# Connected containers
docker network inspect simplepro-staging-network | jq '.[0].Containers'
```

## Data Persistence

### Volumes

All data persists in Docker volumes:
```bash
# List staging volumes
docker volume ls | grep staging

# Inspect volume
docker volume inspect simplepro-mongodb-staging

# Backup volume
docker run --rm -v simplepro-mongodb-staging:/data \
  -v $(pwd)/backups:/backup \
  alpine tar czf /backup/mongodb-backup.tar.gz /data
```

### Backup Data

```bash
# Create backup directory
mkdir -p backups/staging

# Backup MongoDB
docker exec simplepro-mongodb-staging mongodump \
  -u admin -p $(cat .secrets/staging/mongodb_password) \
  --authenticationDatabase admin \
  --out /tmp/backup

# Copy backup out
docker cp simplepro-mongodb-staging:/tmp/backup ./backups/staging/

# Backup MinIO
docker exec simplepro-minio-staging mc mirror \
  staging/simplepro-documents /tmp/minio-backup
```

## Support Contacts

For issues or questions:
- **Documentation:** `docs/deployment/`
- **Test Reports:** `logs/staging/`
- **Issue Tracker:** GitHub Issues
- **DevOps Team:** devops@simplepro.com

## Next Steps

After successful staging deployment:
1. Review test results
2. Fix any identified issues
3. Update documentation
4. Plan production deployment
5. Prepare production secrets
6. Acquire production SSL certificates

---

**Last Updated:** 2025-10-02
**Version:** 1.0.0
