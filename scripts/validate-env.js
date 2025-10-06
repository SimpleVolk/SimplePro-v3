#!/usr/bin/env node

/**
 * Environment Validation Script for SimplePro-v3
 *
 * Validates environment configuration without starting the application.
 * Useful for CI/CD pipelines and pre-deployment checks.
 *
 * Usage:
 *   npm run validate:env
 *   npm run validate:env -- --env=production
 *   npm run validate:env -- --file=apps/api/.env.production
 */

const fs = require('fs');
const path = require('path');

// ANSI color codes
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

// Parse command line arguments
const args = process.argv.slice(2);
const envArg =
  args.find((arg) => arg.startsWith('--env='))?.split('=')[1] || 'development';
const fileArg = args.find((arg) => arg.startsWith('--file='))?.split('=')[1];

function print(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function printHeader(title) {
  print('\n' + '='.repeat(60), 'cyan');
  print(title, 'bright');
  print('='.repeat(60), 'cyan');
}

/**
 * Load environment file
 */
function loadEnvFile(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const env = {};

    content.split('\n').forEach((line) => {
      line = line.trim();

      // Skip comments and empty lines
      if (!line || line.startsWith('#')) return;

      const match = line.match(/^([^=]+)=(.*)$/);
      if (match) {
        const key = match[1].trim();
        let value = match[2].trim();

        // Remove quotes if present
        if (
          (value.startsWith('"') && value.endsWith('"')) ||
          (value.startsWith("'") && value.endsWith("'"))
        ) {
          value = value.slice(1, -1);
        }

        env[key] = value;
      }
    });

    return env;
  } catch (error) {
    throw new Error(`Failed to load environment file: ${error.message}`);
  }
}

/**
 * Validation rules
 */
const validationRules = {
  // Required for all environments
  required: [
    'NODE_ENV',
    'MONGODB_URI',
    'REDIS_HOST',
    'REDIS_PASSWORD',
    'JWT_SECRET',
    'JWT_REFRESH_SECRET',
  ],

  // Required for production
  requiredProduction: [
    'API_BASE_URL',
    'WEB_APP_URL',
    'ALLOWED_ORIGINS',
    'SESSION_SECRET',
  ],

  // Numeric values
  numeric: [
    'PORT',
    'REDIS_PORT',
    'MONGODB_POOL_SIZE',
    'RATE_LIMIT_GLOBAL',
    'RATE_LIMIT_LOGIN',
  ],

  // Boolean values
  boolean: [
    'REDIS_TLS_ENABLED',
    'STORAGE_USE_SSL',
    'EMAIL_NOTIFICATIONS_ENABLED',
    'SMS_NOTIFICATIONS_ENABLED',
    'DEBUG_MODE',
    'SEED_DATA',
  ],

  // URL values
  urls: ['API_BASE_URL', 'WEB_APP_URL', 'STORAGE_PUBLIC_URL'],

  // Email values
  emails: ['SMTP_FROM_EMAIL', 'SMTP_REPLY_TO', 'FIREBASE_CLIENT_EMAIL'],
};

/**
 * Validate secret strength
 */
function validateSecretStrength(value, minLength, isProduction) {
  const issues = [];

  if (value.length < minLength) {
    issues.push(`Too short (${value.length} chars, minimum ${minLength})`);
  }

  if (isProduction && value.length < 64) {
    issues.push(`Production requires 64+ characters (got ${value.length})`);
  }

  // Check for unsafe patterns
  const unsafePatterns = [
    'dev',
    'test',
    'development',
    'example',
    'demo',
    'changeme',
    'admin',
    'password',
    '123',
    'root',
  ];
  const lowerValue = value.toLowerCase();

  for (const pattern of unsafePatterns) {
    if (lowerValue.includes(pattern)) {
      issues.push(`Contains unsafe pattern: "${pattern}"`);
    }
  }

  return issues;
}

/**
 * Validate environment configuration
 */
