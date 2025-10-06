import {
  Resolver,
  Query,
  Mutation,
  Args,
  ResolveField,
  Parent,
} from '@nestjs/graphql';
import { UseGuards, Request } from '@nestjs/common';
import { JobsService } from '../../jobs/jobs.service';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { CustomerDataLoader } from '../dataloaders/customer.dataloader';
import { EstimateDataLoader } from '../dataloaders/estimate.dataloader';
import { CrewDataLoader } from '../dataloaders/crew.dataloader';
import type {
  Job,
  CreateJobDto,
  UpdateJobDto,
  JobFilters,
  CrewAssignment,
} from '../../jobs/interfaces/job.interface';

@Resolver('Job')
@UseGuards(JwtAuthGuard)
export class JobsResolver {
  constructor(
    private readonly jobsService: JobsService,
    private readonly customerDataLoader: CustomerDataLoader,
    private readonly estimateDataLoader: EstimateDataLoader,
    private readonly crewDataLoader: CrewDataLoader,
  ) {}

  // Queries
  @Query('job')
  async getJob(@Args('id') id: string): Promise<Job | null> {
    return this.jobsService.findOne(id);
  }

  @Query('jobByNumber')
  async getJobByNumber(
    @Args('jobNumber') jobNumber: string,
  ): Promise<Job | null> {
    return this.jobsService.findByJobNumber(jobNumber);
  }

  @Query('jobs')
  async getJobs(
    @Args('filters') filters?: JobFilters,
    @Args('sortBy') sortBy?: { field: string; order: 'asc' | 'desc' },
    @Args('first') first?: number,
    @Args('after') after?: string,
  ): Promise<any> {
    // Fetch all jobs (use large limit for GraphQL compatibility)
    const result = await this.jobsService.findAll(filters, 0, 1000);
    const jobs = result.data;

    // Apply sorting if specified
    if (sortBy) {
      jobs.sort((a: any, b: any) => {
        const aVal = a[sortBy.field];
        const bVal = b[sortBy.field];
        const comparison = aVal > bVal ? 1 : aVal < bVal ? -1 : 0;
        return sortBy.order === 'asc' ? comparison : -comparison;
      });
    }

    // Implement cursor-based pagination
    const limit = first || 20;
    const startIndex = after
      ? jobs.findIndex((j: any) => j.id === after) + 1
      : 0;
    const paginatedJobs = jobs.slice(startIndex, startIndex + limit);

    const edges = paginatedJobs.map((job: Job) => ({
      node: job,
      cursor: job.id,
    }));

    return {
      edges,
      pageInfo: {
        hasNextPage: startIndex + limit < jobs.length,
        hasPreviousPage: startIndex > 0,
        startCursor: edges[0]?.cursor,
        endCursor: edges[edges.length - 1]?.cursor,
      },
      totalCount: jobs.length,
    };
  }

  @Query('jobsWithDetails')
  async getJobsWithDetails(
    @Args('filters') filters?: JobFilters,
    @Args('sortBy') sortBy?: { field: string; order: 'asc' | 'desc' },
  ): Promise<any[]> {
    // Fetch all jobs (use large limit for GraphQL compatibility)
    const result = await this.jobsService.findAll(filters, 0, 1000);
    const jobs = result.data;

    // Apply sorting
    if (sortBy) {
      jobs.sort((a: any, b: any) => {
        const aVal = a[sortBy.field];
        const bVal = b[sortBy.field];
        const comparison = aVal > bVal ? 1 : aVal < bVal ? -1 : 0;
        return sortBy.order === 'asc' ? comparison : -comparison;
      });
    }

    // The field resolvers will handle loading related data
    return jobs;
  }

  @Query('jobsByDate')
  async getJobsByDate(@Args('date') date: Date): Promise<Job[]> {
    return this.jobsService.getJobsByDate(date);
  }

  // Mutations
  @Mutation('createJob')
  async createJob(
    @Args('input') input: CreateJobDto,
    @Request() req: any,
  ): Promise<Job> {
    const userId = req.user?.userId || 'system';
    return this.jobsService.create(input, userId);
  }

  @Mutation('updateJob')
  async updateJob(
    @Args('id') id: string,
    @Args('input') input: UpdateJobDto,
    @Request() req: any,
  ): Promise<Job> {
    const userId = req.user?.userId || 'system';
    return this.jobsService.update(id, input, userId);
  }

