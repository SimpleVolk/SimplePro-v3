import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { PubSub, PubSubEngine } from 'graphql-subscriptions';
import { RedisPubSub } from 'graphql-redis-subscriptions';
import Redis from 'ioredis';
import type { Job } from '../jobs/interfaces/job.interface';

/**
 * PubSub Service for GraphQL Subscriptions
 *
 * Provides a centralized service for publishing GraphQL subscription events.
 * Uses Redis PubSub in production for horizontal scalability, falls back to
 * in-memory PubSub for development.
 *
 * This service acts as a bridge between the business logic (services)
 * and GraphQL subscriptions (resolvers).
 */
@Injectable()
export class PubSubService implements OnModuleDestroy {
  private pubsub: PubSubEngine;
  private redisPublisher?: Redis;
  private redisSubscriber?: Redis;

  constructor() {
    // Use Redis PubSub in production, in-memory PubSub in development
    if (process.env.NODE_ENV === 'production' && process.env.REDIS_URL) {
      const redisOptions = {
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT || '6379', 10),
        retryStrategy: (times: number) => {
          // Exponential backoff: 50ms, 100ms, 200ms, ... up to 3 seconds
          const delay = Math.min(times * 50, 3000);
          return delay;
        },
      };

      this.redisPublisher = new Redis(redisOptions);
      this.redisSubscriber = new Redis(redisOptions);

      this.pubsub = new RedisPubSub({
        publisher: this.redisPublisher,
        subscriber: this.redisSubscriber,
      });

      console.log('✅ GraphQL subscriptions using Redis PubSub');
    } else {
      this.pubsub = new PubSub();
      console.log('⚠️ GraphQL subscriptions using in-memory PubSub (development only)');
    }
  }

  /**
   * Get the underlying PubSub instance
   * Used by GraphQL resolvers to create asyncIterators
   */
  getPubSub(): PubSubEngine {
    return this.pubsub;
  }

  /**
   * Publish a job update event
   * Triggers jobUpdated subscription for specific job
   *
   * @param job - The updated job object
   */
  async publishJobUpdated(job: Job): Promise<void> {
    await this.pubsub.publish(`JOB_UPDATED_${job.id}`, {
      jobUpdated: job,
    });
  }

  /**
   * Publish a job status change event
   * Triggers jobStatusChanged subscription for specific job
   *
   * @param job - The job with updated status
   */
  async publishJobStatusChanged(job: Job): Promise<void> {
    await this.pubsub.publish(`JOB_STATUS_CHANGED_${job.id}`, {
      jobStatusChanged: job,
    });
  }

  /**
   * Publish a crew assignment event
   * Triggers crewAssigned subscription for all assigned crew members
   *
   * @param job - The job with newly assigned crew
   */
  async publishCrewAssigned(job: Job): Promise<void> {
    await this.pubsub.publish('CREW_ASSIGNED', {
      crewAssigned: job,
    });
  }

  /**
   * Generic publish method for custom events
   *
   * @param triggerName - The event name/topic
   * @param payload - The event payload
   */
  async publish(triggerName: string, payload: any): Promise<void> {
    await this.pubsub.publish(triggerName, payload);
  }

  /**
   * Cleanup Redis connections on module destroy
   */
  async onModuleDestroy() {
    if (this.redisPublisher) {
      await this.redisPublisher.quit();
    }
    if (this.redisSubscriber) {
      await this.redisSubscriber.quit();
    }
  }
}
