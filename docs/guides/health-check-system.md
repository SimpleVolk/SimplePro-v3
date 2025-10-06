# Enhanced Health Check System

## Overview

The SimplePro-v3 API now includes a comprehensive health check system designed for production deployment with multiple levels of dependency validation, system resource monitoring, and external service health verification.

## Architecture

### Health Check Module Structure

```
apps/api/src/health/
├── health.module.ts              # Main health check module
├── health.controller.ts          # Enhanced health endpoints
├── health.service.ts             # Core health check orchestration
├── dto/
│   └── health-check.dto.ts       # Request/response DTOs
├── interfaces/
│   └── health-check.interface.ts # Type definitions
└── indicators/
    ├── database-health.indicator.ts          # MongoDB connectivity
    ├── redis-health.indicator.ts             # Redis connectivity
    ├── memory-health.indicator.ts            # System memory monitoring
    ├── disk-health.indicator.ts              # Disk space monitoring
    └── external-service-health.indicator.ts  # External API monitoring
```

## Health Check Levels

### 1. Basic Health Check (`/api/health/basic`)

- **Purpose**: Fast, minimal dependency validation
- **Checks**: MongoDB connectivity only
- **Timeout**: 2 seconds
- **Use Case**: Load balancer health probes

### 2. Detailed Health Check (`/api/health/detailed`)

- **Purpose**: Comprehensive infrastructure validation
- **Checks**: MongoDB, Redis, memory usage, disk space
- **Timeout**: 5 seconds for database, 3 seconds for Redis
- **Use Case**: Application monitoring dashboards

### 3. Full Health Check (`/api/health/full`)

- **Purpose**: Complete system and external dependency validation
- **Checks**: All infrastructure + external services (if configured)
- **Timeout**: Variable based on service configuration
- **Use Case**: Pre-deployment verification

## Kubernetes Probes

### Liveness Probe (`/api/health/liveness`)

- **Purpose**: Verify service is running and not deadlocked
- **Response Time**: < 100ms
- **Checks**: Basic process health, uptime, memory info
- **Failure Action**: Container restart

### Readiness Probe (`/api/health/readiness`)

- **Purpose**: Verify service is ready to receive traffic
- **Checks**: Database connectivity
- **Failure Action**: Remove from service endpoints

## Health Indicators

### Database Health Indicator

```typescript
// MongoDB connection validation
- Connection state verification
- Ping operation with timeout
- Server status retrieval
- Replica set information (if applicable)
- Connection pool statistics
```

### Redis Health Indicator

```typescript
// Redis connectivity and performance
- PING command execution
- Server information retrieval
- Memory usage statistics
- Keyspace information
- Client connection count
```

### Memory Health Indicator

```typescript
// System and heap memory monitoring
- System memory usage percentage
- Node.js heap utilization
- Configurable thresholds (default 90%)
- Process memory statistics
```

### Disk Health Indicator

```typescript
// Storage space monitoring
- Cross-platform disk usage detection
- Unix: df command integration
- Windows: PowerShell WMI queries
- Configurable thresholds (default 90%)
```

### External Service Health Indicator

```typescript
// Third-party service validation
- HTTP health endpoint checks
- Configurable service URLs
- Timeout and retry handling
- Status code validation
```

## API Endpoints

### Health Check Endpoints

| Endpoint                | Method | Description                | Response Time |
| ----------------------- | ------ | -------------------------- | ------------- |
| `/api/health`           | GET    | Configurable health check  | Variable      |
| `/api/health/basic`     | GET    | Basic infrastructure check | < 2s          |
| `/api/health/detailed`  | GET    | Comprehensive check        | < 8s          |
| `/api/health/full`      | GET    | Complete system check      | < 15s         |
| `/api/health/liveness`  | GET    | Kubernetes liveness probe  | < 100ms       |
| `/api/health/readiness` | GET    | Kubernetes readiness probe | < 3s          |
| `/api/health/info`      | GET    | System information         | < 100ms       |

### Query Parameters

#### `/api/health` endpoint supports:

- `level`: `basic` | `detailed` | `full` (default: `basic`)
- `includeTiming`: boolean (default: `false`)

### Response Format

```json
{
  "status": "ok" | "error" | "shutting_down",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "service": "simplepro-api",
  "environment": "production",
  "version": "1.0.0",
  "info": {
    "database": {
      "status": "up",
      "responseTime": 45,
      "connections": {
        "active": 5,
        "available": 15,
        "total": 20
      }
    },
    "redis": {
      "status": "up",
      "responseTime": 12,
      "info": {
        "version": "7.0.0",
        "mode": "standalone",
        "connectedClients": 3,
        "usedMemory": 1048576
      }
    },
    "memory": {
      "status": "up",
      "memory": {
        "used": 536870912,
        "total": 8589934592,
        "percentage": 0.0625,
        "heap": {
          "used": 134217728,
          "total": 268435456,
          "percentage": 0.5
        }
      },
      "uptime": 3600,
      "nodeVersion": "v20.0.0",
      "processId": 12345
    }
  },
  "details": {
    "level": "detailed",
    "responseTime": 87,
    "checks": 4,
    "timestamp": "2024-01-01T00:00:00.000Z"
  }
}
```

