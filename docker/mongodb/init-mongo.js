// MongoDB initialization script for SimplePro
print('Starting SimplePro MongoDB initialization...');

// Create the application database if it doesn't exist
db = db.getSiblingDB('simplepro_dev');

// Create application user with necessary permissions
db.createUser({
  user: 'simplepro_user',
  pwd: 'simplepro_dev_pass_2024',
  roles: [
    {
      role: 'readWrite',
      db: 'simplepro_dev'
    }
  ]
});

// Create collections with validation schemas
print('Creating collections with validation...');

// Users collection
db.createCollection('users', {
  validator: {
    $jsonSchema: {
      bsonType: 'object',
      required: ['email', 'firstName', 'lastName', 'role', 'password', 'isActive'],
      properties: {
        email: { bsonType: 'string', pattern: '^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$' },
        firstName: { bsonType: 'string', minLength: 1 },
        lastName: { bsonType: 'string', minLength: 1 },
        role: { enum: ['super_admin', 'admin', 'dispatcher', 'crew'] },
        password: { bsonType: 'string', minLength: 8 },
        isActive: { bsonType: 'bool' },
        permissions: { bsonType: 'array' }
      }
    }
  }
});

// Jobs collection
db.createCollection('jobs', {
  validator: {
    $jsonSchema: {
      bsonType: 'object',
      required: ['title', 'type', 'status', 'customerId'],
      properties: {
        jobNumber: { bsonType: 'string' },
        title: { bsonType: 'string' },
        type: { enum: ['local', 'long_distance', 'storage', 'packing_only'] },
        status: { enum: ['draft', 'scheduled', 'confirmed', 'in_progress', 'completed', 'cancelled', 'on_hold'] },
        priority: { enum: ['low', 'normal', 'high', 'urgent'] },
        customerId: { bsonType: 'string' },
        scheduledDate: { bsonType: 'string' }
      }
    }
  }
});

// Customers collection
db.createCollection('customers', {
  validator: {
    $jsonSchema: {
      bsonType: 'object',
      required: ['firstName', 'lastName', 'email', 'phone', 'type', 'status'],
      properties: {
        firstName: { bsonType: 'string' },
        lastName: { bsonType: 'string' },
        email: { bsonType: 'string', pattern: '^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$' },
        phone: { bsonType: 'string' },
        type: { enum: ['residential', 'commercial'] },
        status: { enum: ['lead', 'prospect', 'active', 'inactive'] }
      }
    }
  }
});

// Estimates collection
db.createCollection('estimates', {
  validator: {
    $jsonSchema: {
      bsonType: 'object',
      required: ['customerId', 'estimateNumber', 'status', 'serviceType'],
      properties: {
        customerId: { bsonType: 'string' },
        estimateNumber: { bsonType: 'string' },
        status: { enum: ['draft', 'sent', 'viewed', 'accepted', 'rejected', 'expired'] },
        serviceType: { enum: ['local', 'long_distance', 'storage', 'packing_only'] }
      }
    }
  }
});

// User sessions collection
db.createCollection('user-sessions', {
  validator: {
    $jsonSchema: {
      bsonType: 'object',
      required: ['userId', 'accessToken', 'refreshToken', 'isActive', 'expiresAt'],
      properties: {
        userId: { bsonType: 'string' },
        accessToken: { bsonType: 'string' },
        refreshToken: { bsonType: 'string' },
        isActive: { bsonType: 'bool' },
        expiresAt: { bsonType: 'date' }
      }
    }
  }
});

// Create indexes for better performance
print('Creating indexes...');

// Users indexes
db.users.createIndex({ 'email': 1 }, { unique: true });
db.users.createIndex({ 'role': 1 });
db.users.createIndex({ 'isActive': 1 });

// Jobs indexes
db.jobs.createIndex({ 'jobNumber': 1 }, { unique: true });
db.jobs.createIndex({ 'customerId': 1 });
db.jobs.createIndex({ 'status': 1 });
db.jobs.createIndex({ 'scheduledDate': 1 });
db.jobs.createIndex({ 'assignedCrew.crewMemberId': 1 });
db.jobs.createIndex({ 'type': 1 });
db.jobs.createIndex({ 'createdAt': 1 });

// Customers indexes
db.customers.createIndex({ 'email': 1 }, { unique: true });
db.customers.createIndex({ 'status': 1 });
db.customers.createIndex({ 'type': 1 });
db.customers.createIndex({ 'lastName': 1, 'firstName': 1 });

// Estimates indexes
db.estimates.createIndex({ 'estimateNumber': 1 }, { unique: true });
db.estimates.createIndex({ 'customerId': 1 });
db.estimates.createIndex({ 'status': 1 });
db.estimates.createIndex({ 'createdAt': 1 });

// Sessions indexes
db['user-sessions'].createIndex({ 'userId': 1 });
db['user-sessions'].createIndex({ 'accessToken': 1 });
db['user-sessions'].createIndex({ 'refreshToken': 1 });
db['user-sessions'].createIndex({ 'expiresAt': 1 }, { expireAfterSeconds: 0 }); // TTL index

print('SimplePro MongoDB initialization completed successfully!');
print('Database: simplepro_dev');
print('User: simplepro_user');
print('Collections: users, jobs, customers, estimates, user-sessions');
print('Indexes created for optimal performance');