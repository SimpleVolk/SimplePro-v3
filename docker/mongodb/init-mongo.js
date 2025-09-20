// MongoDB initialization script for SimplePro
print('Starting SimplePro MongoDB initialization...');

// Create the application database if it doesn't exist
db = db.getSiblingDB('simplepro');

// Create application user with necessary permissions
db.createUser({
  user: 'simplepro_app',
  pwd: 'simplepro_app_password_2024',
  roles: [
    {
      role: 'readWrite',
      db: 'simplepro'
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
      required: ['username', 'email', 'passwordHash', 'firstName', 'lastName', 'role', 'isActive'],
      properties: {
        username: { bsonType: 'string', minLength: 3 },
        email: { bsonType: 'string', pattern: '^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$' },
        passwordHash: { bsonType: 'string' },
        firstName: { bsonType: 'string' },
        lastName: { bsonType: 'string' },
        role: { bsonType: 'object' },
        isActive: { bsonType: 'bool' }
      }
    }
  }
});

// Jobs collection
db.createCollection('jobs', {
  validator: {
    $jsonSchema: {
      bsonType: 'object',
      required: ['jobNumber', 'title', 'type', 'status', 'customerId', 'scheduledDate'],
      properties: {
        jobNumber: { bsonType: 'string' },
        title: { bsonType: 'string' },
        type: { enum: ['local', 'long_distance', 'storage', 'packing_only'] },
        status: { enum: ['scheduled', 'in_progress', 'completed', 'cancelled', 'on_hold'] },
        customerId: { bsonType: 'string' },
        scheduledDate: { bsonType: 'date' }
      }
    }
  }
});

// Customers collection
db.createCollection('customers', {
  validator: {
    $jsonSchema: {
      bsonType: 'object',
      required: ['firstName', 'lastName', 'email', 'phone'],
      properties: {
        firstName: { bsonType: 'string' },
        lastName: { bsonType: 'string' },
        email: { bsonType: 'string', pattern: '^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$' },
        phone: { bsonType: 'string' }
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
db.createCollection('sessions', {
  validator: {
    $jsonSchema: {
      bsonType: 'object',
      required: ['userId', 'token', 'refreshToken', 'isActive', 'expiresAt'],
      properties: {
        userId: { bsonType: 'string' },
        token: { bsonType: 'string' },
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
db.users.createIndex({ 'username': 1 }, { unique: true });
db.users.createIndex({ 'email': 1 }, { unique: true });
db.users.createIndex({ 'role.name': 1 });
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
db.customers.createIndex({ 'phone': 1 });
db.customers.createIndex({ 'lastName': 1, 'firstName': 1 });

// Estimates indexes
db.estimates.createIndex({ 'estimateNumber': 1 }, { unique: true });
db.estimates.createIndex({ 'customerId': 1 });
db.estimates.createIndex({ 'status': 1 });
db.estimates.createIndex({ 'createdAt': 1 });

// Sessions indexes
db.sessions.createIndex({ 'userId': 1 });
db.sessions.createIndex({ 'token': 1 });
db.sessions.createIndex({ 'refreshToken': 1 });
db.sessions.createIndex({ 'expiresAt': 1 }, { expireAfterSeconds: 0 }); // TTL index

print('SimplePro MongoDB initialization completed successfully!');
print('Database: simplepro');
print('User: simplepro_app');
print('Collections: users, jobs, customers, estimates, sessions');
print('Indexes created for optimal performance');