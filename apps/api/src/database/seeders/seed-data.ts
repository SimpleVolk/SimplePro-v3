#!/usr/bin/env node
/**
 * Comprehensive Development Database Seeder
 *
 * Usage:
 *   npm run seed:dev
 *   npm run seed:dev -- --clear  (clear existing data first)
 *   MONGODB_URI=your_uri npm run seed:dev
 *
 * This script populates the development database with realistic test data
 * for all major entities in the SimplePro system.
 */

import { config } from 'dotenv';
import * as mongoose from 'mongoose';
import * as path from 'path';
import { faker } from '@faker-js/faker';

// Load environment variables
config({ path: path.resolve(__dirname, '../../../../../.env') });

// Import schemas
import { UserSchema } from '../../auth/schemas/user.schema';
import { CustomerSchema } from '../../customers/schemas/customer.schema';
import { JobSchema } from '../../jobs/schemas/job.schema';
import { OpportunitySchema } from '../../opportunities/schemas/opportunity.schema';
import { PartnerSchema } from '../../partners/schemas/partner.schema';
import { MessageSchema } from '../../messages/schemas/message.schema';
import { MessageThreadSchema } from '../../messages/schemas/message-thread.schema';
import { NotificationSchema } from '../../notifications/schemas/notification.schema';
import { TariffSettingsSchema } from '../../tariff-settings/schemas/tariff-settings.schema';

// Seed data generators
import { seedUsers } from './seeders/users.seeder';
import { seedCustomers } from './seeders/customers.seeder';
import { seedPartners } from './seeders/partners.seeder';
import { seedOpportunities } from './seeders/opportunities.seeder';
import { seedJobs } from './seeders/jobs.seeder';
import { seedMessages } from './seeders/messages.seeder';
import { seedNotifications } from './seeders/notifications.seeder';

/**
 * Main seeding function
 */
