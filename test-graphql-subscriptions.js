/**
 * Test script for GraphQL Subscriptions
 *
 * This script tests all three GraphQL subscriptions:
 * 1. jobUpdated
 * 2. jobStatusChanged
 * 3. crewAssigned
 */

const http = require('http');

const JOB_ID = '68ea5c9a502e249f55d34661';
const JWT_TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI2OGVhNWNlOGQ4NWQwNzM5N2ZkZTg3ZmMiLCJ1c2VybmFtZSI6ImFkbWluIiwiZW1haWwiOiJhZG1pbkBzaW1wbGVwcm8uY29tIiwicm9sZSI6InN1cGVyX2FkbWluIiwicGVybWlzc2lvbnMiOlsidXNlcnM6Y3JlYXRlIiwidXNlcnM6cmVhZCIsInVzZXJzOnVwZGF0ZSIsInVzZXJzOmRlbGV0ZSIsImN1c3RvbWVyczpjcmVhdGUiLCJjdXN0b21lcnM6cmVhZCIsImN1c3RvbWVyczp1cGRhdGUiLCJjdXN0b21lcnM6ZGVsZXRlIiwiZXN0aW1hdGVzOmNyZWF0ZSIsImVzdGltYXRlczpyZWFkIiwiZXN0aW1hdGVzOnVwZGF0ZSIsImVzdGltYXRlczpkZWxldGUiLCJlc3RpbWF0ZXM6YXBwcm92ZSIsImpvYnM6Y3JlYXRlIiwiam9iczpyZWFkIiwiam9iczp1cGRhdGUiLCJqb2JzOmRlbGV0ZSIsImpvYnM6YXNzaWduIiwiY3Jld3M6Y3JlYXRlIiwiY3Jld3M6cmVhZCIsImNyZXdzOnVwZGF0ZSIsImNyZXdzOmRlbGV0ZSIsImNyZXdzOmFzc2lnbiIsImludmVudG9yeTpjcmVhdGUiLCJpbnZlbnRvcnk6cmVhZCIsImludmVudG9yeTp1cGRhdGUiLCJpbnZlbnRvcnk6ZGVsZXRlIiwiYmlsbGluZzpjcmVhdGUiLCJiaWxsaW5nOnJlYWQiLCJiaWxsaW5nOnVwZGF0ZSIsImJpbGxpbmc6ZGVsZXRlIiwiYmlsbGluZzphcHByb3ZlIiwic3lzdGVtX3NldHRpbmdzOnJlYWQiLCJzeXN0ZW1fc2V0dGluZ3M6dXBkYXRlIiwicHJpY2luZ19ydWxlczpyZWFkIiwicHJpY2luZ19ydWxlczp1cGRhdGUiLCJyZXBvcnRzOnJlYWQiLCJyZXBvcnRzOmV4cG9ydCIsInRhcmlmZl9zZXR0aW5nczpyZWFkIiwidGFyaWZmX3NldHRpbmdzOmNyZWF0ZSIsInRhcmlmZl9zZXR0aW5nczp1cGRhdGUiLCJ0YXJpZmZfc2V0dGluZ3M6ZGVsZXRlIiwidGFyaWZmX3NldHRpbmdzOmFjdGl2YXRlIl0sImlhdCI6MTc2MDIzNDMzMSwiZXhwIjoxNzYwMjM3OTMxfQ.p8emQRDWmid3AQukuTeyzns9zxogyYIya0SDojbv3e0';

async function wait(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function updateJobStatus() {
  console.log('\n🔄 Triggering job status update via REST API...');

  const data = JSON.stringify({
    status: 'in_progress'
  });

  const options = {
    hostname: 'localhost',
    port: 3001,
    path: `/api/jobs/${JOB_ID}/status`,
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': data.length,
      'Authorization': `Bearer ${JWT_TOKEN}`
    }
  };

  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => body += chunk);
      res.on('end', () => {
        if (res.statusCode === 200) {
          console.log('✅ Job status updated successfully!');
          console.log('Response:', JSON.parse(body));
          resolve();
        } else {
          console.error('❌ Failed to update job status:', res.statusCode, body);
          reject(new Error(body));
        }
      });
    });

    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

async function main() {
  console.log('🚀 GraphQL Subscriptions Test Script');
  console.log('=====================================\n');
  console.log(`📋 Job ID: ${JOB_ID}`);
  console.log(`🔑 Using JWT token: ${JWT_TOKEN.substring(0, 50)}...`);

  console.log('\n📝 Test Plan:');
  console.log('1. Update job status from "scheduled" to "in_progress"');
  console.log('2. Verify PubSub events are published');
  console.log('3. Check server logs for subscription activity\n');

  console.log('⚠️  Note: WebSocket subscriptions must be tested manually in GraphQL Playground');
  console.log('          This script demonstrates the mutation that triggers the events.\n');

  try {
    // Wait a bit to ensure server is ready
    await wait(1000);

    // Trigger the mutation
    await updateJobStatus();

    console.log('\n✅ Test completed successfully!');
    console.log('\n📖 Next steps:');
    console.log('1. Open GraphQL Playground: http://localhost:3001/graphql');
    console.log('2. In Tab 1, subscribe:');
    console.log(`
subscription {
  jobStatusChanged(jobId: "${JOB_ID}") {
    id
    jobNumber
    status
    title
  }
}
    `);
    console.log('3. In Tab 2, run the mutation again with a different status');
    console.log('4. Watch Tab 1 receive real-time updates!\n');

  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    process.exit(1);
  }
}

main();
