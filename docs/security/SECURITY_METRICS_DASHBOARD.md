# Security Metrics Dashboard Specification

**Document Version:** 1.0
**Date:** 2025-10-02
**Purpose:** Real-time security monitoring and metrics visualization
**Stack:** Grafana + Prometheus + Loki

---

## Executive Summary

This document specifies a comprehensive security metrics dashboard for SimplePro-v3 that provides real-time visibility into:

- Authentication attempts and failures
- Rate limiting enforcement
- WebSocket connection patterns
- Document access attempts
- Security incidents
- API usage anomalies

---

## 1. Dashboard Overview

### 1.1 Key Metrics

| Metric Category      | Key Indicators                                      | Alert Threshold       |
| -------------------- | --------------------------------------------------- | --------------------- |
| **Authentication**   | Login attempts, failures, success rate              | > 100 failures/hour   |
| **Authorization**    | Permission denials, role violations                 | > 50 denials/hour     |
| **Rate Limiting**    | Rate limit hits, blocked requests                   | > 1000 hits/hour      |
| **WebSocket**        | Connection attempts, rejections, active connections | > 500 rejections/hour |
| **Document Access**  | Share attempts, password failures                   | > 100 failures/hour   |
| **Input Validation** | Injection attempts, XSS attempts                    | > 10 attempts/hour    |

### 1.2 Dashboard Sections

1. **Overview Panel** - High-level security health
2. **Authentication Panel** - Login and session metrics
3. **API Security Panel** - Rate limiting and access control
4. **WebSocket Panel** - Real-time connection monitoring
5. **Threat Detection Panel** - Attack patterns and anomalies
6. **Audit Trail Panel** - Recent security events

---

## 2. Metrics Collection

### 2.1 Prometheus Metrics

**File:** `apps/api/src/common/metrics/security.metrics.ts`

```typescript
import { Counter, Gauge, Histogram } from 'prom-client';

// Authentication Metrics
export const authenticationAttempts = new Counter({
  name: 'simplepro_auth_attempts_total',
  help: 'Total authentication attempts',
  labelNames: ['method', 'result', 'username'],
});

export const authenticationFailures = new Counter({
  name: 'simplepro_auth_failures_total',
  help: 'Failed authentication attempts',
  labelNames: ['reason', 'username', 'ip'],
});

export const activeTokens = new Gauge({
  name: 'simplepro_active_tokens',
  help: 'Number of active JWT tokens',
  labelNames: ['type'], // access, refresh
});

// Rate Limiting Metrics
export const rateLimitHits = new Counter({
  name: 'simplepro_rate_limit_hits_total',
  help: 'Rate limit violations',
  labelNames: ['endpoint', 'ip', 'type'],
});

export const rateLimitBlocked = new Counter({
  name: 'simplepro_rate_limit_blocked_total',
  help: 'Requests blocked by rate limiting',
  labelNames: ['endpoint', 'ip'],
});

// WebSocket Metrics
export const websocketConnections = new Gauge({
  name: 'simplepro_websocket_connections',
  help: 'Active WebSocket connections',
  labelNames: ['user_id', 'ip'],
});

export const websocketConnectionAttempts = new Counter({
  name: 'simplepro_websocket_connection_attempts_total',
  help: 'WebSocket connection attempts',
  labelNames: ['result', 'ip'],
});

export const websocketEvents = new Counter({
  name: 'simplepro_websocket_events_total',
  help: 'WebSocket events processed',
  labelNames: ['event_type', 'user_id'],
});

export const websocketEventRateLimitHits = new Counter({
  name: 'simplepro_websocket_event_rate_limit_hits_total',
  help: 'WebSocket event rate limit violations',
  labelNames: ['user_id', 'ip'],
});

// Document Access Metrics
export const documentShareAttempts = new Counter({
  name: 'simplepro_document_share_attempts_total',
  help: 'Document sharing access attempts',
  labelNames: ['result', 'token', 'ip'],
});

export const documentSharePasswordFailures = new Counter({
  name: 'simplepro_document_share_password_failures_total',
  help: 'Failed password attempts on shared documents',
  labelNames: ['token', 'ip'],
});

// Security Event Metrics
export const securityEvents = new Counter({
  name: 'simplepro_security_events_total',
  help: 'Security events detected',
  labelNames: ['severity', 'category', 'description'],
});

export const injectionAttempts = new Counter({
  name: 'simplepro_injection_attempts_total',
  help: 'Injection attack attempts detected',
  labelNames: ['type', 'ip', 'blocked'],
});

// API Request Metrics
export const apiRequests = new Counter({
  name: 'simplepro_api_requests_total',
  help: 'Total API requests',
  labelNames: ['method', 'endpoint', 'status'],
});

export const apiRequestDuration = new Histogram({
  name: 'simplepro_api_request_duration_seconds',
  help: 'API request duration',
  labelNames: ['method', 'endpoint'],
  buckets: [0.1, 0.5, 1, 2, 5],
});
```

