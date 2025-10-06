import ws from 'k6/ws';
import { check, sleep } from 'k6';
import { Counter, Trend } from 'k6/metrics';

// Custom metrics
const wsConnections = new Counter('websocket_connections');
const wsMessagesSent = new Counter('websocket_messages_sent');
const wsMessagesReceived = new Counter('websocket_messages_received');
const wsConnectionDuration = new Trend('websocket_connection_duration');

export let options = {
  stages: [
    { duration: '30s', target: 100 }, // Ramp up to 100 connections
    { duration: '1m', target: 500 }, // Ramp up to 500 connections
    { duration: '2m', target: 1000 }, // Ramp up to 1000 connections
    { duration: '5m', target: 1000 }, // Stay at 1000 for 5 minutes
    { duration: '1m', target: 3000 }, // Spike to 3000 connections
    { duration: '2m', target: 3000 }, // Hold at 3000
    { duration: '1m', target: 5000 }, // Final spike to 5000
    { duration: '2m', target: 5000 }, // Hold at 5000
    { duration: '2m', target: 0 }, // Ramp down to 0
  ],
  thresholds: {
    websocket_connection_duration: ['p(95)<2000'], // 95% of connections establish < 2s
    websocket_messages_received: ['count>10000'], // At least 10k messages received
    checks: ['rate>0.95'], // 95% of checks pass
  },
};

const API_BASE_URL = __ENV.API_URL || 'http://localhost:3001';
const WS_URL = API_BASE_URL.replace('http', 'ws');
const JWT_TOKEN = __ENV.JWT_TOKEN || 'test-token';

export default function () {
  const jobId = `job_${__VU}_${Date.now()}`;
  const userId = `user_${__VU}`;

  const params = {
    headers: {
      Authorization: `Bearer ${JWT_TOKEN}`,
    },
  };

  const startTime = Date.now();

  const res = ws.connect(WS_URL, params, function (socket) {
    wsConnections.add(1);
    wsConnectionDuration.add(Date.now() - startTime);

    socket.on('open', () => {
      check(socket, {
        'WebSocket connection opened': (s) => s.readyState === ws.OPEN,
      });

      // Subscribe to job updates
      socket.send(
        JSON.stringify({
          event: 'subscribe.job',
          data: jobId,
        }),
      );
      wsMessagesSent.add(1);

      // Subscribe to notifications
      socket.send(
        JSON.stringify({
          event: 'subscribe.notifications',
          data: userId,
        }),
      );
      wsMessagesSent.add(1);

      // Send periodic heartbeat
      socket.setInterval(() => {
        socket.send(
          JSON.stringify({
            event: 'heartbeat',
            timestamp: Date.now(),
          }),
        );
        wsMessagesSent.add(1);
      }, 30000); // Every 30 seconds
    });

    socket.on('message', (data) => {
      wsMessagesReceived.add(1);

      const message = JSON.parse(data);

      check(message, {
        'Message has event type': (msg) => msg.event !== undefined,
        'Message has valid structure': (msg) =>
          msg.data !== undefined || msg.error !== undefined,
      });

      // Simulate different event types
      if (message.event === 'job.subscribed') {
        check(message, {
          'Job subscription confirmed': (msg) => msg.data.jobId === jobId,
        });

        // Simulate job status update after subscription
        setTimeout(() => {
          socket.send(
            JSON.stringify({
              event: 'job.update',
              data: {
                jobId,
                status: 'in_progress',
                updatedBy: userId,
              },
            }),
          );
          wsMessagesSent.add(1);
        }, Math.random() * 5000); // Random delay 0-5 seconds
      }

      if (message.event === 'notification.new') {
        check(message, {
          'Notification received': (msg) =>
            msg.data.notificationId !== undefined,
        });

        // Mark notification as read
        setTimeout(() => {
          socket.send(
            JSON.stringify({
              event: 'notification.read',
              data: {
                notificationId: message.data.notificationId,
                userId,
              },
            }),
          );
          wsMessagesSent.add(1);
        }, Math.random() * 3000);
      }
    });

    socket.on('error', (e) => {
      check(e, {
        'No WebSocket errors': () => false,
      });
    });

    socket.on('close', () => {
      check(socket, {
        'WebSocket closed gracefully': (s) => s.readyState === ws.CLOSED,
      });
    });

    // Keep connection alive for 30-60 seconds
    const connectionDuration = 30000 + Math.random() * 30000;
    socket.setTimeout(() => {
      socket.close();
    }, connectionDuration);
  });

  check(res, {
    'WebSocket connection successful': (r) => r && r.status === 101,
  });

  sleep(1);
}

export function handleSummary(data) {
  return {
    'summary.json': JSON.stringify(data),
    stdout: `
      ============================================
      WebSocket Load Test Summary
      ============================================
      Total Connections: ${data.metrics.websocket_connections.values.count}
      Messages Sent: ${data.metrics.websocket_messages_sent.values.count}
      Messages Received: ${data.metrics.websocket_messages_received.values.count}
      Avg Connection Duration: ${data.metrics.websocket_connection_duration.values.avg.toFixed(2)}ms
      P95 Connection Duration: ${data.metrics.websocket_connection_duration.values['p(95)'].toFixed(2)}ms
      Check Success Rate: ${(data.metrics.checks.values.rate * 100).toFixed(2)}%
      ============================================
    `,
  };
}
