#!/usr/bin/env node

/**
 * Seed Data Validation Script
 * Validates the structure and content of seed data files
 * without requiring a running MongoDB instance
 */

const fs = require('fs').promises;
const path = require('path');
const bcrypt = require('bcryptjs');

// Validation rules for each data type
const validationRules = {
  users: {
    required: ['email', 'firstName', 'lastName', 'role', 'password'],
    email: /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/,
    roles: ['super_admin', 'admin', 'dispatcher', 'crew'],
    passwordMinLength: 8,
  },
  customers: {
    required: ['firstName', 'lastName', 'email', 'phone', 'type', 'status'],
    email: /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/,
    types: ['residential', 'commercial'],
    statuses: ['lead', 'prospect', 'active', 'inactive'],
  },
  jobs: {
    required: ['title', 'description', 'type', 'status', 'customerId'],
    types: ['local', 'long_distance', 'storage', 'packing_only'],
    statuses: [
      'draft',
      'scheduled',
      'confirmed',
      'in_progress',
      'completed',
      'cancelled',
      'on_hold',
    ],
    priorities: ['low', 'normal', 'high', 'urgent'],
  },
};

// Validation functions
function validateRequired(item, required, itemType, index) {
  const errors = [];
  for (const field of required) {
    if (!item[field]) {
      errors.push(`${itemType}[${index}] missing required field: ${field}`);
    }
  }
  return errors;
}

function validateEmail(email, itemType, index) {
  if (!validationRules.users.email.test(email)) {
    return [`${itemType}[${index}] invalid email format: ${email}`];
  }
  return [];
}

function validateEnum(value, allowedValues, field, itemType, index) {
  if (value && !allowedValues.includes(value)) {
    return [
      `${itemType}[${index}] invalid ${field}: ${value}. Allowed: ${allowedValues.join(', ')}`,
    ];
  }
  return [];
}

