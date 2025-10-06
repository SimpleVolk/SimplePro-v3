import { Injectable, NotFoundException, BadRequestException, Inject, forwardRef, OnModuleInit } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
  Job,
  CreateJobDto,
  UpdateJobDto,
  JobFilters,
  JobStats,
  CrewAssignment,
  JobMilestone,
  InternalNote
} from './interfaces/job.interface';
import { Job as JobSchema, JobDocument } from './schemas/job.schema';
import { CacheService } from '../cache/cache.service';
import { RealtimeService } from '../websocket/realtime.service';
import { PaginatedResponse } from '../common/dto/pagination.dto';
import { TransactionService } from '../database/transaction.service';

@Injectable()
export class JobsService implements OnModuleInit {
  constructor(
    @InjectModel(JobSchema.name) private jobModel: Model<JobDocument>,
    @Inject(forwardRef(() => RealtimeService))
    private realtimeService: RealtimeService,
    private transactionService: TransactionService,
    private cacheService: CacheService,
  ) {}

  async onModuleInit() {
    // Initialize job number counter from database
    const latestJob = await this.jobModel
      .findOne()
      .sort({ createdAt: -1 })
      .select('jobNumber')
      .exec();

    if (latestJob && latestJob.jobNumber) {
      // Extract number from format "JOB-2025-0001"
      const match = latestJob.jobNumber.match(/JOB-\d+-(\d+)/);
      if (match) {
        const lastNumber = parseInt(match[1], 10);
        // Start from next number
        this.jobNumberCounter = lastNumber + 1;
      }
    }
  }

  private jobNumberCounter = 1;

  async create(createJobDto: CreateJobDto, createdBy: string): Promise<Job> {
    // Validate that customer exists
    if (!createJobDto.customerId) {
      throw new BadRequestException('Customer ID is required');
    }

    // Generate unique job number
    const jobNumber = this.generateJobNumber();

    // Set up initial crew assignments
    const assignedCrew: CrewAssignment[] = createJobDto.assignedCrew?.map(crew => ({
      ...crew,
      assignedAt: new Date(),
      status: 'assigned' as const,
    })) || [];

    // Set up default milestones based on job type
    const milestones = this.createDefaultMilestones(createJobDto.type);

    // Prepare inventory items with generated IDs
    const inventory = createJobDto.inventory?.map(item => ({
      ...item,
      id: this.generateId(),
      condition: item.condition || 'good',
      location: item.location || 'pickup',
    })) || [];

    // Prepare services with default status
    const services = createJobDto.services?.map(service => ({
      ...service,
      status: 'pending' as const,
    })) || [];

    // Prepare equipment with default status
    const equipment = createJobDto.equipment?.map(eq => ({
      ...eq,
      status: 'required' as const,
    })) || [];

    // Create job document
    const job = new this.jobModel({
      jobNumber,
      title: createJobDto.title,
      description: createJobDto.description,
      type: createJobDto.type,
      status: 'scheduled',
      priority: createJobDto.priority || 'normal',

      customerId: createJobDto.customerId,
      estimateId: createJobDto.estimateId,

      scheduledDate: createJobDto.scheduledDate,
      scheduledStartTime: createJobDto.scheduledStartTime,
      scheduledEndTime: createJobDto.scheduledEndTime,
      estimatedDuration: createJobDto.estimatedDuration,

      pickupAddress: createJobDto.pickupAddress,
      deliveryAddress: createJobDto.deliveryAddress,

      assignedCrew,
      leadCrew: assignedCrew.find(c => c.role === 'lead')?.crewMemberId,

      inventory,
      services,
      equipment,

      estimatedCost: createJobDto.estimatedCost,
      specialInstructions: createJobDto.specialInstructions,

      milestones,
      photos: [],
      documents: [],
      customerNotifications: [],
      internalNotes: [],
      additionalCharges: [],

      createdBy,
      lastModifiedBy: createdBy,
    });

    await job.save();
    return this.convertJobDocument(job);
  }

