import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectConnection } from '@nestjs/mongoose';
import { Connection } from 'mongoose';

export interface IndexInfo {
  name: string;
  usageCount: number;
  usageDate: Date | null;
  spec: Record<string, any>;
}

export interface IndexUsageResult {
  [collectionName: string]: IndexInfo[];
}

@Injectable()
export class IndexOptimizationService implements OnModuleInit {
  private readonly logger = new Logger(IndexOptimizationService.name);

  constructor(@InjectConnection() private connection: Connection) {}

  async onModuleInit() {
    // Create additional indexes after module initialization
    await this.createOptimizedIndexes();
  }

  private async createOptimizedIndexes(): Promise<void> {
    try {
      const db = this.connection.db;
      if (!db) {
        throw new Error('Database connection not available');
      }

      // User collection optimizations
      await this.createUserIndexes(db);

      // Job collection optimizations
      await this.createJobIndexes(db);

      // Customer collection optimizations
      await this.createCustomerIndexes(db);

      // Analytics collection optimizations
      await this.createAnalyticsIndexes(db);

      // Session collection optimizations
      await this.createSessionIndexes(db);

      this.logger.log('Database indexes optimized successfully');
    } catch (error) {
      this.logger.error('Failed to optimize database indexes:', error);
    }
  }

  private async createUserIndexes(db: any): Promise<void> {
    const users = db.collection('users');

    // Compound index for authentication queries
    await users.createIndex(
      { email: 1, isActive: 1 },
      { name: 'email_active_idx', background: true },
    );

    await users.createIndex(
      { username: 1, isActive: 1 },
      { name: 'username_active_idx', background: true },
    );

    // Index for role-based queries
    await users.createIndex(
      { 'role.name': 1, isActive: 1 },
      { name: 'role_active_idx', background: true },
    );

    // Index for department-based queries
    await users.createIndex(
      { department: 1, isActive: 1 },
      { name: 'department_active_idx', background: true, sparse: true },
    );

    // Partial index for crew members only
    await users.createIndex(
      { crewId: 1, isActive: 1 },
      {
        name: 'crew_active_idx',
        partialFilterExpression: { crewId: { $exists: true } },
        background: true,
      },
    );
  }

  private async createJobIndexes(db: any): Promise<void> {
    const jobs = db.collection('jobs');

    // Critical compound indexes for job management
    await jobs.createIndex(
      { customerId: 1, status: 1, scheduledDate: -1 },
      { name: 'customer_status_scheduled_idx', background: true },
    );

    await jobs.createIndex(
      { 'assignedCrew.crewMemberId': 1, status: 1, scheduledDate: -1 },
      { name: 'crew_status_scheduled_idx', background: true },
    );

    await jobs.createIndex(
      { leadCrew: 1, status: 1, scheduledDate: -1 },
      {
        name: 'lead_crew_status_scheduled_idx',
        background: true,
        sparse: true,
      },
    );

    // Performance indexes for calendar views
    await jobs.createIndex(
      { scheduledDate: 1, scheduledStartTime: 1 },
      { name: 'schedule_time_idx', background: true },
    );

    // Geographic indexes for location-based queries
    await jobs.createIndex(
      { 'pickupAddress.zipCode': 1, 'pickupAddress.state': 1 },
      { name: 'pickup_location_idx', background: true },
    );

    await jobs.createIndex(
      { 'deliveryAddress.zipCode': 1, 'deliveryAddress.state': 1 },
      { name: 'delivery_location_idx', background: true },
    );

    // Financial indexes
    await jobs.createIndex(
      { estimatedCost: -1, status: 1 },
      { name: 'cost_status_idx', background: true },
    );

    await jobs.createIndex(
      { actualCost: -1, status: 1 },
      { name: 'actual_cost_status_idx', background: true, sparse: true },
    );

    // Priority and type compound index
    await jobs.createIndex(
      { priority: 1, type: 1, status: 1 },
      { name: 'priority_type_status_idx', background: true },
    );

    // Audit trail indexes
    await jobs.createIndex(
      { createdBy: 1, createdAt: -1 },
      { name: 'created_audit_idx', background: true },
    );
  }

  private async createCustomerIndexes(db: any): Promise<void> {
    const customers = db.collection('customers');

    // Sales rep performance indexes
    await customers.createIndex(
      { assignedSalesRep: 1, status: 1, lastContactDate: -1 },
      { name: 'sales_rep_performance_idx', background: true, sparse: true },
    );

    // Lead scoring indexes
    await customers.createIndex(
      { leadScore: -1, status: 1 },
      { name: 'lead_score_status_idx', background: true, sparse: true },
    );

    // Geographic customer analysis
    await customers.createIndex(
      { 'address.state': 1, 'address.city': 1, type: 1 },
      { name: 'location_type_idx', background: true },
    );

    // Source attribution indexes
    await customers.createIndex(
      { source: 1, createdAt: -1, status: 1 },
      { name: 'source_attribution_idx', background: true },
    );

    // Budget-based indexes
    await customers.createIndex(
      { estimatedBudget: -1, status: 1 },
      { name: 'budget_status_idx', background: true, sparse: true },
    );

    // Referral tracking
    await customers.createIndex(
      { 'referredBy.customerId': 1 },
      { name: 'referral_customer_idx', background: true, sparse: true },
    );

    await customers.createIndex(
      { 'referredBy.partnerName': 1, 'referredBy.source': 1 },
      { name: 'referral_partner_idx', background: true, sparse: true },
    );
  }