## Configuration

### Environment Variables

```bash
# Health Check Thresholds
MEMORY_THRESHOLD=0.9          # 90% memory usage threshold
HEAP_THRESHOLD=0.9            # 90% heap usage threshold
DISK_THRESHOLD=0.9            # 90% disk usage threshold

# External Services (optional)
EXTERNAL_API_URL=https://api.example.com
WEBHOOK_SERVICE_URL=https://webhooks.example.com
NOTIFICATION_SERVICE_URL=https://notifications.example.com
STRIPE_ENABLED=true

# Redis Configuration
REDIS_URL=redis://localhost:6379
```

## Monitoring Integration

### Prometheus Metrics

The health check system provides metrics compatible with Prometheus monitoring:

```yaml
# Health check metrics
simplepro_health_check_duration_seconds
simplepro_health_check_status
simplepro_health_dependency_status
```

### Alerting Rules

```yaml
# Example Prometheus alerting rules
groups:
  - name: simplepro-health
    rules:
      - alert: HealthCheckFailed
        expr: simplepro_health_check_status != 1
        for: 5m
        annotations:
          summary: 'SimplePro health check failed'

      - alert: HighMemoryUsage
        expr: simplepro_health_memory_usage_ratio > 0.9
        for: 2m
        annotations:
          summary: 'High memory usage detected'
```

## Production Deployment

### Docker Health Check

```dockerfile
# Dockerfile health check configuration
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:4000/api/health/basic || exit 1
```

### Kubernetes Configuration

```yaml
# Kubernetes deployment with health checks
apiVersion: apps/v1
kind: Deployment
spec:
  template:
    spec:
      containers:
        - name: simplepro-api
          livenessProbe:
            httpGet:
              path: /api/health/liveness
              port: 4000
            initialDelaySeconds: 30
            periodSeconds: 10
            timeoutSeconds: 5
            failureThreshold: 3

          readinessProbe:
            httpGet:
              path: /api/health/readiness
              port: 4000
            initialDelaySeconds: 5
            periodSeconds: 5
            timeoutSeconds: 3
            failureThreshold: 3
```

## Security Considerations

1. **Public Endpoints**: Health check endpoints are marked as `@Public()` and bypass authentication
2. **Rate Limiting**: Health checks are subject to global rate limiting (100 req/min)
3. **Information Disclosure**: Production health checks hide detailed error messages
4. **Network Security**: Health endpoints should be restricted to internal networks in production

## Testing

### Unit Tests

```bash
# Run health check unit tests
npm run test -- --testPathPattern=health
```

### Integration Tests

```bash
# Test health endpoints
curl http://localhost:4000/api/health/basic
curl http://localhost:4000/api/health/detailed
curl http://localhost:4000/api/health/full
```

### Load Testing

```bash
# Test health endpoint performance
ab -n 1000 -c 10 http://localhost:4000/api/health/basic
```

## Error Handling

### Common Error Scenarios

1. **Database Connectivity Issues**
   - Connection timeout
   - Authentication failure
   - Network issues

2. **Redis Connectivity Issues**
   - Connection refused
   - Authentication failure
   - Memory full

3. **System Resource Issues**
   - High memory usage
   - Low disk space
   - High CPU load

4. **External Service Issues**
   - API unavailable
   - Timeout errors
   - Authentication failures

### Error Response Format

```json
{
  "status": "error",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "service": "simplepro-api",
  "environment": "production",
  "version": "1.0.0",
  "error": {
    "database": {
      "status": "down",
      "error": "Connection timeout",
      "responseTime": 5000
    }
  },
  "details": {
    "level": "basic",
    "responseTime": 5012,
    "errorType": "HealthCheckError"
  }
}
```

## Best Practices

1. **Health Check Frequency**
   - Liveness: Every 10 seconds
   - Readiness: Every 5 seconds
   - Monitoring: Every 30 seconds

2. **Timeout Configuration**
   - Basic checks: < 3 seconds
   - Detailed checks: < 10 seconds
   - External services: < 5 seconds per service

3. **Failure Thresholds**
   - Liveness: 3 consecutive failures
   - Readiness: 3 consecutive failures
   - Monitoring: 1 failure for alerting

4. **Resource Monitoring**
   - Memory: Alert at 85%, critical at 95%
   - Disk: Alert at 80%, critical at 90%
   - Response time: Alert at 2s, critical at 5s

## Future Enhancements

1. **Circuit Breaker Pattern**: Implement circuit breakers for external service health checks
2. **Health Check Caching**: Cache health check results to reduce load
3. **Custom Health Indicators**: Support for business-logic specific health checks
4. **Health Check Dashboard**: Web interface for visualizing health status
5. **Historical Health Data**: Store and analyze health check trends

## Conclusion

The enhanced health check system provides comprehensive monitoring capabilities for the SimplePro-v3 API, ensuring production readiness with proper dependency validation, system resource monitoring, and integration with modern deployment platforms like Kubernetes.