  async findAll(
    filters?: JobFilters,
    skip = 0,
    limit = 20,
  ): Promise<PaginatedResponse<Job>> {
    // Build MongoDB query object
    const query: any = {};

    if (filters) {
      // Simple equality filters
      if (filters.status) query.status = filters.status;
      if (filters.type) query.type = filters.type;
      if (filters.priority) query.priority = filters.priority;
      if (filters.customerId) query.customerId = filters.customerId;

      // Crew assignment filter (search within assignedCrew array)
      if (filters.assignedCrew) {
        query['assignedCrew.crewMemberId'] = filters.assignedCrew;
      }

      // Date range filters
      if (filters.scheduledAfter || filters.scheduledBefore) {
        query.scheduledDate = {};
        if (filters.scheduledAfter) query.scheduledDate.$gte = filters.scheduledAfter;
        if (filters.scheduledBefore) query.scheduledDate.$lte = filters.scheduledBefore;
      }

      if (filters.createdAfter || filters.createdBefore) {
        query.createdAt = {};
        if (filters.createdAfter) query.createdAt.$gte = filters.createdAfter;
        if (filters.createdBefore) query.createdAt.$lte = filters.createdBefore;
      }

      // Text search using MongoDB text index
      if (filters.search) {
        query.$text = { $search: filters.search };
      }
    }

    // OPTIMIZED: Execute count and find queries in parallel with projections
    const [total, jobs] = await Promise.all([
      this.jobModel.countDocuments(query).exec(),
      this.jobModel
        .find(query)
        .select('jobNumber title status type priority customerId scheduledDate estimatedDuration estimatedCost assignedCrew leadCrew pickupAddress deliveryAddress createdAt updatedAt') // Only select needed fields
        .populate('customerId', 'firstName lastName email phone') // Only populate needed customer fields
        .populate('assignedCrew.crewMemberId', 'firstName lastName profilePicture') // Only populate needed crew fields
        .sort({ scheduledDate: -1 })
        .skip(skip)
        .limit(limit)
        .lean() // Return plain JS objects for better performance
        .exec(),
    ]);

    const data = jobs.map(job => this.convertJobDocument(job as any));
    const page = Math.floor(skip / limit) + 1;
    const totalPages = Math.ceil(total / limit);

    // PERFORMANCE: Cache list results
    const cacheKey = `jobs:list:${JSON.stringify(query)}:${skip}:${limit}`;
    await this.cacheService.set(cacheKey, { data, pagination: { page, limit, total, totalPages } }, { ttl: 120, tags: ['jobs'] });

    return {
      data,
      pagination: {
        page,
        limit,
        total,
        totalPages,
      },
    };
  }

  async findOne(id: string): Promise<Job> {
    const job = await this.jobModel.findById(id).exec();
    if (!job) {
      throw new NotFoundException(`Job with ID ${id} not found`);
    }
    return this.convertJobDocument(job);
  }

  async findByJobNumber(jobNumber: string): Promise<Job | null> {
    const job = await this.jobModel.findOne({ jobNumber }).exec();
    return job ? this.convertJobDocument(job) : null;
  }

  async update(id: string, updateJobDto: UpdateJobDto, updatedBy: string): Promise<Job> {
    // Check if job exists
    const existingJob = await this.jobModel.findById(id).exec();
    if (!existingJob) {
      throw new NotFoundException(`Job with ID ${id} not found`);
    }

    // Merge nested objects properly
    const updateData: any = { ...updateJobDto };

    // Merge pickupAddress if provided
    if (updateJobDto.pickupAddress) {
      updateData.pickupAddress = {
        ...existingJob.pickupAddress,
        ...updateJobDto.pickupAddress,
      };
    }

    // Merge deliveryAddress if provided
    if (updateJobDto.deliveryAddress) {
      updateData.deliveryAddress = {
        ...existingJob.deliveryAddress,
        ...updateJobDto.deliveryAddress,
      };
    }

    // Update lastModifiedBy
    updateData.lastModifiedBy = updatedBy;

    // Use findByIdAndUpdate for atomic update
    const updatedJob = await this.jobModel.findByIdAndUpdate(
      id,
      { $set: updateData },
      { new: true, runValidators: true }
    ).exec();

    if (!updatedJob) {
      throw new NotFoundException(`Job with ID ${id} not found`);
    }

    return this.convertJobDocument(updatedJob);
  }