### 2.2 Instrumentation Example

**Authentication Service:**

```typescript
// apps/api/src/auth/auth.service.ts
import { authenticationAttempts, authenticationFailures } from '../common/metrics/security.metrics';

async login(credentials: LoginDto, ip: string) {
  authenticationAttempts.inc({ method: 'password', result: 'attempt', username: credentials.username });

  try {
    const user = await this.validateUser(credentials);

    if (!user) {
      authenticationFailures.inc({ reason: 'invalid_credentials', username: credentials.username, ip });
      authenticationAttempts.inc({ method: 'password', result: 'failure', username: credentials.username });
      throw new UnauthorizedException('Invalid credentials');
    }

    authenticationAttempts.inc({ method: 'password', result: 'success', username: credentials.username });

    return this.generateTokens(user);
  } catch (error) {
    // Log and rethrow
    throw error;
  }
}
```

**WebSocket Gateway:**

```typescript
// apps/api/src/websocket/websocket.gateway.ts
import { websocketConnectionAttempts, websocketConnections } from '../common/metrics/security.metrics';

async handleConnection(client: Socket) {
  const ip = this.getClientIP(client);

  websocketConnectionAttempts.inc({ result: 'attempt', ip });

  try {
    const user = await this.authenticateSocket(client);

    if (!user) {
      websocketConnectionAttempts.inc({ result: 'auth_failure', ip });
      client.disconnect();
      return;
    }

    // Check connection limits...

    websocketConnectionAttempts.inc({ result: 'success', ip });
    websocketConnections.inc({ user_id: user.id, ip });

    // Track connection
    this.trackConnection(client, user);

  } catch (error) {
    websocketConnectionAttempts.inc({ result: 'error', ip });
    client.disconnect();
  }
}
```

### 2.3 Log Aggregation with Loki

**Loki Query Examples:**

```logql
# Authentication failures
{job="simplepro-api"} |= "authentication failed"
  | json
  | username != ""

# Rate limit violations
{job="simplepro-api"} |= "Rate limit"
  | json
  | line_format "{{.level}} - {{.message}} - IP: {{.ip}}"

# Document share access
{job="simplepro-api"} |= "Document share access"
  | json
  | result = "failure"

# WebSocket security events
{job="simplepro-api"} |= "WebSocket"
  | json
  | severity = "high"
```

---

## 3. Grafana Dashboard JSON

### 3.1 Overview Panel

```json
{
  "dashboard": {
    "title": "SimplePro-v3 Security Overview",
    "tags": ["security", "monitoring"],
    "timezone": "browser",
    "panels": [
      {
        "id": 1,
        "title": "Security Health Score",
        "type": "stat",
        "targets": [
          {
            "expr": "100 - ((rate(simplepro_auth_failures_total[1h]) * 10) + (rate(simplepro_rate_limit_blocked_total[1h]) * 5) + (rate(simplepro_injection_attempts_total[1h]) * 20))",
            "legendFormat": "Health Score"
          }
        ],
        "fieldConfig": {
          "defaults": {
            "thresholds": {
              "mode": "absolute",
              "steps": [
                { "value": 0, "color": "red" },
                { "value": 50, "color": "yellow" },
                { "value": 80, "color": "green" }
              ]
            }
          }
        }
      },
      {
        "id": 2,
        "title": "Authentication Attempts (Last Hour)",
        "type": "timeseries",
        "targets": [
          {
            "expr": "rate(simplepro_auth_attempts_total[5m]) * 60",
            "legendFormat": "{{result}}"
          }
        ]
      },
      {
        "id": 3,
        "title": "Rate Limit Violations (Last Hour)",
        "type": "timeseries",
        "targets": [
          {
            "expr": "rate(simplepro_rate_limit_hits_total[5m]) * 60",
            "legendFormat": "{{endpoint}}"
          }
        ]
      },
      {
        "id": 4,
        "title": "Active WebSocket Connections",
        "type": "gauge",
        "targets": [
          {
            "expr": "simplepro_websocket_connections",
            "legendFormat": "Connections"
          }
        ],
        "fieldConfig": {
          "defaults": {
            "max": 100,
            "thresholds": {
              "steps": [
                { "value": 0, "color": "green" },
                { "value": 50, "color": "yellow" },
                { "value": 80, "color": "red" }
              ]
            }
          }
        }
      },
      {
        "id": 5,
        "title": "Top Failed Login Attempts by IP",
        "type": "table",
        "targets": [
          {
            "expr": "topk(10, sum by(ip) (increase(simplepro_auth_failures_total[1h])))",
            "format": "table"
          }
        ]
      },
      {
        "id": 6,
        "title": "Security Events by Severity",
        "type": "piechart",
        "targets": [
          {
            "expr": "sum by(severity) (increase(simplepro_security_events_total[24h]))",
            "legendFormat": "{{severity}}"
          }
        ]
      }
    ]
  }
}
```

