# Network Security Configuration - SimplePro v3

This document outlines the comprehensive network security measures implemented in SimplePro v3 to address exposed ports and ensure production-ready security.

## Overview

SimplePro v3 implements a multi-layered network security architecture with:

- **Network Segmentation**: Multiple isolated networks for different service tiers
- **Zero External Database Exposure**: All databases accessible only via internal networks
- **Reverse Proxy Architecture**: Single point of external access through nginx
- **Container Security**: Non-root users, capability restrictions, and security options
- **SSL/TLS Termination**: Modern encryption protocols and cipher suites
- **Rate Limiting**: Protection against DoS and brute force attacks

## Network Architecture

### Development Environment (`docker-compose.dev-secure.yml`)

#### Networks

1. **frontend-network** (172.20.0.0/24)
   - External access allowed (nginx only)
   - Web application and reverse proxy

2. **backend-network** (172.21.0.0/24)
   - Internal only
   - API services and internal communication

3. **storage-network** (172.22.0.0/24)
   - Internal only
   - Databases, cache, and file storage

4. **monitoring-network** (172.23.0.0/24)
   - Internal only
   - Observability and monitoring tools

#### Exposed Ports (Development)

- **Port 80**: HTTP (nginx) - redirects to HTTPS
- **Port 443**: HTTPS (nginx) - main application access
- **Port 9001**: MinIO Console (localhost only) - for development debugging
- **Port 8081**: Mongo Express (localhost only) - database administration

### Production Environment (`docker-compose.prod-secure.yml`)

#### Networks

Same network structure as development but with stricter security:

1. **frontend-network** (172.20.0.0/24)
   - External access via nginx only
   - Connection limits and rate limiting

2. **backend-network** (172.21.0.0/24)
   - Internal only
   - API and microservices

3. **storage-network** (172.22.0.0/24)
   - Internal only
   - Databases and persistent storage

4. **monitoring-network** (172.23.0.0/24)
   - Internal only
   - Prometheus, Grafana, and exporters

#### Exposed Ports (Production)

- **Port 80**: HTTP (nginx) - redirects to HTTPS only
- **Port 443**: HTTPS (nginx) - main application access only

## Security Improvements Implemented

### 1. Eliminated Direct Database Access

**Before:**

```yaml
# Insecure - Direct external access
ports:
  - '27017:27017' # MongoDB
  - '6379:6379' # Redis
  - '9000:9000' # MinIO API
```

**After:**

```yaml
# Secure - No direct external access
# Databases only accessible via internal networks
networks:
  - storage-network # Internal only
```

### 2. Network Segmentation

**Implementation:**

- **Frontend Network**: Web UI and reverse proxy only
- **Backend Network**: API services and business logic
- **Storage Network**: Databases, cache, and file storage
- **Monitoring Network**: Observability tools

**Benefits:**

- Prevents lateral movement between service tiers
- Isolates sensitive data storage
- Enables granular access control

### 3. Reverse Proxy Security

**nginx Configuration Features:**

- SSL/TLS termination with modern protocols (TLS 1.2/1.3)
- Security headers (HSTS, CSP, X-Frame-Options, etc.)
- Rate limiting per endpoint and IP
- Request filtering and validation
- Connection limits

### 4. Container Security Hardening

**Implemented Measures:**

```yaml
security_opt:
  - no-new-privileges:true
cap_drop:
  - ALL
cap_add:
  - CHOWN # Only necessary capabilities
  - SETGID
  - SETUID
```

**Non-root Users:**
All containers run as non-root users with minimal privileges.

### 5. SSL/TLS Security

**Production Configuration:**

- Modern TLS protocols (1.2 and 1.3 only)
- Secure cipher suites
- OCSP stapling
- HSTS with preload
- Perfect Forward Secrecy

## File Structure

```
SimplePro-v3/
├── docker-compose.dev-secure.yml       # Secure development configuration
├── docker-compose.prod-secure.yml      # Secure production configuration
├── docker/nginx/
│   ├── dev.conf                        # Development nginx configuration
│   ├── prod.conf                       # Production nginx configuration
│   └── nginx.conf                      # Base nginx configuration
├── scripts/
│   └── network-security-test.sh        # Security testing script
└── NETWORK-SECURITY.md                 # This documentation
```

## Deployment Instructions

### Development Environment

1. **Start the secure development environment:**

   ```bash
   docker-compose -f docker-compose.dev-secure.yml up -d
   ```

2. **Verify security configuration:**

   ```bash
   ./scripts/network-security-test.sh dev test
   ```

3. **Access applications:**
   - Main Application: https://localhost
   - MinIO Console: http://localhost:9001 (localhost only)
   - Mongo Express: http://localhost:8081 (localhost only)

### Production Environment

1. **Set required environment variables:**

   ```bash
   export MONGODB_PASSWORD="secure_mongodb_password"
   export REDIS_PASSWORD="secure_redis_password"
   export JWT_SECRET="secure_jwt_secret"
   export JWT_REFRESH_SECRET="secure_refresh_secret"
   export CORS_ORIGIN="https://yourdomain.com"
   export GRAFANA_ADMIN_PASSWORD="secure_grafana_password"
   ```

2. **Start the secure production environment:**

   ```bash
   docker-compose -f docker-compose.prod-secure.yml up -d
   ```

3. **Verify security configuration:**

   ```bash
   ./scripts/network-security-test.sh prod test
   ```