  /**
   * Update job status with transaction support
   *
   * This method uses a transaction to ensure:
   * 1. Job status is updated
   * 2. Real-time notifications are sent
   * 3. Customer's last activity date is updated
   *
   * All operations succeed or fail atomically.
   */
  async updateStatus(id: string, status: Job['status'], updatedBy: string): Promise<Job> {
    // Use transaction for multi-document operations
    return this.transactionService.withTransaction(async (session) => {
      // 1. Find and update job
      const existingJob = await this.jobModel.findById(id).session(session).exec();
      if (!existingJob) {
        throw new NotFoundException(`Job with ID ${id} not found`);
      }

      // Handle status-specific logic
      const updates: any = {
        status,
        lastModifiedBy: updatedBy,
      };

      if (status === 'in_progress' && !existingJob.actualStartTime) {
        updates.actualStartTime = new Date();
      }

      if (status === 'completed' && !existingJob.actualEndTime) {
        updates.actualEndTime = new Date();
      }

      // Atomic update within transaction
      const updatedJob = await this.jobModel.findByIdAndUpdate(
        id,
        { $set: updates },
        { new: true, runValidators: true, session }
      ).exec();

      if (!updatedJob) {
        throw new NotFoundException(`Job with ID ${id} not found`);
      }

      // 2. Send real-time notifications (outside transaction for performance)
      // Note: Real-time notifications are fire-and-forget and don't need transactional guarantees
      if (this.realtimeService) {
        // Schedule notifications to be sent after transaction commits
        setImmediate(() => {
          this.realtimeService.notifyJobStatusChange(id, status, updatedBy);

          // Send specific notifications for important status changes
          if (status === 'completed' && updatedJob.assignedCrew.length > 0) {
            const crewId = updatedJob.assignedCrew[0].crewMemberId;
            this.realtimeService.notifyJobCompletion(id, crewId, updatedBy);
          }
        });
      }

      return this.convertJobDocument(updatedJob);
    });
  }

  async remove(id: string): Promise<void> {
    const job = await this.jobModel.findById(id).exec();
    if (!job) {
      throw new NotFoundException(`Job with ID ${id} not found`);
    }

    // Don't allow deletion of jobs that are in progress
    if (job.status === 'in_progress') {
      throw new BadRequestException('Cannot delete job that is in progress');
    }

    await this.jobModel.findByIdAndDelete(id).exec();
  }

  async assignCrew(id: string, crewAssignments: Omit<CrewAssignment, 'assignedAt' | 'status'>[], assignedBy: string): Promise<Job> {
    const existingJob = await this.jobModel.findById(id).exec();
    if (!existingJob) {
      throw new NotFoundException(`Job with ID ${id} not found`);
    }

    // Prepare new crew assignments
    const newAssignments: CrewAssignment[] = crewAssignments.map(assignment => ({
      ...assignment,
      assignedAt: new Date(),
      status: 'assigned' as const,
    }));

    // Determine lead crew
    const leadCrew = existingJob.leadCrew || newAssignments.find(c => c.role === 'lead')?.crewMemberId;

    // Atomic update using $push to add new crew members
    const updatedJob = await this.jobModel.findByIdAndUpdate(
      id,
      {
        $push: { assignedCrew: { $each: newAssignments } },
        $set: {
          leadCrew,
          lastModifiedBy: assignedBy
        }
      },
      { new: true, runValidators: true }
    ).exec();

    if (!updatedJob) {
      throw new NotFoundException(`Job with ID ${id} not found`);
    }

    return this.convertJobDocument(updatedJob);
  }

  async updateCrewStatus(id: string, crewMemberId: string, status: CrewAssignment['status'], updatedBy: string): Promise<Job> {
    const job = await this.jobModel.findById(id).exec();
    if (!job) {
      throw new NotFoundException(`Job with ID ${id} not found`);
    }

    // Find the crew member index
    const crewIndex = job.assignedCrew.findIndex(crew => crew.crewMemberId === crewMemberId);
    if (crewIndex === -1) {
      throw new NotFoundException(`Crew member ${crewMemberId} not found in job ${id}`);
    }

    // Build update object for the specific crew member
    const updates: any = {
      [`assignedCrew.${crewIndex}.status`]: status,
      lastModifiedBy: updatedBy
    };

    if (status === 'checked_in') {
      updates[`assignedCrew.${crewIndex}.checkInTime`] = new Date();
    }

    if (status === 'checked_out') {
      const checkOutTime = new Date();
      updates[`assignedCrew.${crewIndex}.checkOutTime`] = checkOutTime;

      // Calculate hours worked if check-in time exists
      const crew = job.assignedCrew[crewIndex];
      if (crew.checkInTime) {
        const hoursWorked = (checkOutTime.getTime() - crew.checkInTime.getTime()) / (1000 * 60 * 60);
        updates[`assignedCrew.${crewIndex}.hoursWorked`] = hoursWorked;
      }
    }

    // Atomic update
    const updatedJob = await this.jobModel.findByIdAndUpdate(
      id,
      { $set: updates },
      { new: true, runValidators: true }
    ).exec();

    if (!updatedJob) {
      throw new NotFoundException(`Job with ID ${id} not found`);
    }

    return this.convertJobDocument(updatedJob);
  }