  @Mutation('updateJobStatus')
  async updateJobStatus(
    @Args('id') id: string,
    @Args('status') status: Job['status'],
    @Request() req: any,
  ): Promise<Job> {
    const userId = req.user?.userId || 'system';
    return this.jobsService.updateStatus(id, status, userId);
  }

  @Mutation('deleteJob')
  async deleteJob(@Args('id') id: string): Promise<boolean> {
    await this.jobsService.remove(id);
    return true;
  }

  @Mutation('assignCrew')
  async assignCrew(
    @Args('jobId') jobId: string,
    @Args('crew') crew: Omit<CrewAssignment, 'assignedAt' | 'status'>[],
    @Request() req: any,
  ): Promise<Job> {
    const userId = req.user?.userId || 'system';
    return this.jobsService.assignCrew(jobId, crew, userId);
  }

  @Mutation('updateCrewStatus')
  async updateCrewStatus(
    @Args('jobId') jobId: string,
    @Args('crewMemberId') crewMemberId: string,
    @Args('status') status: CrewAssignment['status'],
    @Request() req: any,
  ): Promise<Job> {
    const userId = req.user?.userId || 'system';
    return this.jobsService.updateCrewStatus(
      jobId,
      crewMemberId,
      status,
      userId,
    );
  }

  @Mutation('addJobNote')
  async addJobNote(
    @Args('jobId') jobId: string,
    @Args('content') content: string,
    @Args('isPinned') _isPinned = false,
    @Request() req: any,
  ): Promise<Job> {
    const userId = req.user?.userId || 'system';
    return this.jobsService.addNote(jobId, { content } as any, userId);
  }

  @Mutation('updateMilestone')
  async updateMilestone(
    @Args('jobId') jobId: string,
    @Args('milestoneId') milestoneId: string,
    @Args('status') status: string,
    @Request() req: any,
  ): Promise<Job> {
    const userId = req.user?.userId || 'system';
    return this.jobsService.updateMilestone(
      jobId,
      milestoneId,
      status as any,
      userId,
    );
  }

  // Field Resolvers (use DataLoaders for N+1 optimization)
  @ResolveField('customer')
  async getCustomer(@Parent() job: Job) {
    if (!job.customerId) return null;
    return this.customerDataLoader.load(job.customerId);
  }

  @ResolveField('estimate')
  async getEstimate(@Parent() job: Job) {
    if (!job.estimateId) return null;
    return this.estimateDataLoader.load(job.estimateId);
  }

  @ResolveField('assignedCrew')
  async getAssignedCrewDetails(@Parent() job: Job) {
    if (!job.assignedCrew || job.assignedCrew.length === 0) return [];

    // Extract crew member IDs
    const crewMemberIds = job.assignedCrew.map((c) => c.crewMemberId);

    // Load crew members using DataLoader
    const crewMembers = await this.crewDataLoader.loadMany(crewMemberIds);

    // Merge crew assignment data with crew member details
    return job.assignedCrew.map((assignment, index) => ({
      ...assignment,
      crewMemberName: crewMembers[index]
        ? `${crewMembers[index].firstName} ${crewMembers[index].lastName}`
        : 'Unknown',
    }));
  }

  @ResolveField('leadCrew')
  async getLeadCrewDetails(@Parent() job: Job) {
    if (!job.leadCrew) return null;
    return this.crewDataLoader.load(job.leadCrew);
  }
}

@Resolver('JobWithDetails')
@UseGuards(JwtAuthGuard)
export class JobWithDetailsResolver {
  constructor(
    private readonly customerDataLoader: CustomerDataLoader,
    private readonly estimateDataLoader: EstimateDataLoader,
    private readonly crewDataLoader: CrewDataLoader,
  ) {}

  @ResolveField('customer')
  async getCustomer(@Parent() job: Job) {
    return this.customerDataLoader.load(job.customerId);
  }

  @ResolveField('estimate')
  async getEstimate(@Parent() job: Job) {
    if (!job.estimateId) return null;
    return this.estimateDataLoader.load(job.estimateId);
  }

  @ResolveField('assignedCrew')
  async getAssignedCrew(@Parent() job: Job) {
    if (!job.assignedCrew || job.assignedCrew.length === 0) return [];
    const crewMemberIds = job.assignedCrew.map((c) => c.crewMemberId);
    return this.crewDataLoader.loadMany(crewMemberIds);
  }

  @ResolveField('leadCrew')
  async getLeadCrew(@Parent() job: Job) {
    if (!job.leadCrew) return null;
    return this.crewDataLoader.load(job.leadCrew);
  }
}