function validateEnvironment(env, environment) {
  const errors = [];
  const warnings = [];
  const isProduction = environment === 'production';

  printHeader(`Validating ${environment} Environment`);

  // Check required variables
  print('\n🔍 Checking required variables...', 'cyan');
  const requiredVars = [...validationRules.required];
  if (isProduction) {
    requiredVars.push(...validationRules.requiredProduction);
  }

  requiredVars.forEach((key) => {
    if (!env[key] || env[key].trim() === '') {
      errors.push(`Missing required variable: ${key}`);
      print(`  ❌ ${key}`, 'red');
    } else {
      print(`  ✅ ${key}`, 'green');
    }
  });

  // Validate NODE_ENV
  print('\n🌍 Validating NODE_ENV...', 'cyan');
  const validEnvs = ['development', 'staging', 'production', 'test'];
  if (env.NODE_ENV && !validEnvs.includes(env.NODE_ENV)) {
    errors.push(
      `Invalid NODE_ENV: ${env.NODE_ENV}. Must be one of: ${validEnvs.join(', ')}`,
    );
    print(`  ❌ Invalid value: ${env.NODE_ENV}`, 'red');
  } else {
    print(`  ✅ NODE_ENV: ${env.NODE_ENV}`, 'green');
  }

  // Validate JWT secrets
  print('\n🔐 Validating JWT secrets...', 'cyan');
  if (env.JWT_SECRET) {
    const jwtIssues = validateSecretStrength(env.JWT_SECRET, 32, isProduction);
    if (jwtIssues.length > 0) {
      errors.push(`JWT_SECRET: ${jwtIssues.join(', ')}`);
      print(`  ❌ JWT_SECRET: ${jwtIssues.join(', ')}`, 'red');
    } else {
      print(`  ✅ JWT_SECRET (${env.JWT_SECRET.length} chars)`, 'green');
    }
  }

  if (env.JWT_REFRESH_SECRET) {
    const jwtRefreshIssues = validateSecretStrength(
      env.JWT_REFRESH_SECRET,
      32,
      isProduction,
    );
    if (jwtRefreshIssues.length > 0) {
      errors.push(`JWT_REFRESH_SECRET: ${jwtRefreshIssues.join(', ')}`);
      print(`  ❌ JWT_REFRESH_SECRET: ${jwtRefreshIssues.join(', ')}`, 'red');
    } else {
      print(
        `  ✅ JWT_REFRESH_SECRET (${env.JWT_REFRESH_SECRET.length} chars)`,
        'green',
      );
    }

    // Check that JWT secrets are different
    if (env.JWT_SECRET === env.JWT_REFRESH_SECRET) {
      errors.push('JWT_SECRET and JWT_REFRESH_SECRET must be different');
      print('  ❌ JWT_SECRET and JWT_REFRESH_SECRET are identical', 'red');
    }
  }

  // Validate session secret
  if (env.SESSION_SECRET) {
    const sessionIssues = validateSecretStrength(
      env.SESSION_SECRET,
      32,
      isProduction,
    );
    if (sessionIssues.length > 0) {
      errors.push(`SESSION_SECRET: ${sessionIssues.join(', ')}`);
      print(`  ❌ SESSION_SECRET: ${sessionIssues.join(', ')}`, 'red');
    } else {
      print(
        `  ✅ SESSION_SECRET (${env.SESSION_SECRET.length} chars)`,
        'green',
      );
    }
  }

  // Validate Redis password
  print('\n💾 Validating Redis configuration...', 'cyan');
  if (env.REDIS_PASSWORD) {
    if (env.REDIS_PASSWORD.length < 12) {
      errors.push('REDIS_PASSWORD must be at least 12 characters');
      print(
        `  ❌ REDIS_PASSWORD too short (${env.REDIS_PASSWORD.length} chars)`,
        'red',
      );
    } else {
      print(
        `  ✅ REDIS_PASSWORD (${env.REDIS_PASSWORD.length} chars)`,
        'green',
      );
    }
  }

  // Validate URLs
  print('\n🌐 Validating URLs...', 'cyan');
  validationRules.urls.forEach((key) => {
    if (env[key]) {
      try {
        const url = new URL(env[key]);
        if (isProduction && url.protocol !== 'https:') {
          errors.push(`${key} must use HTTPS in production`);
          print(`  ❌ ${key}: Must use HTTPS`, 'red');
        } else {
          print(`  ✅ ${key}: ${url.protocol}//${url.host}`, 'green');
        }
      } catch (error) {
        errors.push(`${key}: Invalid URL format`);
        print(`  ❌ ${key}: Invalid URL`, 'red');
      }
    }
  });

  // Validate CORS
  print('\n🔒 Validating CORS configuration...', 'cyan');
  if (isProduction) {
    if (!env.ALLOWED_ORIGINS) {
      errors.push('ALLOWED_ORIGINS must be set in production');
      print('  ❌ ALLOWED_ORIGINS not set', 'red');
    } else if (env.ALLOWED_ORIGINS.includes('*')) {
      errors.push('ALLOWED_ORIGINS cannot contain wildcards in production');
      print('  ❌ ALLOWED_ORIGINS contains wildcard', 'red');
    } else {
      const origins = env.ALLOWED_ORIGINS.split(',');
      print(`  ✅ ALLOWED_ORIGINS: ${origins.length} origin(s)`, 'green');
      origins.forEach((origin) => {
        if (!origin.startsWith('https://') && !origin.includes('localhost')) {
          warnings.push(`CORS origin should use HTTPS: ${origin}`);
        }
      });
    }
  }

  // Validate MongoDB URI
  print('\n🗄️  Validating database configuration...', 'cyan');
  if (env.MONGODB_URI) {
    try {
      const url = new URL(env.MONGODB_URI);

      // Check for SSL in production
      if (isProduction && !env.MONGODB_URI.includes('ssl=true')) {
        warnings.push('MongoDB URI should include ssl=true in production');
        print('  ⚠️  SSL not explicitly enabled', 'yellow');
      }

      // Check for unsafe usernames
      const unsafeUsernames = ['admin', 'root', 'test'];
      if (
        url.username &&
        unsafeUsernames.includes(url.username.toLowerCase())
      ) {
        warnings.push(
          `MongoDB username "${url.username}" is not recommended for production`,
        );
        print(`  ⚠️  Username "${url.username}" not recommended`, 'yellow');
      } else {
        print('  ✅ MongoDB URI configured', 'green');
      }
    } catch (error) {
      errors.push('MONGODB_URI: Invalid format');
      print('  ❌ Invalid MongoDB URI format', 'red');
    }
  }

  // Validate feature flags for production
  print('\n🚩 Validating feature flags...', 'cyan');
  if (isProduction) {
    if (env.DEBUG_MODE === 'true') {
      errors.push('DEBUG_MODE must be false in production');
      print('  ❌ DEBUG_MODE is enabled', 'red');
    }

    if (env.SEED_DATA === 'true') {
      errors.push('SEED_DATA must be false in production');
      print('  ❌ SEED_DATA is enabled', 'red');
    }

    if (env.ENABLE_SWAGGER === 'true') {
      warnings.push(
        'ENABLE_SWAGGER is enabled in production (consider disabling)',
      );
      print('  ⚠️  ENABLE_SWAGGER is enabled', 'yellow');
    }

    print('  ✅ Feature flags validated', 'green');
  }

  // Validate storage configuration
  print('\n📦 Validating storage configuration...', 'cyan');
  if (env.STORAGE_USE_SSL === 'false' && isProduction) {
    errors.push('STORAGE_USE_SSL must be true in production');
    print('  ❌ Storage SSL disabled', 'red');
  } else if (env.STORAGE_ENDPOINT || env.STORAGE_BUCKET_NAME) {
    print('  ✅ Storage configured', 'green');
  }

  // Validate email configuration
  print('\n📧 Validating email configuration...', 'cyan');
  if (env.EMAIL_NOTIFICATIONS_ENABLED === 'true') {
    const emailRequired = [
      'SMTP_HOST',
      'SMTP_USER',
      'SMTP_PASSWORD',
      'SMTP_FROM_EMAIL',
    ];
    const missingEmail = emailRequired.filter((key) => !env[key]);

    if (missingEmail.length > 0) {
      warnings.push(`Email enabled but missing: ${missingEmail.join(', ')}`);
      print(`  ⚠️  Missing: ${missingEmail.join(', ')}`, 'yellow');
    } else {
      print('  ✅ Email configuration complete', 'green');
    }
  } else {
    print('  ℹ️  Email notifications disabled', 'blue');
  }

  // Print results
  printHeader('Validation Results');

  if (errors.length === 0 && warnings.length === 0) {
    print('\n✅ All validations passed!', 'green');
    print('Environment configuration is valid.\n', 'green');
    return true;
  }

  if (errors.length > 0) {
    print(`\n❌ Found ${errors.length} error(s):`, 'red');
    errors.forEach((error, i) => {
      print(`  ${i + 1}. ${error}`, 'red');
    });
  }

  if (warnings.length > 0) {
    print(`\n⚠️  Found ${warnings.length} warning(s):`, 'yellow');
    warnings.forEach((warning, i) => {
      print(`  ${i + 1}. ${warning}`, 'yellow');
    });
  }

  print(
    '\nRefer to docs/deployment/ENVIRONMENT_CONFIGURATION_GUIDE.md for help.\n',
    'cyan',
  );

  return errors.length === 0;
}