async function main() {
  const mongoUri = process.env.MONGODB_URI || process.env.DATABASE_URL;
  const shouldClear = process.argv.includes('--clear') || process.argv.includes('-c');

  if (!mongoUri) {
    console.error('❌ Error: MONGODB_URI or DATABASE_URL environment variable is required');
    console.error('');
    console.error('Usage:');
    console.error('  MONGODB_URI=mongodb://localhost:27017/simplepro npm run seed:dev');
    process.exit(1);
  }

  console.log('');
  console.log('╔════════════════════════════════════════════════════════════════════╗');
  console.log('║           SimplePro - Development Database Seeder                 ║');
  console.log('╚════════════════════════════════════════════════════════════════════╝');
  console.log('');

  try {
    // Connect to MongoDB
    console.log('🔌 Connecting to MongoDB...');
    console.log(`   URI: ${mongoUri.replace(/\/\/[^:]+:[^@]+@/, '//***:***@')}`);
    await mongoose.connect(mongoUri);
    console.log('✅ Connected to MongoDB');
    console.log('');

    // Register models
    const UserModel = mongoose.models.User || mongoose.model('User', UserSchema);
    const CustomerModel = mongoose.models.Customer || mongoose.model('Customer', CustomerSchema);
    const JobModel = mongoose.models.Job || mongoose.model('Job', JobSchema);
    const OpportunityModel = mongoose.models.Opportunity || mongoose.model('Opportunity', OpportunitySchema);
    const PartnerModel = mongoose.models.Partner || mongoose.model('Partner', PartnerSchema);
    const MessageModel = mongoose.models.Message || mongoose.model('Message', MessageSchema);
    const MessageThreadModel = mongoose.models.MessageThread || mongoose.model('MessageThread', MessageThreadSchema);
    const NotificationModel = mongoose.models.Notification || mongoose.model('Notification', NotificationSchema);
    const TariffModel = mongoose.models.TariffSettings || mongoose.model('TariffSettings', TariffSettingsSchema);

    // Clear existing data if requested
    if (shouldClear) {
      console.log('🗑️  Clearing existing seed data...');

      // Only clear non-tariff collections to preserve tariff settings
      await UserModel.deleteMany({ username: { $ne: 'admin' } }); // Keep admin user
      await CustomerModel.deleteMany({});
      await JobModel.deleteMany({});
      await OpportunityModel.deleteMany({});
      await PartnerModel.deleteMany({});
      await MessageModel.deleteMany({});
      await MessageThreadModel.deleteMany({});
      await NotificationModel.deleteMany({});

      console.log('✅ Existing data cleared (admin user and tariff settings preserved)');
      console.log('');
    }

    // Check for existing data
    const userCount = await UserModel.countDocuments();
    const customerCount = await CustomerModel.countDocuments();
    const jobCount = await JobModel.countDocuments();

    if (userCount > 1 || customerCount > 0 || jobCount > 0) {
      console.log('⚠️  Warning: Database already contains data');
      console.log(`   Users: ${userCount}, Customers: ${customerCount}, Jobs: ${jobCount}`);
      console.log('');
      console.log('   Run with --clear flag to remove existing data:');
      console.log('   npm run seed:dev -- --clear');
      console.log('');

      if (!shouldClear) {
        console.log('   Continuing with seeding (may create duplicates)...');
        console.log('');
      }
    }

    // Seed statistics
    const stats = {
      users: 0,
      customers: 0,
      jobs: 0,
      opportunities: 0,
      partners: 0,
      messages: 0,
      notifications: 0,
    };

    // 1. Seed Users (5-10 users with different roles)
    console.log('👥 Seeding users...');
    const users = await seedUsers(UserModel);
    stats.users = users.length;
    console.log(`✅ Created ${users.length} users`);
    console.log('');

    // 2. Seed Partners (5-10 referral partners)
    console.log('🤝 Seeding partners...');
    const partners = await seedPartners(PartnerModel, users);
    stats.partners = partners.length;
    console.log(`✅ Created ${partners.length} partners`);
    console.log('');

    // 3. Seed Customers (20-30 customers)
    console.log('👤 Seeding customers...');
    const customers = await seedCustomers(CustomerModel, users, partners);
    stats.customers = customers.length;
    console.log(`✅ Created ${customers.length} customers`);
    console.log('');

    // 4. Seed Opportunities (40-60 estimates)
    console.log('💼 Seeding opportunities...');
    const opportunities = await seedOpportunities(OpportunityModel, customers, users);
    stats.opportunities = opportunities.length;
    console.log(`✅ Created ${opportunities.length} opportunities`);
    console.log('');

    // 5. Seed Jobs (30-50 jobs)
    console.log('📋 Seeding jobs...');
    const jobs = await seedJobs(JobModel, customers, users, opportunities);
    stats.jobs = jobs.length;
    console.log(`✅ Created ${jobs.length} jobs`);
    console.log('');

    // 6. Seed Messages (sample message threads)
    console.log('💬 Seeding messages...');
    const messageCount = await seedMessages(MessageModel, MessageThreadModel, users);
    stats.messages = messageCount;
    console.log(`✅ Created ${messageCount} messages in threads`);
    console.log('');

    // 7. Seed Notifications (sample notifications)
    console.log('🔔 Seeding notifications...');
    const notificationCount = await seedNotifications(NotificationModel, users, jobs);
    stats.notifications = notificationCount;
    console.log(`✅ Created ${notificationCount} notifications`);
    console.log('');

    // Summary
    console.log('╔════════════════════════════════════════════════════════════════════╗');
    console.log('║                    Seeding Completed Successfully                  ║');
    console.log('╚════════════════════════════════════════════════════════════════════╝');
    console.log('');
    console.log('📊 Summary Statistics:');
    console.log('');
    console.log(`   👥 Users:          ${stats.users.toString().padStart(3)} (admin + test users)`);
    console.log(`   🤝 Partners:       ${stats.partners.toString().padStart(3)} referral partners`);
    console.log(`   👤 Customers:      ${stats.customers.toString().padStart(3)} residential & commercial`);
    console.log(`   💼 Opportunities:  ${stats.opportunities.toString().padStart(3)} estimates/quotes`);
    console.log(`   📋 Jobs:           ${stats.jobs.toString().padStart(3)} across all statuses`);
    console.log(`   💬 Messages:       ${stats.messages.toString().padStart(3)} in conversation threads`);
    console.log(`   🔔 Notifications:  ${stats.notifications.toString().padStart(3)} various types`);
    console.log('');
    console.log('🎯 Next Steps:');
    console.log('  1. Start the API server: npm run dev:api');
    console.log('  2. Start the web app: npm run dev:web');
    console.log('  3. Login with test credentials:');
    console.log('     - Admin: admin / Admin123!');
    console.log('     - Sales: sarah.sales / Test123!');
    console.log('     - Dispatcher: david.dispatch / Test123!');
    console.log('     - Crew Lead: mike.crew / Test123!');
    console.log('');
    console.log('📝 Note: All test user passwords are: Test123!');
    console.log('');

    // Disconnect
    console.log('🔌 Disconnecting from MongoDB...');
    await mongoose.disconnect();
    console.log('✅ Disconnected from MongoDB');
    console.log('');

    process.exit(0);
  } catch (error) {
    console.error('');
    console.error('╔════════════════════════════════════════════════════════════════════╗');
    console.error('║                       Seeding Failed                               ║');
    console.error('╚════════════════════════════════════════════════════════════════════╝');
    console.error('');
    console.error('Error Details:');
    console.error(error);
    console.error('');

    // Cleanup
    if (mongoose.connection.readyState === 1) {
      await mongoose.disconnect();
    }

    process.exit(1);
  }
}

// Run the seeder
main();