### 3.2 Authentication Panel

```json
{
  "panels": [
    {
      "title": "Login Success Rate",
      "type": "stat",
      "targets": [
        {
          "expr": "(sum(rate(simplepro_auth_attempts_total{result='success'}[1h])) / sum(rate(simplepro_auth_attempts_total[1h]))) * 100",
          "legendFormat": "Success Rate %"
        }
      ]
    },
    {
      "title": "Failed Logins by Reason",
      "type": "timeseries",
      "targets": [
        {
          "expr": "rate(simplepro_auth_failures_total[5m]) * 60",
          "legendFormat": "{{reason}}"
        }
      ]
    },
    {
      "title": "Active Sessions",
      "type": "gauge",
      "targets": [
        {
          "expr": "simplepro_active_tokens{type='access'}",
          "legendFormat": "Access Tokens"
        },
        {
          "expr": "simplepro_active_tokens{type='refresh'}",
          "legendFormat": "Refresh Tokens"
        }
      ]
    },
    {
      "title": "Suspicious Login Patterns",
      "type": "logs",
      "targets": [
        {
          "expr": "{job=\"simplepro-api\"} |= \"authentication failed\" | json | ip != \"\" | __error__=\"\"",
          "refId": "A"
        }
      ]
    }
  ]
}
```

### 3.3 Rate Limiting Panel

```json
{
  "panels": [
    {
      "title": "Rate Limit Hits by Endpoint",
      "type": "bargauge",
      "targets": [
        {
          "expr": "topk(10, sum by(endpoint) (increase(simplepro_rate_limit_hits_total[1h])))",
          "legendFormat": "{{endpoint}}"
        }
      ]
    },
    {
      "title": "Document Share Rate Limits",
      "type": "timeseries",
      "targets": [
        {
          "expr": "rate(simplepro_rate_limit_hits_total{endpoint=~\".*shared.*\"}[5m]) * 60",
          "legendFormat": "{{ip}}"
        }
      ]
    },
    {
      "title": "Top Rate Limited IPs",
      "type": "table",
      "targets": [
        {
          "expr": "topk(20, sum by(ip) (increase(simplepro_rate_limit_blocked_total[1h])))",
          "format": "table",
          "instant": true
        }
      ]
    }
  ]
}
```

### 3.4 WebSocket Security Panel

```json
{
  "panels": [
    {
      "title": "WebSocket Connection Status",
      "type": "timeseries",
      "targets": [
        {
          "expr": "rate(simplepro_websocket_connection_attempts_total[5m]) * 60",
          "legendFormat": "{{result}}"
        }
      ]
    },
    {
      "title": "Connection Rejections by Reason",
      "type": "piechart",
      "targets": [
        {
          "expr": "sum by(result) (increase(simplepro_websocket_connection_attempts_total{result!='success'}[1h]))",
          "legendFormat": "{{result}}"
        }
      ]
    },
    {
      "title": "Event Rate Limit Violations",
      "type": "timeseries",
      "targets": [
        {
          "expr": "rate(simplepro_websocket_event_rate_limit_hits_total[5m]) * 60",
          "legendFormat": "User: {{user_id}}"
        }
      ]
    },
    {
      "title": "Active Connections per User",
      "type": "bargauge",
      "targets": [
        {
          "expr": "sum by(user_id) (simplepro_websocket_connections)",
          "legendFormat": "{{user_id}}"
        }
      ],
      "fieldConfig": {
        "defaults": {
          "max": 5,
          "thresholds": {
            "steps": [
              { "value": 0, "color": "green" },
              { "value": 4, "color": "yellow" },
              { "value": 5, "color": "red" }
            ]
          }
        }
      }
    }
  ]
}
```

---

## 4. Prometheus Alert Rules

**File:** `monitoring/prometheus/alerts/security-alerts.yml`