/**
 * Main function
 */
function main() {
  printHeader('SimplePro-v3 Environment Validation Tool');

  // Determine which file to validate
  const projectRoot = path.resolve(__dirname, '..');
  let envFilePath;

  if (fileArg) {
    envFilePath = path.resolve(fileArg);
  } else {
    const envFileName =
      envArg === 'development' ? '.env.local' : `.env.${envArg}`;
    envFilePath = path.join(projectRoot, 'apps', 'api', envFileName);
  }

  print(`\nValidating: ${envFilePath}`, 'cyan');

  // Check if file exists
  if (!fs.existsSync(envFilePath)) {
    print(`\n❌ Error: Environment file not found: ${envFilePath}`, 'red');
    print('\nAvailable template files:', 'yellow');
    print(`  - apps/api/.env.local.example`, 'blue');
    print(`  - apps/api/.env.staging.example`, 'blue');
    print(`  - apps/api/.env.production.example`, 'blue');
    print('\nCopy a template and configure it before validating.\n', 'yellow');
    process.exit(1);
  }

  // Load environment file
  let env;
  try {
    env = loadEnvFile(envFilePath);
    print(
      `✅ Successfully loaded ${Object.keys(env).length} variables\n`,
      'green',
    );
  } catch (error) {
    print(`\n❌ Error loading environment file: ${error.message}\n`, 'red');
    process.exit(1);
  }

  // Validate environment
  const isValid = validateEnvironment(env, envArg);

  // Exit with appropriate code
  process.exit(isValid ? 0 : 1);
}

// Run the script
try {
  main();
} catch (error) {
  print('\n❌ Unexpected error:', 'red');
  print(error.message, 'red');
  console.error(error.stack);
  process.exit(1);
}
