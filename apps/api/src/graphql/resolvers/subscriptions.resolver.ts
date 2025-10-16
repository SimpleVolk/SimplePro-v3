import { Resolver, Subscription, Args } from '@nestjs/graphql';
import { Inject } from '@nestjs/common';
import { PubSubEngine } from 'graphql-subscriptions';
import type { Job } from '../../jobs/interfaces/job.interface';

/**
 * GraphQL Subscriptions Resolver
 *
 * Provides real-time GraphQL subscriptions for:
 * - Job updates (any field changes)
 * - Job status changes (scheduled, in_progress, completed, etc.)
 * - Crew assignments (when crew is assigned to jobs)
 *
 * These subscriptions use PubSub to emit events that can be consumed
 * by GraphQL clients using WebSocket connections.
 *
 * Event Topics:
 * - JOB_UPDATED_{jobId} - Emitted when any job field is updated
 * - JOB_STATUS_CHANGED_{jobId} - Emitted when job status changes
 * - CREW_ASSIGNED_{crewMemberId} - Emitted when crew is assigned to job
 */
@Resolver()
export class SubscriptionsResolver {
  constructor(@Inject('PUB_SUB') private pubSub: PubSubEngine) {}

  /**
   * Subscribe to job updates for a specific job
   *
   * @param jobId - The ID of the job to subscribe to
   * @returns AsyncIterator that yields Job objects when updates occur
   *
   * Example subscription:
   * ```graphql
   * subscription {
   *   jobUpdated(jobId: "123") {
   *     id
   *     status
   *     title
   *     assignedCrew {
   *       crewMemberId
   *       status
   *     }
   *   }
   * }
   * ```
   */
  @Subscription('jobUpdated', {
    filter: (payload, variables) => {
      // Only send updates for the specific job being subscribed to
      return payload.jobUpdated.id === variables.jobId;
    },
  })
  jobUpdated(@Args('jobId') jobId: string) {
    return this.pubSub.asyncIterableIterator(`JOB_UPDATED_${jobId}`);
  }

  /**
   * Subscribe to job status changes for a specific job
   *
   * @param jobId - The ID of the job to subscribe to
   * @returns AsyncIterator that yields Job objects when status changes
   *
   * Example subscription:
   * ```graphql
   * subscription {
   *   jobStatusChanged(jobId: "123") {
   *     id
   *     status
   *     actualStartTime
   *     actualEndTime
   *   }
   * }
   * ```
   */
  @Subscription('jobStatusChanged', {
    filter: (payload, variables) => {
      // Only send status changes for the specific job being subscribed to
      return payload.jobStatusChanged.id === variables.jobId;
    },
  })
  jobStatusChanged(@Args('jobId') jobId: string) {
    return this.pubSub.asyncIterableIterator(`JOB_STATUS_CHANGED_${jobId}`);
  }

  /**
   * Subscribe to crew assignments for a specific crew member
   *
   * @param crewMemberId - The ID of the crew member to subscribe to
   * @returns AsyncIterator that yields Job objects when crew is assigned
   *
   * Example subscription:
   * ```graphql
   * subscription {
   *   crewAssigned(crewMemberId: "crew123") {
   *     id
   *     title
   *     scheduledDate
   *     assignedCrew {
   *       crewMemberId
   *       role
   *       status
   *     }
   *   }
   * }
   * ```
   */
  @Subscription('crewAssigned', {
    filter: (payload, variables) => {
      // Check if the crew member is in the assignedCrew array
      const job = payload.crewAssigned as Job;
      return job.assignedCrew?.some(
        (crew) => crew.crewMemberId === variables.crewMemberId
      ) ?? false;
    },
  })
  crewAssigned(@Args('crewMemberId') _crewMemberId: string) {
    // Parameter is needed for GraphQL schema definition but not used in function body
    // The filter function above receives the crewMemberId via variables.crewMemberId
    return this.pubSub.asyncIterableIterator('CREW_ASSIGNED');
  }
}