```yaml
groups:
  - name: security_alerts
    interval: 30s
    rules:
      # Authentication Alerts
      - alert: HighAuthenticationFailureRate
        expr: rate(simplepro_auth_failures_total[5m]) > 2
        for: 5m
        labels:
          severity: warning
          category: authentication
        annotations:
          summary: 'High authentication failure rate'
          description: 'More than 2 failed logins per second for 5 minutes'

      - alert: BruteForceAttackDetected
        expr: sum by(ip) (increase(simplepro_auth_failures_total[1m])) > 10
        for: 1m
        labels:
          severity: critical
          category: authentication
        annotations:
          summary: 'Potential brute force attack from {{ $labels.ip }}'
          description: '{{ $value }} failed login attempts in 1 minute'

      # Rate Limiting Alerts
      - alert: HighRateLimitViolations
        expr: rate(simplepro_rate_limit_hits_total[5m]) > 10
        for: 5m
        labels:
          severity: warning
          category: rate_limiting
        annotations:
          summary: 'High rate of rate limit violations'
          description: 'More than 10 rate limit hits per second'

      - alert: DocumentShareBruteForce
        expr: sum by(ip) (increase(simplepro_document_share_password_failures_total[5m])) > 5
        for: 5m
        labels:
          severity: high
          category: document_security
        annotations:
          summary: 'Brute force on document sharing from {{ $labels.ip }}'
          description: '{{ $value }} failed password attempts in 5 minutes'

      # WebSocket Alerts
      - alert: HighWebSocketConnectionRejections
        expr: rate(simplepro_websocket_connection_attempts_total{result!="success"}[5m]) > 5
        for: 5m
        labels:
          severity: warning
          category: websocket
        annotations:
          summary: 'High WebSocket connection rejection rate'
          description: 'More than 5 rejections per second'

      - alert: WebSocketConnectionFlood
        expr: sum by(ip) (increase(simplepro_websocket_connection_attempts_total[1m])) > 20
        for: 1m
        labels:
          severity: critical
          category: websocket
        annotations:
          summary: 'WebSocket connection flood from {{ $labels.ip }}'
          description: '{{ $value }} connection attempts in 1 minute'

      # Security Event Alerts
      - alert: InjectionAttemptDetected
        expr: increase(simplepro_injection_attempts_total[5m]) > 0
        for: 1m
        labels:
          severity: high
          category: injection
        annotations:
          summary: 'Injection attempt detected'
          description: '{{ $value }} injection attempts in last 5 minutes'

      - alert: CriticalSecurityEvent
        expr: increase(simplepro_security_events_total{severity="critical"}[1m]) > 0
        for: 1m
        labels:
          severity: critical
          category: security_event
        annotations:
          summary: 'Critical security event detected'
          description: '{{ $value }} critical security events'
```

---

## 5. Implementation Guide

### 5.1 Prerequisites

```bash
# Install Prometheus
docker pull prom/prometheus:latest

# Install Grafana
docker pull grafana/grafana:latest

# Install Loki
docker pull grafana/loki:latest

# Install Promtail
docker pull grafana/promtail:latest
```

### 5.2 Docker Compose Setup

**File:** `docker-compose.monitoring.yml`

```yaml
version: '3.8'

services:
  prometheus:
    image: prom/prometheus:latest
    ports:
      - '9090:9090'
    volumes:
      - ./monitoring/prometheus/prometheus.yml:/etc/prometheus/prometheus.yml
      - ./monitoring/prometheus/alerts:/etc/prometheus/alerts
      - prometheus-data:/prometheus
    command:
      - '--config.file=/etc/prometheus/prometheus.yml'
      - '--storage.tsdb.path=/prometheus'
    networks:
      - monitoring

  grafana:
    image: grafana/grafana:latest
    ports:
      - '3000:3000'
    environment:
      - GF_SECURITY_ADMIN_PASSWORD=${GRAFANA_PASSWORD:-admin}
      - GF_INSTALL_PLUGINS=grafana-piechart-panel
    volumes:
      - ./monitoring/grafana/dashboards:/var/lib/grafana/dashboards
      - ./monitoring/grafana/provisioning:/etc/grafana/provisioning
      - grafana-data:/var/lib/grafana
    networks:
      - monitoring
    depends_on:
      - prometheus
      - loki

  loki:
    image: grafana/loki:latest
    ports:
      - '3100:3100'
    volumes:
      - ./monitoring/loki/loki-config.yml:/etc/loki/local-config.yaml
      - loki-data:/loki
    command: -config.file=/etc/loki/local-config.yaml
    networks:
      - monitoring

  promtail:
    image: grafana/promtail:latest
    volumes:
      - ./monitoring/promtail/promtail-config.yml:/etc/promtail/config.yml
      - ./apps/api/logs:/var/log/simplepro
    command: -config.file=/etc/promtail/config.yml
    networks:
      - monitoring
    depends_on:
      - loki

volumes:
  prometheus-data:
  grafana-data:
  loki-data:

networks:
  monitoring:
    driver: bridge
```

