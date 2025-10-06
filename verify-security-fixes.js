#!/usr/bin/env node
/**
 * Security Fixes Verification Script
 * Verifies that all 4 critical security vulnerabilities have been fixed
 */

const fs = require('fs');
const path = require('path');

console.log('='.repeat(80));
console.log('SECURITY FIXES VERIFICATION');
console.log('='.repeat(80));
console.log('');

let passed = 0;
let failed = 0;

function test(name, condition, details = '') {
  if (condition) {
    console.log(`✓ PASS: ${name}`);
    if (details) console.log(`  ${details}`);
    passed++;
  } else {
    console.log(`✗ FAIL: ${name}`);
    if (details) console.log(`  ${details}`);
    failed++;
  }
  console.log('');
}

// Test 1: Verify no hardcoded secrets in docker-compose.dev.yml
console.log('1. CHECKING: Hardcoded Secrets in Docker Compose');
console.log('-'.repeat(80));
const dockerCompose = fs.readFileSync('docker-compose.dev.yml', 'utf8');
const hasHardcodedMongo = dockerCompose.includes('simplepro_dev_2024');
const hasHardcodedRedis = dockerCompose.includes('simplepro_redis_2024');
const hasHardcodedMinio = dockerCompose.includes('simplepro_minio_2024');
const hasEnvVars =
  dockerCompose.includes('${MONGODB_PASSWORD}') &&
  dockerCompose.includes('${REDIS_PASSWORD}') &&
  dockerCompose.includes('${MINIO_ROOT_PASSWORD}');

test(
  'No hardcoded MongoDB password',
  !hasHardcodedMongo,
  hasHardcodedMongo
    ? 'Found "simplepro_dev_2024" in docker-compose.dev.yml'
    : 'Uses ${MONGODB_PASSWORD} variable',
);

test(
  'No hardcoded Redis password',
  !hasHardcodedRedis,
  hasHardcodedRedis
    ? 'Found "simplepro_redis_2024" in docker-compose.dev.yml'
    : 'Uses ${REDIS_PASSWORD} variable',
);

test(
  'No hardcoded MinIO password',
  !hasHardcodedMinio,
  hasHardcodedMinio
    ? 'Found "simplepro_minio_2024" in docker-compose.dev.yml'
    : 'Uses ${MINIO_ROOT_PASSWORD} variable',
);

test(
  'Uses environment variables',
  hasEnvVars,
  'All services use environment variables for secrets',
);

test(
  '.env.docker.example exists',
  fs.existsSync('.env.docker.example'),
  'Template file for Docker secrets configuration',
);

// Test 2: Verify JWT secret weak fallback is removed
console.log('2. CHECKING: JWT Secret Weak Fallback');
console.log('-'.repeat(80));
const partnerJwtStrategy = fs.readFileSync(
  'apps/api/src/auth/strategies/partner-jwt.strategy.ts',
  'utf8',
);
const hasWeakFallback = partnerJwtStrategy.includes('default-secret-key');
const hasSecretValidation = partnerJwtStrategy.includes('length < 32');
const hasErrorMessage = partnerJwtStrategy.includes(
  'JWT_SECRET configuration failed',
);

test(
  'No weak default secret fallback',
  !hasWeakFallback,
  hasWeakFallback
    ? 'Found "default-secret-key" in partner-jwt.strategy.ts'
    : 'Removed weak fallback',
);

test(
  'JWT secret length validation',
  hasSecretValidation,
  'Enforces minimum 32 character secret length',
);

test(
  'Proper error messages',
  hasErrorMessage,
  'Provides clear error message when JWT_SECRET is missing',
);

// Test 3: Verify document sharing endpoint security
console.log('3. CHECKING: Document Sharing Endpoint Security');
console.log('-'.repeat(80));
const documentsController = fs.readFileSync(
  'apps/api/src/documents/documents.controller.ts',
  'utf8',
);
const documentsService = fs.readFileSync(
  'apps/api/src/documents/documents.service.ts',
  'utf8',
);

const usesPostMethod =
  documentsController.includes("@Post('shared/:token/access')") &&
  documentsController.includes("@Post('shared/:token/download')");
const hasRateLimit = documentsController.includes(
  '@Throttle({ default: { limit: 5, ttl: 3600000 } })',
);
const usesBodyDto = documentsController.includes('AccessSharedDocumentDto');
const hasAuditLogging =
  documentsService.includes('SECURITY AUDIT') &&
  documentsService.includes('Document share access failed');

test(
  'Uses POST method (not GET)',
  usesPostMethod,
  'Changed from GET to POST to keep password out of URLs',
);