function validatePasswordStrength(password, itemType, index) {
  const errors = [];
  if (password.length < validationRules.users.passwordMinLength) {
    errors.push(
      `${itemType}[${index}] password too short (min ${validationRules.users.passwordMinLength} chars)`,
    );
  }

  // Check for at least one uppercase, one lowercase, one number, one special char
  if (!/[A-Z]/.test(password)) {
    errors.push(`${itemType}[${index}] password must contain uppercase letter`);
  }
  if (!/[a-z]/.test(password)) {
    errors.push(`${itemType}[${index}] password must contain lowercase letter`);
  }
  if (!/[0-9]/.test(password)) {
    errors.push(`${itemType}[${index}] password must contain number`);
  }
  if (!/[!@#$%^&*]/.test(password)) {
    errors.push(
      `${itemType}[${index}] password must contain special character`,
    );
  }

  return errors;
}

// Data type specific validators
function validateUsers(users) {
  const errors = [];
  const emails = new Set();

  users.forEach((user, index) => {
    // Required fields
    errors.push(
      ...validateRequired(user, validationRules.users.required, 'users', index),
    );

    // Email validation and uniqueness
    if (user.email) {
      errors.push(...validateEmail(user.email, 'users', index));
      if (emails.has(user.email)) {
        errors.push(`users[${index}] duplicate email: ${user.email}`);
      }
      emails.add(user.email);
    }

    // Role validation
    errors.push(
      ...validateEnum(
        user.role,
        validationRules.users.roles,
        'role',
        'users',
        index,
      ),
    );

    // Password validation
    if (user.password) {
      errors.push(...validatePasswordStrength(user.password, 'users', index));
    }

    // Permissions validation
    if (user.permissions && !Array.isArray(user.permissions)) {
      errors.push(`users[${index}] permissions must be an array`);
    }
  });

  return errors;
}

function validateCustomers(customers) {
  const errors = [];
  const emails = new Set();

  customers.forEach((customer, index) => {
    // Required fields
    errors.push(
      ...validateRequired(
        customer,
        validationRules.customers.required,
        'customers',
        index,
      ),
    );

    // Email validation and uniqueness
    if (customer.email) {
      errors.push(...validateEmail(customer.email, 'customers', index));
      if (emails.has(customer.email)) {
        errors.push(`customers[${index}] duplicate email: ${customer.email}`);
      }
      emails.add(customer.email);
    }

    // Type validation
    errors.push(
      ...validateEnum(
        customer.type,
        validationRules.customers.types,
        'type',
        'customers',
        index,
      ),
    );

    // Status validation
    errors.push(
      ...validateEnum(
        customer.status,
        validationRules.customers.statuses,
        'status',
        'customers',
        index,
      ),
    );

    // Address validation
    if (customer.address && typeof customer.address !== 'object') {
      errors.push(`customers[${index}] address must be an object`);
    }
  });

  return errors;
}

function validateJobs(jobs, customerEmails) {
  const errors = [];
  const jobNumbers = new Set();

  jobs.forEach((job, index) => {
    // Required fields
    errors.push(
      ...validateRequired(job, validationRules.jobs.required, 'jobs', index),
    );

    // Type validation
    errors.push(
      ...validateEnum(
        job.type,
        validationRules.jobs.types,
        'type',
        'jobs',
        index,
      ),
    );

    // Status validation
    errors.push(
      ...validateEnum(
        job.status,
        validationRules.jobs.statuses,
        'status',
        'jobs',
        index,
      ),
    );

    // Priority validation
    if (job.priority) {
      errors.push(
        ...validateEnum(
          job.priority,
          validationRules.jobs.priorities,
          'priority',
          'jobs',
          index,
        ),
      );
    }

    // Customer ID validation (should exist in customers)
    if (job.customerId && !customerEmails.has(job.customerId)) {
      errors.push(
        `jobs[${index}] references non-existent customer: ${job.customerId}`,
      );
    }

    // Job number uniqueness (if present)
    if (job.jobNumber) {
      if (jobNumbers.has(job.jobNumber)) {
        errors.push(`jobs[${index}] duplicate job number: ${job.jobNumber}`);
      }
      jobNumbers.add(job.jobNumber);
    }

    // Address validation
    if (job.pickupAddress && typeof job.pickupAddress !== 'object') {
      errors.push(`jobs[${index}] pickupAddress must be an object`);
    }
    if (job.deliveryAddress && typeof job.deliveryAddress !== 'object') {
      errors.push(`jobs[${index}] deliveryAddress must be an object`);
    }

    // Crew validation
    if (job.assignedCrew && !Array.isArray(job.assignedCrew)) {
      errors.push(`jobs[${index}] assignedCrew must be an array`);
    }
  });

  return errors;
}

async function validateSeedData() {
  console.log('🔍 Starting seed data validation...\n');

  let totalErrors = 0;

  try {
    // Load all seed data files
    const [usersData, customersData, jobsData] = await Promise.all([
      fs.readFile(path.join(__dirname, 'seed-data', 'users.json'), 'utf8'),
      fs.readFile(path.join(__dirname, 'seed-data', 'customers.json'), 'utf8'),
      fs.readFile(path.join(__dirname, 'seed-data', 'jobs.json'), 'utf8'),
    ]);

    const users = JSON.parse(usersData);
    const customers = JSON.parse(customersData);
    const jobs = JSON.parse(jobsData);

    console.log(`📊 Data Summary:`);
    console.log(`   Users: ${users.length}`);
    console.log(`   Customers: ${customers.length}`);
    console.log(`   Jobs: ${jobs.length}\n`);

    // Validate users
    console.log('👥 Validating users...');
    const userErrors = validateUsers(users);
    if (userErrors.length > 0) {
      console.log('❌ User validation errors:');
      userErrors.forEach((error) => console.log(`   ${error}`));
      totalErrors += userErrors.length;
    } else {
      console.log('✅ Users validation passed');
    }
    console.log();

    // Validate customers
    console.log('🏢 Validating customers...');
    const customerErrors = validateCustomers(customers);
    if (customerErrors.length > 0) {
      console.log('❌ Customer validation errors:');
      customerErrors.forEach((error) => console.log(`   ${error}`));
      totalErrors += customerErrors.length;
    } else {
      console.log('✅ Customers validation passed');
    }
    console.log();

    // Validate jobs
    console.log('💼 Validating jobs...');
    const customerEmails = new Set(customers.map((c) => c.email));
    const jobErrors = validateJobs(jobs, customerEmails);
    if (jobErrors.length > 0) {
      console.log('❌ Job validation errors:');
      jobErrors.forEach((error) => console.log(`   ${error}`));
      totalErrors += jobErrors.length;
    } else {
      console.log('✅ Jobs validation passed');
    }
    console.log();

    // Test password hashing
    console.log('🔐 Testing password hashing...');
    const testPassword = users[0].password;
    const hashedPassword = await bcrypt.hash(testPassword, 12);
    const isValidPassword = await bcrypt.compare(testPassword, hashedPassword);

    if (isValidPassword) {
      console.log('✅ Password hashing test passed');
    } else {
      console.log('❌ Password hashing test failed');
      totalErrors++;
    }
    console.log();

    // Summary
    if (totalErrors === 0) {
      console.log('🎉 All validation tests passed! Seed data is ready.');
      console.log('\n📋 Next steps:');
      console.log('   1. Start MongoDB: npm run docker:dev');
      console.log('   2. Run seed script: node scripts/seed-database.js');
      console.log('   3. Start API: npm run dev:api');
      console.log('   4. Start Web: npm run dev:web');
    } else {
      console.log(
        `❌ Validation failed with ${totalErrors} error(s). Please fix the issues above.`,
      );
      process.exit(1);
    }
  } catch (error) {
    console.error('❌ Error during validation:', error.message);
    process.exit(1);
  }
}

// Run validation if called directly
if (require.main === module) {
  validateSeedData().catch(console.error);
}

module.exports = { validateSeedData };