4. **Access applications:**
   - Main Application: https://yourdomain.com
   - Internal Monitoring: https://yourdomain.com/internal/monitoring/ (internal networks only)

## Security Testing

### Automated Testing

The included security test script validates:

- **Port Accessibility**: Ensures only intended ports are externally accessible
- **Network Isolation**: Verifies services cannot communicate across network boundaries
- **Container Security**: Checks non-root execution and security options
- **SSL/TLS Configuration**: Validates encryption protocols and certificates
- **Rate Limiting**: Tests denial-of-service protection

### Running Tests

```bash
# Test development environment
./scripts/network-security-test.sh dev test

# Test production environment
./scripts/network-security-test.sh prod test

# Show network information
./scripts/network-security-test.sh dev info
```

### Manual Verification

1. **Verify Database Isolation:**

   ```bash
   # Should fail - no external access
   telnet localhost 27017
   telnet localhost 6379
   ```

2. **Verify Web Access:**

   ```bash
   # Should work - external access via nginx
   curl -I https://localhost
   ```

3. **Check Network Configuration:**
   ```bash
   docker network ls
   docker network inspect storage-network
   ```

## Security Headers

### Production Headers Applied

```nginx
# HSTS - Force HTTPS
Strict-Transport-Security: max-age=31536000; includeSubDomains; preload

# Frame protection
X-Frame-Options: DENY

# Content type protection
X-Content-Type-Options: nosniff

# XSS protection
X-XSS-Protection: 1; mode=block

# Referrer policy
Referrer-Policy: strict-origin-when-cross-origin

# Content Security Policy
Content-Security-Policy: default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'...

# Feature policy
Permissions-Policy: camera=(), microphone=(), geolocation=()
```

## Rate Limiting Configuration

### Production Limits

- **API Endpoints**: 100 requests/minute per IP
- **Web Application**: 200 requests/minute per IP
- **Write Operations**: 30 requests/minute per IP
- **Monitoring Access**: 10 requests/minute per IP

### Development Limits

- **API Endpoints**: 1000 requests/minute per IP (more permissive for development)
- **Web Application**: 2000 requests/minute per IP

## Monitoring and Alerting

### Internal Monitoring Access

Production monitoring is accessible only from internal networks:

- **URL**: `https://yourdomain.com/internal/monitoring/`
- **Access**: Restricted to Docker networks and private IP ranges
- **Authentication**: Grafana admin credentials required

### Security Metrics

Monitored security metrics include:

- Failed authentication attempts
- Rate limiting triggers
- Unusual network patterns
- SSL certificate expiration
- Container security violations

## Environment Variables

### Required Production Variables

```bash
# Database Security
MONGODB_USERNAME=admin
MONGODB_PASSWORD=<secure_password>
REDIS_PASSWORD=<secure_password>

# Application Security
JWT_SECRET=<secure_jwt_secret>
JWT_REFRESH_SECRET=<secure_refresh_secret>

# Network Security
CORS_ORIGIN=https://yourdomain.com
DOMAIN_NAME=yourdomain.com

# Monitoring Security
GRAFANA_ADMIN_PASSWORD=<secure_password>

# Storage Security
MINIO_ROOT_USER=<secure_username>
MINIO_ROOT_PASSWORD=<secure_password>
```

## Troubleshooting

### Common Issues

1. **Cannot Access Database from Application:**
   - Verify both services are on the same internal network
   - Check network configuration in docker-compose file
   - Ensure database service is healthy

2. **SSL Certificate Errors:**
   - Verify certificate files exist in `./docker/ssl/`
   - Check certificate validity and format
   - Ensure proper file permissions

3. **Rate Limiting Too Aggressive:**
   - Adjust limits in nginx configuration
   - Check nginx error logs for 429 responses
   - Consider IP whitelisting for internal tools

### Debug Commands

```bash
# Check container network assignments
docker inspect <container_name> | grep NetworkMode

# Test internal connectivity
docker exec -it <container> nc -z <target_host> <port>

# View nginx logs
docker logs simplepro-nginx-prod

# Check network isolation
docker network inspect <network_name>
```

## Security Best Practices

### 1. Regular Updates

- Keep base images updated
- Update nginx and SSL configurations
- Rotate secrets and certificates regularly

### 2. Access Control

- Use strong passwords for all services
- Implement proper user roles and permissions
- Monitor access logs regularly

### 3. Network Security

- Regularly review network configurations
- Monitor for unusual traffic patterns
- Keep firewall rules updated

### 4. Container Security

- Scan images for vulnerabilities
- Use minimal base images
- Implement resource limits

## Compliance and Standards

This configuration follows:

- **OWASP Security Guidelines**
- **Docker Security Best Practices**
- **nginx Security Recommendations**
- **SSL/TLS Security Standards**
- **Network Segmentation Principles**

## Migration from Original Configuration

To migrate from the original insecure configuration:

1. **Backup existing data:**

   ```bash
   docker-compose -f docker-compose.prod.yml down
   # Backup volumes if needed
   ```

2. **Update application configurations:**
   - Update database connection strings to use service names instead of localhost:port
   - Remove direct port dependencies in application code

3. **Deploy secure configuration:**

   ```bash
   docker-compose -f docker-compose.prod-secure.yml up -d
   ```

4. **Verify security:**
   ```bash
   ./scripts/network-security-test.sh prod test
   ```

This comprehensive network security implementation ensures SimplePro v3 meets production security requirements while maintaining development workflow efficiency.