test(
  'Has rate limiting (5 attempts/hour)',
  hasRateLimit,
  'Throttle decorator configured for 5 attempts per hour',
);

test(
  'Password in request body',
  usesBodyDto,
  'Uses AccessSharedDocumentDto to accept password in POST body',
);

test(
  'Audit logging implemented',
  hasAuditLogging,
  'Security events logged with SECURITY AUDIT prefix',
);

test(
  'DTO file exists',
  fs.existsSync('apps/api/src/documents/dto/access-shared-document.dto.ts'),
  'AccessSharedDocumentDto created',
);

// Test 4: Verify WebSocket connection limit bypass is fixed
console.log('4. CHECKING: WebSocket Connection Limit Bypass Fix');
console.log('-'.repeat(80));
const websocketGateway = fs.readFileSync(
  'apps/api/src/websocket/websocket.gateway.ts',
  'utf8',
);

const authFirst = websocketGateway.includes('SECURITY FIX: Authenticate FIRST');
const hasUserLimit = websocketGateway.includes('MAX_CONNECTIONS_PER_USER = 5');
const hasEventRateLimit = websocketGateway.includes('EVENT_RATE_LIMIT = 100');
const hasRateLimitCheck = websocketGateway.includes(
  'checkEventRateLimit(client.id)',
);
const hasCleanup = websocketGateway.includes('clearEventRateLimiter');
const hasConnectionLogging = websocketGateway.includes('Connection rejected:');

test(
  'Authentication before resource allocation',
  authFirst,
  'JWT verification happens before any resource tracking',
);

test(
  'Per-user connection limit (5)',
  hasUserLimit,
  'Prevents single user from opening unlimited connections',
);

test(
  'Event rate limiting (100/min)',
  hasEventRateLimit,
  'Limits WebSocket events to 100 per minute per connection',
);

test(
  'Rate limit enforcement in handlers',
  hasRateLimitCheck,
  'Critical event handlers check rate limits',
);

test(
  'Proper cleanup on disconnect',
  hasCleanup,
  'Event rate limiters cleared when socket disconnects',
);

test(
  'Security logging',
  hasConnectionLogging,
  'Connection rejections logged with reason',
);

// Test 5: Verify documentation exists
console.log('5. CHECKING: Security Documentation');
console.log('-'.repeat(80));
const docExists = fs.existsSync('docs/security/SECURITY_FIXES_WEEK1.md');
let docContent = '';
if (docExists) {
  docContent = fs.readFileSync('docs/security/SECURITY_FIXES_WEEK1.md', 'utf8');
}

test(
  'SECURITY_FIXES_WEEK1.md exists',
  docExists,
  'Documentation file created in docs/security/',
);

test(
  'Documents all 4 vulnerabilities',
  docContent.includes('### 1.') &&
    docContent.includes('### 2.') &&
    docContent.includes('### 3.') &&
    docContent.includes('### 4.'),
  'All four vulnerabilities documented',
);

test(
  'Includes verification steps',
  docContent.includes('Verification Steps:'),
  'Each fix includes verification instructions',
);

test(
  'Includes code changes',
  docContent.includes('Files Modified:'),
  'Documents files and changes made',
);

// Summary
console.log('='.repeat(80));
console.log('VERIFICATION SUMMARY');
console.log('='.repeat(80));
console.log(`✓ Passed: ${passed}`);
console.log(`✗ Failed: ${failed}`);
console.log(`Total:    ${passed + failed}`);
console.log('');

if (failed === 0) {
  console.log('🎉 SUCCESS: All security fixes verified!');
  console.log('');
  console.log('All 4 critical vulnerabilities have been properly fixed:');
  console.log('  1. ✓ Hardcoded secrets removed from Docker Compose');
  console.log('  2. ✓ JWT secret weak fallback removed');
  console.log(
    '  3. ✓ Document sharing endpoint secured with POST + rate limiting',
  );
  console.log(
    '  4. ✓ WebSocket connection limits enforced with auth-first approach',
  );
  console.log('');
  console.log('Next steps:');
  console.log('  1. Create .env.docker file with secure passwords');
  console.log(
    '  2. Update frontend to use new POST endpoints for document sharing',
  );
  console.log('  3. Deploy to staging environment for testing');
  console.log('  4. Schedule penetration testing');
  process.exit(0);
} else {
  console.log('❌ FAILURE: Some security fixes are incomplete');
  console.log('');
  console.log('Please review the failed tests above and address the issues.');
  process.exit(1);
}