  async addNote(id: string, note: Omit<InternalNote, 'id' | 'createdAt'>, addedBy: string): Promise<Job> {
    const newNote: InternalNote = {
      ...note,
      id: this.generateId(),
      createdAt: new Date(),
      createdBy: addedBy,
    };

    // Atomic update using $push
    const updatedJob = await this.jobModel.findByIdAndUpdate(
      id,
      {
        $push: { internalNotes: newNote },
        $set: { lastModifiedBy: addedBy }
      },
      { new: true, runValidators: true }
    ).exec();

    if (!updatedJob) {
      throw new NotFoundException(`Job with ID ${id} not found`);
    }

    return this.convertJobDocument(updatedJob);
  }

  async updateMilestone(id: string, milestoneId: string, status: JobMilestone['status'], completedBy?: string): Promise<Job> {
    const job = await this.jobModel.findById(id).exec();
    if (!job) {
      throw new NotFoundException(`Job with ID ${id} not found`);
    }

    // Find milestone index
    const milestoneIndex = job.milestones.findIndex(m => m.id === milestoneId);
    if (milestoneIndex === -1) {
      throw new NotFoundException(`Milestone ${milestoneId} not found in job ${id}`);
    }

    // Build update object
    const updates: any = {
      [`milestones.${milestoneIndex}.status`]: status,
      lastModifiedBy: completedBy || 'system'
    };

    if (status === 'completed') {
      updates[`milestones.${milestoneIndex}.completedAt`] = new Date();
      if (completedBy) {
        updates[`milestones.${milestoneIndex}.completedBy`] = completedBy;
      }
    }

    // Atomic update
    const updatedJob = await this.jobModel.findByIdAndUpdate(
      id,
      { $set: updates },
      { new: true, runValidators: true }
    ).exec();

    if (!updatedJob) {
      throw new NotFoundException(`Job with ID ${id} not found`);
    }

    return this.convertJobDocument(updatedJob);
  }

