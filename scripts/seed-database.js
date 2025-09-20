const { MongoClient } = require('mongodb');
const bcrypt = require('bcryptjs');
const fs = require('fs').promises;
const path = require('path');

// Configuration
const MONGODB_URI = process.env.DATABASE_URL || 'mongodb://admin:simplepro_dev_2024@localhost:27017/simplepro_dev?authSource=admin';
const DB_NAME = 'simplepro_dev';

// Load seed data
async function loadSeedData() {
  try {
    const [usersData, customersData, jobsData] = await Promise.all([
      fs.readFile(path.join(__dirname, 'seed-data', 'users.json'), 'utf8'),
      fs.readFile(path.join(__dirname, 'seed-data', 'customers.json'), 'utf8'),
      fs.readFile(path.join(__dirname, 'seed-data', 'jobs.json'), 'utf8')
    ]);

    return {
      users: JSON.parse(usersData),
      customers: JSON.parse(customersData),
      jobs: JSON.parse(jobsData)
    };
  } catch (error) {
    console.error('Error loading seed data:', error);
    process.exit(1);
  }
}

// Hash passwords for users
async function hashPasswords(users) {
  const hashedUsers = [];

  for (const user of users) {
    const hashedPassword = await bcrypt.hash(user.password, 12);
    hashedUsers.push({
      ...user,
      password: hashedPassword,
      createdAt: new Date(),
      updatedAt: new Date(),
      lastLoginAt: null,
      loginAttempts: 0,
      isLocked: false,
      lockUntil: null
    });
  }

  return hashedUsers;
}

// Add timestamps and IDs to data
function prepareCustomers(customers) {
  return customers.map(customer => ({
    ...customer,
    createdAt: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000), // Random date within last 30 days
    updatedAt: new Date(),
    lastContactDate: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000), // Random date within last 7 days
    estimates: [],
    jobs: []
  }));
}

function prepareJobs(jobs) {
  return jobs.map(job => {
    const createdAt = new Date(Date.now() - Math.random() * 15 * 24 * 60 * 60 * 1000); // Random date within last 15 days
    const jobNumber = `JOB-${new Date().getFullYear()}-${String(Math.floor(Math.random() * 9999) + 1).padStart(4, '0')}`;

    return {
      ...job,
      jobNumber,
      createdAt,
      updatedAt: new Date(),
      lastModifiedBy: job.createdBy,
      milestones: [],
      photos: [],
      documents: [],
      customerNotifications: [],
      internalNotes: [],
      inventory: [],
      services: [],
      equipment: [],
      additionalCharges: []
    };
  });
}

// Main seeding function
async function seedDatabase() {
  console.log('🌱 Starting database seeding...');

  const client = new MongoClient(MONGODB_URI);

  try {
    await client.connect();
    console.log('✅ Connected to MongoDB');

    const db = client.db(DB_NAME);

    // Load seed data
    const seedData = await loadSeedData();
    console.log('📁 Loaded seed data files');

    // Clear existing data
    console.log('🧹 Clearing existing data...');
    await Promise.all([
      db.collection('users').deleteMany({}),
      db.collection('customers').deleteMany({}),
      db.collection('jobs').deleteMany({}),
      db.collection('user-sessions').deleteMany({})
    ]);

    // Prepare and insert users
    console.log('👥 Seeding users...');
    const preparedUsers = await hashPasswords(seedData.users);
    await db.collection('users').insertMany(preparedUsers);
    console.log(`✅ Inserted ${preparedUsers.length} users`);

    // Prepare and insert customers
    console.log('🏢 Seeding customers...');
    const preparedCustomers = prepareCustomers(seedData.customers);
    await db.collection('customers').insertMany(preparedCustomers);
    console.log(`✅ Inserted ${preparedCustomers.length} customers`);

    // Prepare and insert jobs
    console.log('💼 Seeding jobs...');
    const preparedJobs = prepareJobs(seedData.jobs);
    await db.collection('jobs').insertMany(preparedJobs);
    console.log(`✅ Inserted ${preparedJobs.length} jobs`);

    // Create indexes for better performance
    console.log('📊 Creating database indexes...');
    await Promise.all([
      // User indexes
      db.collection('users').createIndex({ email: 1 }, { unique: true }),
      db.collection('users').createIndex({ role: 1 }),
      db.collection('users').createIndex({ isActive: 1 }),

      // Customer indexes
      db.collection('customers').createIndex({ email: 1 }, { unique: true }),
      db.collection('customers').createIndex({ status: 1 }),
      db.collection('customers').createIndex({ type: 1 }),
      db.collection('customers').createIndex({ createdAt: -1 }),
      db.collection('customers').createIndex({ lastName: 1, firstName: 1 }),

      // Job indexes
      db.collection('jobs').createIndex({ jobNumber: 1 }, { unique: true }),
      db.collection('jobs').createIndex({ customerId: 1 }),
      db.collection('jobs').createIndex({ status: 1 }),
      db.collection('jobs').createIndex({ scheduledDate: 1 }),
      db.collection('jobs').createIndex({ createdAt: -1 }),
      db.collection('jobs').createIndex({ 'assignedCrew.crewMemberId': 1 }),

      // Session indexes (TTL for automatic cleanup)
      db.collection('user-sessions').createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 })
    ]);
    console.log('✅ Created database indexes');

    // Display summary
    console.log('\n🎉 Database seeding completed successfully!');
    console.log('\n📊 Summary:');
    console.log(`   Users:     ${preparedUsers.length}`);
    console.log(`   Customers: ${preparedCustomers.length}`);
    console.log(`   Jobs:      ${preparedJobs.length}`);

    console.log('\n🔐 Login Credentials:');
    console.log('   Super Admin: admin@simplepro.com / Admin123!');
    console.log('   Dispatcher:  dispatcher@simplepro.com / Dispatch123!');
    console.log('   Sales:       sales@simplepro.com / Sales123!');
    console.log('   Crew:        crew.lead@simplepro.com / Crew123!');

    console.log('\n🌐 Next Steps:');
    console.log('   1. Start the API: npm run dev:api');
    console.log('   2. Start the Web App: npm run dev:web');
    console.log('   3. Visit: http://localhost:3000');

  } catch (error) {
    console.error('❌ Error seeding database:', error);
    process.exit(1);
  } finally {
    await client.close();
    console.log('🔌 Disconnected from MongoDB');
  }
}

// Run the seeding script
if (require.main === module) {
  seedDatabase().catch(console.error);
}

module.exports = { seedDatabase };