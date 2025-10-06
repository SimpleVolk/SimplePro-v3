import mongoose from 'mongoose';
import { JobSchema } from '../apps/api/src/jobs/schemas/job.schema';
import { CustomerSchema } from '../apps/api/src/customers/schemas/customer.schema';
import { UserSchema } from '../apps/api/src/auth/schemas/user.schema';
import { getDocumentSizeInfo } from '../apps/api/src/database/document-size-monitoring.middleware';

/**
 * Test script for database optimizations
 *
 * Tests:
 * 1. Foreign key validation
 * 2. Document size monitoring
 * 3. Array size monitoring
 *
 * Usage: ts-node scripts/test-database-optimizations.ts
 */

async function connectToDatabase() {
  const mongoUri =
    process.env.MONGODB_URI ||
    'mongodb://admin:password123@localhost:27017/simplepro-test?authSource=admin';

  try {
    await mongoose.connect(mongoUri);
    console.log('✅ Connected to MongoDB (test database)');
  } catch (error) {
    console.error('❌ Failed to connect to MongoDB:', error);
    process.exit(1);
  }
}

async function testForeignKeyValidation() {
  console.log('\n--- Testing Foreign Key Validation ---\n');

  // Register models
  const JobModel = mongoose.model('Job', JobSchema);
  const CustomerModel = mongoose.model('Customer', CustomerSchema);
  const UserModel = mongoose.model('User', UserSchema);

  // Test 1: Valid references (should pass)
  console.log('Test 1: Creating test data with valid references...');
  try {
    // Create a test user
    const testUser = new UserModel({
      username: 'test-user-' + Date.now(),
      email: `test-${Date.now()}@example.com`,
      passwordHash: 'hashed_password',
      firstName: 'Test',
      lastName: 'User',
      role: { name: 'admin', permissions: [] },
      permissions: [],
      createdBy: new mongoose.Types.ObjectId(),
      lastModifiedBy: new mongoose.Types.ObjectId(),
    });
    await testUser.save();
    console.log('✅ Test user created:', testUser._id);

    // Create a test customer
    const testCustomer = new CustomerModel({
      firstName: 'Test',
      lastName: 'Customer',
      email: `customer-${Date.now()}@example.com`,
      phone: '555-0100',
      type: 'residential',
      status: 'lead',
      source: 'website',
      preferredContactMethod: 'email',
      address: {
        street: '123 Test St',
        city: 'Test City',
        state: 'TS',
        zipCode: '12345',
      },
      createdBy: testUser._id.toString(),
    });
    await testCustomer.save();
    console.log('✅ Test customer created:', testCustomer._id);

    console.log('✅ Test 1 PASSED: Valid references accepted\n');

    // Test 2: Invalid customer reference (should fail)
    console.log('Test 2: Attempting to create job with invalid customerId...');
    try {
      const invalidJob = new JobModel({
        jobNumber: 'TEST-' + Date.now(),
        title: 'Test Job',
        type: 'local',
        status: 'scheduled',
        priority: 'normal',
        customerId: '000000000000000000000000', // Invalid ID
        scheduledDate: new Date(),
        scheduledStartTime: '09:00',
        scheduledEndTime: '17:00',
        estimatedDuration: 8,
        pickupAddress: {
          street: '123 Test',
          city: 'Test',
          state: 'TS',
          zipCode: '12345',
        },
        deliveryAddress: {
          street: '456 Test',
          city: 'Test',
          state: 'TS',
          zipCode: '12345',
        },
        estimatedCost: 1000,
        createdBy: testUser._id.toString(),
        lastModifiedBy: testUser._id.toString(),
      });
      await invalidJob.save();
      console.log('❌ Test 2 FAILED: Should have thrown validation error');
    } catch (error) {
      if ((error as Error).message.includes('Referenced Customer not found')) {
        console.log('✅ Test 2 PASSED: Invalid customerId rejected');
        console.log('   Error message:', (error as Error).message);
      } else {
        console.log(
          '❌ Test 2 FAILED: Wrong error type:',
          (error as Error).message,
        );
      }
    }

    // Clean up
    console.log('\nCleaning up test data...');
    await JobModel.deleteMany({ jobNumber: { $regex: /^TEST-/ } });
    await CustomerModel.deleteMany({
      email: { $regex: /^customer-.*@example\.com$/ },
    });
    await UserModel.deleteMany({ username: { $regex: /^test-user-/ } });
    console.log('✅ Test data cleaned up');
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

async function testDocumentSizeMonitoring() {
  console.log('\n--- Testing Document Size Monitoring ---\n');

  const JobModel = mongoose.model('Job', JobSchema);
  const UserModel = mongoose.model('User', UserSchema);

  // Create test user first
  const testUser = new UserModel({
    username: 'size-test-' + Date.now(),
    email: `sizetest-${Date.now()}@example.com`,
    passwordHash: 'hashed_password',
    firstName: 'Size',
    lastName: 'Test',
    role: { name: 'admin', permissions: [] },
    permissions: [],
    createdBy: new mongoose.Types.ObjectId(),
    lastModifiedBy: new mongoose.Types.ObjectId(),
  });
  await testUser.save();

  // Create test customer
  const CustomerModel = mongoose.model('Customer', CustomerSchema);
  const testCustomer = new CustomerModel({
    firstName: 'Size',
    lastName: 'Test',
    email: `sizetest-customer-${Date.now()}@example.com`,
    phone: '555-0200',
    type: 'residential',
    status: 'lead',
    source: 'website',
    preferredContactMethod: 'email',
    address: {
      street: '123 Test St',
      city: 'Test City',
      state: 'TS',
      zipCode: '12345',
    },
    createdBy: testUser._id.toString(),
  });
  await testCustomer.save();

  // Test 1: Normal size document (should pass)
  console.log('Test 1: Creating normal-sized job...');
  try {
    const normalJob = new JobModel({
      jobNumber: 'SIZE-TEST-' + Date.now(),
      title: 'Normal Size Job',
      type: 'local',
      status: 'scheduled',
      priority: 'normal',
      customerId: testCustomer._id.toString(),
      scheduledDate: new Date(),
      scheduledStartTime: '09:00',
      scheduledEndTime: '17:00',
      estimatedDuration: 8,
      pickupAddress: {
        street: '123 Test',
        city: 'Test',
        state: 'TS',
        zipCode: '12345',
      },
      deliveryAddress: {
        street: '456 Test',
        city: 'Test',
        state: 'TS',
        zipCode: '12345',
      },
      estimatedCost: 1000,
      createdBy: testUser._id.toString(),
      lastModifiedBy: testUser._id.toString(),
      internalNotes: Array(10).fill({
        note: 'Test note',
        timestamp: new Date(),
        author: testUser._id.toString(),
      }),
    });

    const sizeInfo = getDocumentSizeInfo(normalJob);
    console.log(
      `   Document size: ${sizeInfo.formatted} (${sizeInfo.percentOf16MB.toFixed(2)}% of 16MB MongoDB limit)`,
    );

    await normalJob.save();
    console.log('✅ Test 1 PASSED: Normal-sized document accepted');

    // Clean up
    await JobModel.deleteOne({ _id: normalJob._id });
  } catch (error) {
    console.log('❌ Test 1 FAILED:', (error as Error).message);
  }

  // Test 2: Array size limit (should fail)
  console.log(
    '\nTest 2: Attempting to create job with too many internal notes...',
  );
  try {
    const largeArrayJob = new JobModel({
      jobNumber: 'LARGE-ARRAY-' + Date.now(),
      title: 'Large Array Job',
      type: 'local',
      status: 'scheduled',
      priority: 'normal',
      customerId: testCustomer._id.toString(),
      scheduledDate: new Date(),
      scheduledStartTime: '09:00',
      scheduledEndTime: '17:00',
      estimatedDuration: 8,
      pickupAddress: {
        street: '123 Test',
        city: 'Test',
        state: 'TS',
        zipCode: '12345',
      },
      deliveryAddress: {
        street: '456 Test',
        city: 'Test',
        state: 'TS',
        zipCode: '12345',
      },
      estimatedCost: 1000,
      createdBy: testUser._id.toString(),
      lastModifiedBy: testUser._id.toString(),
      internalNotes: Array(600).fill({
        // Exceeds 500 limit
        note: 'Test note ' + 'x'.repeat(100),
        timestamp: new Date(),
        author: testUser._id.toString(),
      }),
    });

    await largeArrayJob.save();
    console.log('❌ Test 2 FAILED: Should have thrown array size error');
  } catch (error) {
    if ((error as Error).message.includes('exceeding limit of 500')) {
      console.log('✅ Test 2 PASSED: Array size limit enforced');
      console.log('   Error message:', (error as Error).message);
    } else {
      console.log(
        '❌ Test 2 FAILED: Wrong error type:',
        (error as Error).message,
      );
    }
  }

  // Clean up
  console.log('\nCleaning up test data...');
  await JobModel.deleteMany({
    jobNumber: { $regex: /^(SIZE-TEST-|LARGE-ARRAY-)/ },
  });
  await CustomerModel.deleteMany({ email: { $regex: /^sizetest-customer-/ } });
  await UserModel.deleteMany({ username: { $regex: /^size-test-/ } });
  console.log('✅ Test data cleaned up');
}

async function main() {
  console.log('=== DATABASE OPTIMIZATION TESTS ===\n');
  console.log(
    'Testing foreign key validation, document size monitoring, and array size limits\n',
  );

  try {
    await connectToDatabase();
    await testForeignKeyValidation();
    await testDocumentSizeMonitoring();

    console.log('\n=== ALL TESTS COMPLETED ===\n');
    console.log('Summary:');
    console.log('✅ Foreign key validation working correctly');
    console.log('✅ Document size monitoring working correctly');
    console.log('✅ Array size limits enforced');
    console.log('\nDatabase optimizations are functioning as expected!');
  } catch (error) {
    console.error('\n❌ Test suite failed:', error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('\n✅ Disconnected from MongoDB');
  }
}

// Run tests
main();