  private async createAnalyticsIndexes(db: any): Promise<void> {
    const analytics = db.collection('analytics_events');

    // Time-series optimized indexes
    await analytics.createIndex(
      { timestamp: -1, category: 1, eventType: 1 },
      { name: 'timeseries_category_event_idx', background: true },
    );

    // User activity tracking
    await analytics.createIndex(
      { userId: 1, timestamp: -1, category: 1 },
      { name: 'user_activity_idx', background: true },
    );

    // Revenue analytics optimizations
    await analytics.createIndex(
      { category: 1, timestamp: -1, revenue: -1 },
      {
        name: 'revenue_analytics_idx',
        partialFilterExpression: { revenue: { $exists: true, $gt: 0 } },
        background: true,
      },
    );

    // Customer journey tracking
    await analytics.createIndex(
      { customerId: 1, timestamp: -1, eventType: 1 },
      { name: 'customer_journey_idx', background: true, sparse: true },
    );

    // Job lifecycle tracking
    await analytics.createIndex(
      { jobId: 1, timestamp: -1, eventType: 1 },
      { name: 'job_lifecycle_idx', background: true, sparse: true },
    );

    // Geographic performance analysis
    await analytics.createIndex(
      { 'location.state': 1, 'location.city': 1, timestamp: -1 },
      { name: 'geographic_performance_idx', background: true, sparse: true },
    );

    // Batch processing index
    await analytics.createIndex(
      { processed: 1, timestamp: 1 },
      { name: 'batch_processing_idx', background: true },
    );
  }

  private async createSessionIndexes(db: any): Promise<void> {
    const sessions = db.collection('sessions');

    // Active session lookups
    await sessions.createIndex(
      { userId: 1, isActive: 1, expiresAt: 1 },
      { name: 'active_session_lookup_idx', background: true },
    );

    // Refresh token lookups
    await sessions.createIndex(
      { refreshToken: 1, isActive: 1, expiresAt: 1 },
      { name: 'refresh_token_lookup_idx', background: true },
    );

    // Session cleanup (in addition to TTL index)
    await sessions.createIndex(
      { isActive: 1, lastAccessedAt: -1 },
      { name: 'session_cleanup_idx', background: true },
    );
  }

  // Index analysis and monitoring
  async analyzeIndexUsage(): Promise<IndexUsageResult> {
    const collections = [
      'users',
      'jobs',
      'customers',
      'analytics_events',
      'sessions',
    ];
    const results: IndexUsageResult = {};

    for (const collectionName of collections) {
      try {
        const db = this.connection.db;
        if (!db) {
          throw new Error('Database connection not available');
        }
        const collection = db.collection(collectionName);
        const indexStats = await collection
          .aggregate([{ $indexStats: {} }])
          .toArray();

        results[collectionName] = indexStats.map((stat: any) => ({
          name: stat.name,
          usageCount: stat.accesses?.ops || 0,
          usageDate: stat.accesses?.since || null,
          spec: stat.spec,
        }));
      } catch (error) {
        this.logger.error(
          `Failed to analyze indexes for ${collectionName}:`,
          error,
        );
        results[collectionName] = [];
      }
    }

    return results;
  }

  async getUnusedIndexes(): Promise<any> {
    const usage = await this.analyzeIndexUsage();
    const unused: any = {};

    for (const [collection, indexes] of Object.entries(usage)) {
      unused[collection] = (indexes as any[]).filter(
        (index: any) => index.usageCount === 0 && index.name !== '_id_',
      );
    }

    return unused;
  }

  async dropUnusedIndexes(dryRun = true): Promise<any> {
    const unused = await this.getUnusedIndexes();
    const results: any = {};

    for (const [collectionName, indexes] of Object.entries(unused)) {
      const db = this.connection.db;
      if (!db) {
        throw new Error('Database connection not available');
      }
      const collection = db.collection(collectionName);
      results[collectionName] = [];

      for (const index of indexes as any[]) {
        if (dryRun) {
          results[collectionName].push({
            action: 'would_drop',
            index: index.name,
          });
        } else {
          try {
            await collection.dropIndex(index.name);
            results[collectionName].push({
              action: 'dropped',
              index: index.name,
            });
            this.logger.log(
              `Dropped unused index ${index.name} from ${collectionName}`,
            );
          } catch (error) {
            const errorMessage =
              error instanceof Error ? error.message : String(error);
            results[collectionName].push({
              action: 'failed_to_drop',
              index: index.name,
              error: errorMessage,
            });
          }
        }
      }
    }

    return results;
  }
}