### 5.3 Prometheus Configuration

**File:** `monitoring/prometheus/prometheus.yml`

```yaml
global:
  scrape_interval: 15s
  evaluation_interval: 15s

alerting:
  alertmanagers:
    - static_configs:
        - targets: ['alertmanager:9093']

rule_files:
  - '/etc/prometheus/alerts/*.yml'

scrape_configs:
  - job_name: 'simplepro-api'
    static_configs:
      - targets: ['host.docker.internal:3001']
    metrics_path: '/metrics'
```

### 5.4 Grafana Provisioning

**File:** `monitoring/grafana/provisioning/datasources/datasources.yml`

```yaml
apiVersion: 1

datasources:
  - name: Prometheus
    type: prometheus
    access: proxy
    url: http://prometheus:9090
    isDefault: true

  - name: Loki
    type: loki
    access: proxy
    url: http://loki:3100
```

**File:** `monitoring/grafana/provisioning/dashboards/dashboards.yml`

```yaml
apiVersion: 1

providers:
  - name: 'SimplePro Security'
    orgId: 1
    folder: 'Security'
    type: file
    disableDeletion: false
    updateIntervalSeconds: 10
    allowUiUpdates: true
    options:
      path: /var/lib/grafana/dashboards
```

---

## 6. Usage Instructions

### 6.1 Starting the Monitoring Stack

```bash
# Start monitoring services
docker-compose -f docker-compose.monitoring.yml up -d

# Verify services are running
docker-compose -f docker-compose.monitoring.yml ps

# Access Grafana
# URL: http://localhost:3000
# Default credentials: admin / admin (change on first login)
```

### 6.2 Viewing Dashboards

1. **Login to Grafana:** http://localhost:3000
2. **Navigate to Dashboards → Browse**
3. **Open "SimplePro-v3 Security Overview"**
4. **Explore panels:**
   - Authentication metrics
   - Rate limiting status
   - WebSocket connections
   - Security events

### 6.3 Setting Up Alerts

1. **In Grafana, navigate to Alerting → Alert rules**
2. **Alerts are automatically loaded from Prometheus**
3. **Configure notification channels:**
   - Email
   - Slack
   - PagerDuty
   - Webhook

### 6.4 Querying Metrics

**Prometheus Queries:**

```promql
# Current authentication failure rate
rate(simplepro_auth_failures_total[5m])

# Total rate limit hits in last hour
increase(simplepro_rate_limit_hits_total[1h])

# Active WebSocket connections
simplepro_websocket_connections

# Top 10 IPs by failed logins
topk(10, sum by(ip) (simplepro_auth_failures_total))
```

**Loki Queries:**

```logql
# Recent authentication failures
{job="simplepro-api"} |= "authentication failed" | json

# Rate limit violations
{job="simplepro-api"} |= "Rate limit" | json | severity="high"

# Security events
{job="simplepro-api"} | json | category="security"
```

---

## 7. Maintenance

### 7.1 Data Retention

**Prometheus:**

- Default: 15 days
- Adjust in `prometheus.yml`: `--storage.tsdb.retention.time=30d`

**Loki:**

- Default: 7 days
- Adjust in `loki-config.yml`

### 7.2 Backup

```bash
# Backup Grafana dashboards
docker exec grafana grafana-cli admin export-all /backup/dashboards.json

# Backup Prometheus data
docker exec prometheus tar -czf /prometheus/backup.tar.gz /prometheus/data
```

### 7.3 Updates

```bash
# Update monitoring stack
docker-compose -f docker-compose.monitoring.yml pull
docker-compose -f docker-compose.monitoring.yml up -d
```

---

## 8. Conclusion

This security metrics dashboard provides comprehensive visibility into SimplePro-v3's security posture, enabling:

✅ Real-time threat detection
✅ Proactive incident response
✅ Compliance reporting
✅ Security trend analysis
✅ Capacity planning

**Next Steps:**

1. Deploy monitoring stack
2. Configure alert notifications
3. Train team on dashboard usage
4. Establish monitoring procedures
5. Schedule regular metric reviews

---

**Document Version:** 1.0
**Last Updated:** 2025-10-02
**Owner:** Security Team