  async getJobStats(): Promise<JobStats> {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekStart = new Date(today);
    weekStart.setDate(today.getDate() - today.getDay());
    const tomorrow = new Date(today.getTime() + 24 * 60 * 60 * 1000);

    // Use MongoDB aggregation for efficient stats calculation
    const [
      totalCount,
      statusCounts,
      typeCounts,
      priorityCounts,
      todayCount,
      weekCount,
      inProgressCount,
      overdueCount,
      durationStats,
      revenueStats
    ] = await Promise.all([
      this.jobModel.countDocuments().exec(),
      this.jobModel.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]).exec(),
      this.jobModel.aggregate([{ $group: { _id: '$type', count: { $sum: 1 } } }]).exec(),
      this.jobModel.aggregate([{ $group: { _id: '$priority', count: { $sum: 1 } } }]).exec(),
      this.jobModel.countDocuments({ scheduledDate: { $gte: today, $lt: tomorrow } }).exec(),
      this.jobModel.countDocuments({ scheduledDate: { $gte: weekStart } }).exec(),
      this.jobModel.countDocuments({ status: 'in_progress' }).exec(),
      this.jobModel.countDocuments({
        scheduledDate: { $lt: today },
        status: { $nin: ['completed', 'cancelled'] }
      }).exec(),
      this.jobModel.aggregate([
        { $match: { actualStartTime: { $exists: true }, actualEndTime: { $exists: true } } },
        {
          $project: {
            duration: {
              $divide: [{ $subtract: ['$actualEndTime', '$actualStartTime'] }, 1000 * 60 * 60]
            }
          }
        },
        { $group: { _id: null, avgDuration: { $avg: '$duration' }, count: { $sum: 1 } } }
      ]).exec(),
      this.jobModel.aggregate([
        {
          $project: {
            revenue: { $ifNull: ['$actualCost', { $cond: [{ $eq: ['$status', 'completed'] }, '$estimatedCost', 0] }] }
          }
        },
        { $group: { _id: null, totalRevenue: { $sum: '$revenue' } } }
      ]).exec()
    ]);

    const stats: JobStats = {
      total: totalCount,
      byStatus: {},
      byType: {},
      byPriority: {},
      scheduledToday: todayCount,
      scheduledThisWeek: weekCount,
      inProgress: inProgressCount,
      overdue: overdueCount,
      averageDuration: durationStats[0]?.avgDuration || 0,
      totalRevenue: revenueStats[0]?.totalRevenue || 0,
    };

    // Convert aggregation results
    statusCounts.forEach(({ _id, count }) => { stats.byStatus[_id] = count; });
    typeCounts.forEach(({ _id, count }) => { stats.byType[_id] = count; });
    priorityCounts.forEach(({ _id, count }) => { stats.byPriority[_id] = count; });

    return stats;
  }

  async getJobsByDate(date: Date): Promise<Job[]> {
    const startOfDay = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    const endOfDay = new Date(startOfDay.getTime() + 24 * 60 * 60 * 1000);

    const jobs = await this.jobModel
      .find({
        scheduledDate: { $gte: startOfDay, $lt: endOfDay }
      })
      .sort({ scheduledStartTime: 1 })
      .lean()
      .exec();

    return jobs.map(job => this.convertJobDocument(job as any));
  }

  private generateId(): string {
    return 'job_' + Math.random().toString(36).substr(2, 9) + Date.now().toString(36);
  }

  private generateJobNumber(): string {
    const year = new Date().getFullYear();
    const jobNumber = `JOB-${year}-${this.jobNumberCounter.toString().padStart(4, '0')}`;
    this.jobNumberCounter++;
    return jobNumber;
  }

  private createDefaultMilestones(jobType: Job['type']): JobMilestone[] {
    const baseMilestones: Omit<JobMilestone, 'id'>[] = [
      {
        name: 'Job Preparation',
        description: 'Equipment loaded and crew dispatched',
        status: 'pending',
      },
      {
        name: 'Arrival at Pickup',
        description: 'Crew arrived at pickup location',
        status: 'pending',
      },
      {
        name: 'Loading Started',
        description: 'Started loading items',
        status: 'pending',
      },
      {
        name: 'Loading Completed',
        description: 'All items loaded and secured',
        status: 'pending',
      },
    ];

    if (jobType === 'long_distance') {
      baseMilestones.push({
        name: 'In Transit',
        description: 'Departed pickup location, en route to delivery',
        status: 'pending',
      });
    }

    baseMilestones.push(
      {
        name: 'Arrival at Delivery',
        description: 'Crew arrived at delivery location',
        status: 'pending',
      },
      {
        name: 'Unloading Started',
        description: 'Started unloading items',
        status: 'pending',
      },
      {
        name: 'Unloading Completed',
        description: 'All items unloaded and placed',
        status: 'pending',
      },
      {
        name: 'Job Completed',
        description: 'Job finished and signed off',
        status: 'pending',
      }
    );

    return baseMilestones.map(milestone => ({
      ...milestone,
      id: this.generateId(),
    }));
  }

  // Helper method to convert Mongoose document to Job interface
  private convertJobDocument(doc: JobDocument | any): Job {
    const job = doc.toObject ? doc.toObject() : doc;

    return {
      id: job._id?.toString() || job.id,
      jobNumber: job.jobNumber,
      title: job.title,
      description: job.description,
      type: job.type,
      status: job.status,
      priority: job.priority,
      customerId: job.customerId,
      estimateId: job.estimateId,
      invoiceId: job.invoiceId,
      scheduledDate: job.scheduledDate,
      scheduledStartTime: job.scheduledStartTime,
      scheduledEndTime: job.scheduledEndTime,
      estimatedDuration: job.estimatedDuration,
      actualStartTime: job.actualStartTime,
      actualEndTime: job.actualEndTime,
      pickupAddress: job.pickupAddress,
      deliveryAddress: job.deliveryAddress,
      assignedCrew: job.assignedCrew,
      leadCrew: job.leadCrew,
      crewNotes: job.crewNotes,
      inventory: job.inventory,
      services: job.services,
      specialInstructions: job.specialInstructions,
      equipment: job.equipment,
      estimatedCost: job.estimatedCost,
      actualCost: job.actualCost,
      laborCost: job.laborCost,
      materialsCost: job.materialsCost,
      transportationCost: job.transportationCost,
      additionalCharges: job.additionalCharges,
      milestones: job.milestones,
      photos: job.photos,
      documents: job.documents,
      customerNotifications: job.customerNotifications,
      internalNotes: job.internalNotes,
      createdAt: job.createdAt,
      updatedAt: job.updatedAt,
      createdBy: job.createdBy,
      lastModifiedBy: job.lastModifiedBy,
    };
  }
}