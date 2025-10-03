# SimplePro Docker Deployment Guide

**Version:** 1.0.0
**Last Updated:** October 2, 2025
**Status:** Production Ready

## Table of Contents

1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Prerequisites](#prerequisites)
4. [Quick Start](#quick-start)
5. [Building Docker Images](#building-docker-images)
6. [Environment Configuration](#environment-configuration)
7. [Deployment Strategies](#deployment-strategies)
8. [Monitoring & Logging](#monitoring--logging)
9. [Scaling Guidelines](#scaling-guidelines)
10. [Troubleshooting](#troubleshooting)
11. [Security Best Practices](#security-best-practices)
12. [Backup & Recovery](#backup--recovery)

---

## Overview

SimplePro uses a containerized microservices architecture with Docker for consistent deployment across all environments. This guide covers production deployment using Docker Compose and provides guidance for Kubernetes deployment.

### Technology Stack

- **API**: NestJS running on Node.js 20 Alpine
- **Web**: Next.js 14 with standalone output
- **Database**: MongoDB 7.0 with replica set support
- **Cache**: Redis 7 with persistence
- **Storage**: MinIO (S3-compatible)
- **Monitoring**: Prometheus + Grafana
- **Reverse Proxy**: Nginx (production only)

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                         Nginx (80/443)                       │
│                    SSL Termination & Routing                 │
└──────────────┬─────────────────────────────┬────────────────┘
               │                             │
       ┌───────▼──────────┐         ┌───────▼──────────┐
       │   Web App        │         │   API Server     │
       │   Next.js        │         │   NestJS         │
       │   Port: 3009     │         │   Port: 4000     │
       └──────────────────┘         └─────────┬────────┘
                                              │
                    ┌─────────────────────────┼──────────────────┐
                    │                         │                  │
            ┌───────▼────────┐      ┌────────▼─────┐   ┌────────▼──────┐
            │   MongoDB      │      │    Redis     │   │    MinIO      │
            │   Port: 27017  │      │  Port: 6379  │   │  Port: 9000   │
            └────────────────┘      └──────────────┘   └───────────────┘
                    │
            ┌───────▼────────┐
            │   Prometheus   │──────┐
            │   Port: 9090   │      │
            └────────────────┘      │
                                    │
                            ┌───────▼────────┐
                            │    Grafana     │
                            │   Port: 3001   │
                            └────────────────┘
```

---

## Prerequisites

### System Requirements

**Minimum (Development/Staging):**
- CPU: 4 cores
- RAM: 8 GB
- Disk: 50 GB SSD
- OS: Linux (Ubuntu 22.04 LTS recommended), macOS, or Windows with WSL2

**Recommended (Production):**
- CPU: 8+ cores
- RAM: 16+ GB
- Disk: 200+ GB SSD
- OS: Linux (Ubuntu 22.04 LTS)

### Software Requirements

- Docker Engine 24.0+ (`docker --version`)
- Docker Compose 2.20+ (`docker-compose --version`)
- Git 2.30+ (`git --version`)
- OpenSSL 1.1+ (for SSL certificates)

### Installation

**Ubuntu/Debian:**
```bash
# Install Docker
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER

# Install Docker Compose
sudo apt-get update
sudo apt-get install docker-compose-plugin

# Verify installation
docker --version
docker compose version
```

**macOS:**
```bash
# Install Docker Desktop from https://www.docker.com/products/docker-desktop
brew install --cask docker

# Verify installation
docker --version
docker compose version
```

**Windows:**
- Install Docker Desktop with WSL2 backend
- Enable WSL2 integration in Docker Desktop settings

---

## Quick Start

### 1. Clone Repository

```bash
git clone https://github.com/your-org/simplepro-v3.git
cd simplepro-v3
```

### 2. Configure Environment

```bash
# Copy production environment template
cp .env.production.example .env.production

# Edit with your production secrets
nano .env.production
```

**Required Configuration:**
- Change all `CHANGE_ME_*` values
- Set strong passwords (minimum 32 characters)
- Configure domain names
- Set up external service credentials (SMTP, Twilio, Firebase)

### 3. Create Required Directories

```bash
# Create data directories for persistent volumes
mkdir -p data/mongodb data/redis data/minio backups logs

# Set proper permissions
chmod 755 data backups logs
```

### 4. Build Images

```bash
# Build all production images
docker-compose -f docker-compose.prod.yml build

# Verify build succeeded
docker images | grep simplepro
```

### 5. Start Services

```bash
# Start all services in detached mode
docker-compose -f docker-compose.prod.yml up -d

# Watch logs
docker-compose -f docker-compose.prod.yml logs -f

# Check service health
docker-compose -f docker-compose.prod.yml ps
```

### 6. Verify Deployment

```bash
# Health checks
curl http://localhost:3001/api/health
curl http://localhost:3009/

# Access services
# Web Dashboard: http://localhost:3009
# API: http://localhost:3001
# MinIO Console: http://localhost:9001
# Grafana: http://localhost:3001 (Grafana port)
# Prometheus: http://localhost:9090
```

---

## Building Docker Images

### Local Build

```bash
# Build specific service
docker-compose -f docker-compose.prod.yml build api
docker-compose -f docker-compose.prod.yml build web

# Build all services
docker-compose -f docker-compose.prod.yml build

# Build with specific version
VERSION=1.2.3 BUILD_DATE=$(date -u +"%Y-%m-%dT%H:%M:%SZ") VCS_REF=$(git rev-parse --short HEAD) \
  docker-compose -f docker-compose.prod.yml build
```

### Build with Docker Directly

```bash
# API
docker build -t simplepro-api:latest \
  --build-arg BUILD_DATE=$(date -u +"%Y-%m-%dT%H:%M:%SZ") \
  --build-arg VCS_REF=$(git rev-parse HEAD) \
  --build-arg VERSION=1.0.0 \
  -f apps/api/Dockerfile .

# Web
docker build -t simplepro-web:latest \
  --build-arg BUILD_DATE=$(date -u +"%Y-%m-%dT%H:%M:%SZ") \
  --build-arg VCS_REF=$(git rev-parse HEAD) \
  --build-arg VERSION=1.0.0 \
  -f apps/web/Dockerfile .
```

### Multi-Architecture Build

```bash
# Create buildx builder
docker buildx create --name simplepro-builder --use
docker buildx inspect --bootstrap

# Build for multiple platforms
docker buildx build \
  --platform linux/amd64,linux/arm64 \
  --build-arg BUILD_DATE=$(date -u +"%Y-%m-%dT%H:%M:%SZ") \
  --build-arg VCS_REF=$(git rev-parse HEAD) \
  --build-arg VERSION=1.0.0 \
  -f apps/api/Dockerfile \
  -t simplepro-api:latest \
  --push .
```

### Image Size Verification

```bash
# Check built image sizes
docker images | grep simplepro

# Expected sizes:
# - API: ~150-200 MB
# - Web: ~100-150 MB

# Analyze image layers
docker history simplepro-api:latest
docker history simplepro-web:latest
```

---

## Environment Configuration

### Environment Files

**`.env.production`** - Production secrets (NEVER commit to git)
```bash
# MongoDB
MONGODB_USERNAME=admin
MONGODB_PASSWORD=SecurePassword123!@#
MONGODB_DATABASE=simplepro_prod

# Redis
REDIS_PASSWORD=SecureRedisPassword456!@#

# JWT
JWT_SECRET=your-super-secret-jwt-key-minimum-32-characters-long
JWT_REFRESH_SECRET=your-super-secret-refresh-key-minimum-32-characters

# MinIO
MINIO_ROOT_USER=minioadmin
MINIO_ROOT_PASSWORD=SecureMinioPassword789!@#

# Application
NEXT_PUBLIC_API_URL=https://api.yourdomain.com
ALLOWED_ORIGINS=https://yourdomain.com,https://www.yourdomain.com
```

### Environment Variables Reference

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `MONGODB_USERNAME` | Yes | admin | MongoDB admin username |
| `MONGODB_PASSWORD` | Yes | - | MongoDB admin password |
| `REDIS_PASSWORD` | Yes | - | Redis authentication password |
| `JWT_SECRET` | Yes | - | JWT access token secret |
| `JWT_REFRESH_SECRET` | Yes | - | JWT refresh token secret |
| `MINIO_ROOT_USER` | Yes | - | MinIO admin username |
| `MINIO_ROOT_PASSWORD` | Yes | - | MinIO admin password |
| `NEXT_PUBLIC_API_URL` | Yes | - | Public API URL for web app |
| `ALLOWED_ORIGINS` | Yes | - | CORS allowed origins |
| `LOG_LEVEL` | No | info | Logging level (debug, info, warn, error) |
| `GRAFANA_ADMIN_PASSWORD` | Yes | - | Grafana admin password |

### Secrets Management

**Production Best Practices:**

1. **Never commit secrets to git**
   - Use `.gitignore` for `.env.production`
   - Use environment-specific files

2. **Use external secret management**
   ```bash
   # AWS Secrets Manager
   aws secretsmanager get-secret-value --secret-id simplepro/prod/mongodb-password

   # HashiCorp Vault
   vault kv get secret/simplepro/production/mongodb
   ```

3. **Docker Secrets (Swarm)**
   ```bash
   # Create secret
   echo "my-secure-password" | docker secret create mongodb_password -

   # Use in compose
   services:
     mongodb:
       secrets:
         - mongodb_password
   ```

---

## Deployment Strategies

### 1. Rolling Update (Default)

**Best for:** Staging, minimal downtime required

```bash
# Update single service
docker-compose -f docker-compose.prod.yml up -d --no-deps --force-recreate api

# Update all services sequentially
docker-compose -f docker-compose.prod.yml up -d --no-deps api
docker-compose -f docker-compose.prod.yml up -d --no-deps web
```

### 2. Blue-Green Deployment

**Best for:** Production, zero downtime, instant rollback

```bash
# Start new version alongside old (blue-green)
docker-compose -f docker-compose.prod.yml up -d --no-deps --scale api=2 api

# Wait and verify health
sleep 30
docker-compose -f docker-compose.prod.yml exec api curl -f http://localhost:4000/api/health

# Scale down to 1 (removes old version)
docker-compose -f docker-compose.prod.yml up -d --no-deps --scale api=1 api
```

### 3. Canary Deployment

**Best for:** Production, gradual rollout, risk mitigation

```bash
# Deploy canary (10% traffic)
docker-compose -f docker-compose.prod.yml up -d --scale api=10 api
# Configure nginx to route 10% traffic to canary

# Monitor metrics for 30 minutes
# If successful, complete rollout
docker-compose -f docker-compose.prod.yml up -d --no-deps api
```

### 4. CI/CD Automated Deployment

The GitHub Actions workflow (`.github/workflows/cd.yml`) handles automated deployment:

- **Staging**: Triggered on push to `develop` branch
- **Production**: Triggered on push to `main` branch
- **Manual**: Workflow dispatch with environment selection

**Workflow includes:**
- Docker image build and push to GitHub Container Registry
- Security scanning with Trivy
- Blue-green deployment with health checks
- Automatic rollback on failure
- Slack notifications
- Post-deployment monitoring

---

## Monitoring & Logging

### Prometheus Metrics

**Access:** http://localhost:9090

**Key Metrics:**
- API response times
- Request rates
- Error rates
- Database connection pool
- Redis hit/miss ratio
- Container resource usage

**Sample Queries:**
```promql
# API request rate
rate(http_requests_total[5m])

# Error rate
rate(http_errors_total[5m]) / rate(http_requests_total[5m])

# P95 response time
histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m]))
```

### Grafana Dashboards

**Access:** http://localhost:3001
**Default Credentials:** admin / (from GRAFANA_ADMIN_PASSWORD)

**Pre-configured Dashboards:**
1. **SimplePro Overview** - System health, request rates, error rates
2. **MongoDB Metrics** - Operations/sec, connections, replication lag
3. **Redis Metrics** - Hit rate, memory usage, commands/sec
4. **Node.js Metrics** - Event loop lag, heap usage, GC stats
5. **Container Resources** - CPU, memory, network, disk I/O

### Logging

**View Logs:**
```bash
# All services
docker-compose -f docker-compose.prod.yml logs -f

# Specific service
docker-compose -f docker-compose.prod.yml logs -f api

# Last 100 lines
docker-compose -f docker-compose.prod.yml logs --tail=100 api

# Since specific time
docker-compose -f docker-compose.prod.yml logs --since 2025-10-02T10:00:00 api
```

**Log Rotation:**
```bash
# Configure in docker-compose.yml
services:
  api:
    logging:
      driver: "json-file"
      options:
        max-size: "10m"
        max-file: "3"
```

**Centralized Logging (Production):**
- Use ELK Stack (Elasticsearch, Logstash, Kibana)
- Use Loki + Grafana
- Use cloud provider logging (AWS CloudWatch, Azure Monitor)

---

## Scaling Guidelines

### Horizontal Scaling

**API Service:**
```bash
# Scale to 3 instances
docker-compose -f docker-compose.prod.yml up -d --scale api=3

# Nginx automatically load balances
# Ensure shared session storage (Redis)
```

**Web Service:**
```bash
# Scale to 2 instances
docker-compose -f docker-compose.prod.yml up -d --scale web=2
```

**MongoDB Replica Set:**
```bash
# Convert to replica set (requires custom compose file)
# See docs/deployment/MONGODB_REPLICATION.md
```

### Vertical Scaling

**Update Resource Limits:**
```yaml
# docker-compose.prod.yml
services:
  api:
    deploy:
      resources:
        limits:
          cpus: '4.0'
          memory: 4G
        reservations:
          cpus: '2.0'
          memory: 2G
```

### Auto-Scaling (Kubernetes)

```yaml
# kubernetes/hpa.yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: simplepro-api-hpa
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: simplepro-api
  minReplicas: 2
  maxReplicas: 10
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 70
```

### Performance Tuning

**Database:**
- Index optimization
- Connection pooling (default: 10 connections)
- Query optimization
- Read replicas for read-heavy workloads

**Redis:**
- Increase maxmemory for caching
- Configure eviction policy (allkeys-lru)
- Enable persistence for critical data

**API:**
- Enable cluster mode for multi-core usage
- Optimize build size (current: ~150MB)
- Enable compression (gzip)
- Implement caching strategies

---

## Troubleshooting

### Common Issues

#### 1. Container Won't Start

```bash
# Check logs
docker-compose -f docker-compose.prod.yml logs api

# Check container status
docker-compose -f docker-compose.prod.yml ps

# Inspect container
docker inspect simplepro-api-prod

# Common fixes:
# - Check environment variables
# - Verify volume mounts
# - Check port conflicts
# - Ensure dependencies are healthy
```

#### 2. Database Connection Failed

```bash
# Verify MongoDB is running
docker-compose -f docker-compose.prod.yml ps mongodb

# Check MongoDB logs
docker-compose -f docker-compose.prod.yml logs mongodb

# Test connection
docker-compose -f docker-compose.prod.yml exec mongodb mongosh \
  -u admin -p $MONGODB_PASSWORD --authenticationDatabase admin

# Common fixes:
# - Verify MONGODB_URI format
# - Check network connectivity
# - Ensure credentials are correct
# - Check MongoDB health status
```

#### 3. Redis Connection Failed

```bash
# Test Redis connection
docker-compose -f docker-compose.prod.yml exec redis redis-cli -a $REDIS_PASSWORD ping

# Common fixes:
# - Verify REDIS_PASSWORD
# - Check Redis container health
# - Verify network connectivity
```

#### 4. Out of Memory

```bash
# Check container memory usage
docker stats

# Increase memory limits
# Edit docker-compose.prod.yml resources.limits.memory

# Restart with new limits
docker-compose -f docker-compose.prod.yml up -d --no-deps api
```

#### 5. Build Failures

```bash
# Clear build cache
docker-compose -f docker-compose.prod.yml build --no-cache

# Check disk space
df -h

# Clean up unused images
docker system prune -a

# Rebuild with verbose output
docker-compose -f docker-compose.prod.yml build --progress=plain
```

### Health Check Endpoints

| Service | Endpoint | Expected Response |
|---------|----------|-------------------|
| API | http://localhost:3001/api/health | `{"status":"ok","timestamp":"..."}` |
| Web | http://localhost:3009/ | HTML page |
| MongoDB | `mongosh --eval "db.adminCommand('ping')"` | `{ ok: 1 }` |
| Redis | `redis-cli ping` | `PONG` |
| MinIO | http://localhost:9000/minio/health/live | HTTP 200 |
| Prometheus | http://localhost:9090/-/healthy | HTTP 200 |
| Grafana | http://localhost:3001/api/health | `{"database":"ok"}` |

---

## Security Best Practices

### 1. Image Security

```bash
# Scan for vulnerabilities
docker scan simplepro-api:latest
docker scan simplepro-web:latest

# Use Trivy for comprehensive scanning
docker run --rm -v /var/run/docker.sock:/var/run/docker.sock \
  aquasec/trivy image simplepro-api:latest
```

### 2. Network Security

```yaml
# Isolate services with custom networks
networks:
  frontend:
    driver: bridge
  backend:
    driver: bridge
    internal: true  # No external access

services:
  web:
    networks:
      - frontend
  api:
    networks:
      - frontend
      - backend
  mongodb:
    networks:
      - backend  # Only accessible by API
```

### 3. Secret Management

- Never use default passwords
- Rotate secrets regularly (quarterly)
- Use strong passwords (minimum 32 characters)
- Store secrets in external vaults (AWS Secrets Manager, HashiCorp Vault)
- Enable encryption at rest for databases

### 4. SSL/TLS Configuration

```bash
# Generate self-signed certificates (development only)
npm run ssl:generate

# Production: Use Let's Encrypt
certbot certonly --webroot -w /var/www/html -d yourdomain.com
```

### 5. Container Hardening

- Run as non-root user ✅ (already implemented)
- Read-only root filesystem where possible
- Drop unnecessary capabilities
- Enable security options
- Scan images regularly

### 6. Audit Logging

- Enable MongoDB audit logging
- Log all authentication attempts
- Monitor failed login attempts
- Set up alerting for suspicious activity

---

## Backup & Recovery

### Automated Backups

```bash
# Run backup script
npm run backup:create

# Schedule with cron (daily at 2 AM)
0 2 * * * cd /opt/simplepro && npm run backup:create
```

### Manual MongoDB Backup

```bash
# Create backup
docker-compose -f docker-compose.prod.yml exec -T mongodb \
  mongodump --username admin --password $MONGODB_PASSWORD \
  --authenticationDatabase admin --out=/backup/$(date +%Y%m%d)

# Copy from container
docker cp simplepro-mongodb-prod:/backup/$(date +%Y%m%d) ./backups/

# Compress backup
tar -czf backups/mongodb-$(date +%Y%m%d).tar.gz backups/$(date +%Y%m%d)
```

### Restore from Backup

```bash
# Extract backup
tar -xzf backups/mongodb-20251002.tar.gz -C /tmp/

# Copy to container
docker cp /tmp/20251002 simplepro-mongodb-prod:/backup/

# Restore
docker-compose -f docker-compose.prod.yml exec mongodb \
  mongorestore --username admin --password $MONGODB_PASSWORD \
  --authenticationDatabase admin /backup/20251002
```

### Disaster Recovery Plan

1. **Backup Strategy:**
   - Daily automated backups
   - Weekly full backups
   - Monthly archival backups
   - Offsite backup storage (S3, Azure Blob)

2. **Recovery Time Objective (RTO):** < 4 hours
3. **Recovery Point Objective (RPO):** < 24 hours

4. **Recovery Procedure:**
   ```bash
   # 1. Restore infrastructure
   docker-compose -f docker-compose.prod.yml up -d mongodb redis minio

   # 2. Restore database
   # (See restore commands above)

   # 3. Restore application
   docker-compose -f docker-compose.prod.yml up -d api web

   # 4. Verify health
   curl http://localhost:3001/api/health
   ```

---

## Resource Requirements by Environment

### Development
- **API**: 256MB RAM, 0.5 CPU
- **Web**: 256MB RAM, 0.5 CPU
- **MongoDB**: 512MB RAM, 0.5 CPU
- **Redis**: 128MB RAM, 0.25 CPU
- **Total**: ~2GB RAM, 2 CPU

### Staging
- **API**: 512MB RAM, 1 CPU
- **Web**: 512MB RAM, 0.5 CPU
- **MongoDB**: 1GB RAM, 1 CPU
- **Redis**: 256MB RAM, 0.5 CPU
- **Total**: ~4GB RAM, 4 CPU

### Production
- **API**: 1-2GB RAM, 2-4 CPU (scalable)
- **Web**: 512MB-1GB RAM, 1-2 CPU (scalable)
- **MongoDB**: 2-4GB RAM, 2-4 CPU
- **Redis**: 512MB-1GB RAM, 1 CPU
- **Monitoring**: 1GB RAM, 1 CPU
- **Total**: ~8-16GB RAM, 8-16 CPU

---

## Support & Additional Resources

- **Documentation:** `/docs`
- **API Docs:** http://localhost:3001/api/docs (Swagger)
- **GraphQL Playground:** http://localhost:3001/graphql
- **Project Repository:** https://github.com/your-org/simplepro-v3
- **Issue Tracker:** https://github.com/your-org/simplepro-v3/issues

---

**Last Updated:** October 2, 2025
**Maintained by:** Simple Moves DevOps Team
