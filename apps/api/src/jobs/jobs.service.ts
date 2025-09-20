import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
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

@Injectable()
export class JobsService {
  private jobs = new Map<string, Job>();
  private jobNumberCounter = 1;

  async create(createJobDto: CreateJobDto, createdBy: string): Promise<Job> {
    // Validate that customer exists (in a real app, this would be a DB query)
    if (!createJobDto.customerId) {
      throw new BadRequestException('Customer ID is required');
    }

    // Generate unique job number
    const jobNumber = this.generateJobNumber();

    // Generate unique ID
    const id = this.generateId();

    // Set up initial crew assignments
    const assignedCrew: CrewAssignment[] = createJobDto.assignedCrew?.map(crew => ({
      ...crew,
      assignedAt: new Date(),
      status: 'assigned' as const,
    })) || [];

    // Set up default milestones based on job type
    const milestones = this.createDefaultMilestones(createJobDto.type);

    const job: Job = {
      id,
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

      inventory: createJobDto.inventory?.map(item => ({
        ...item,
        id: this.generateId(),
        condition: item.condition || 'good',
        location: item.location || 'pickup',
      })) || [],

      services: createJobDto.services?.map(service => ({
        ...service,
        status: 'pending',
      })) || [],

      equipment: createJobDto.equipment?.map(eq => ({
        ...eq,
        status: 'required',
      })) || [],

      estimatedCost: createJobDto.estimatedCost,
      specialInstructions: createJobDto.specialInstructions,

      milestones,
      photos: [],
      documents: [],
      customerNotifications: [],
      internalNotes: [],
      additionalCharges: [],

      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy,
      lastModifiedBy: createdBy,
    };

    this.jobs.set(id, job);
    return job;
  }

  async findAll(filters?: JobFilters): Promise<Job[]> {
    let jobs = Array.from(this.jobs.values());

    if (filters) {
      if (filters.status) {
        jobs = jobs.filter(job => job.status === filters.status);
      }
      if (filters.type) {
        jobs = jobs.filter(job => job.type === filters.type);
      }
      if (filters.priority) {
        jobs = jobs.filter(job => job.priority === filters.priority);
      }
      if (filters.customerId) {
        jobs = jobs.filter(job => job.customerId === filters.customerId);
      }
      if (filters.assignedCrew) {
        jobs = jobs.filter(job =>
          job.assignedCrew.some(crew => crew.crewMemberId === filters.assignedCrew)
        );
      }
      if (filters.scheduledAfter) {
        jobs = jobs.filter(job => job.scheduledDate >= filters.scheduledAfter!);
      }
      if (filters.scheduledBefore) {
        jobs = jobs.filter(job => job.scheduledDate <= filters.scheduledBefore!);
      }
      if (filters.createdAfter) {
        jobs = jobs.filter(job => job.createdAt >= filters.createdAfter!);
      }
      if (filters.createdBefore) {
        jobs = jobs.filter(job => job.createdAt <= filters.createdBefore!);
      }
      if (filters.search) {
        const searchLower = filters.search.toLowerCase();
        jobs = jobs.filter(job =>
          job.title.toLowerCase().includes(searchLower) ||
          job.description?.toLowerCase().includes(searchLower) ||
          job.jobNumber.toLowerCase().includes(searchLower)
        );
      }
    }

    // Sort by scheduled date (most recent first)
    return jobs.sort((a, b) => b.scheduledDate.getTime() - a.scheduledDate.getTime());
  }

  async findOne(id: string): Promise<Job> {
    const job = this.jobs.get(id);
    if (!job) {
      throw new NotFoundException(`Job with ID ${id} not found`);
    }
    return job;
  }

  async findByJobNumber(jobNumber: string): Promise<Job | null> {
    const job = Array.from(this.jobs.values())
      .find(job => job.jobNumber === jobNumber);
    return job || null;
  }

  async update(id: string, updateJobDto: UpdateJobDto, updatedBy: string): Promise<Job> {
    const job = await this.findOne(id);

    const updatedJob: Job = {
      ...job,
      ...updateJobDto,
      // Ensure address fields are properly merged
      pickupAddress: updateJobDto.pickupAddress
        ? { ...job.pickupAddress, ...updateJobDto.pickupAddress }
        : job.pickupAddress,
      deliveryAddress: updateJobDto.deliveryAddress
        ? { ...job.deliveryAddress, ...updateJobDto.deliveryAddress }
        : job.deliveryAddress,
      updatedAt: new Date(),
      lastModifiedBy: updatedBy,
    };

    this.jobs.set(id, updatedJob);
    return updatedJob;
  }

  async updateStatus(id: string, status: Job['status'], updatedBy: string): Promise<Job> {
    const job = await this.findOne(id);

    // Handle status-specific logic
    const updates: Partial<Job> = {
      status,
      lastModifiedBy: updatedBy,
      updatedAt: new Date(),
    };

    if (status === 'in_progress' && !job.actualStartTime) {
      updates.actualStartTime = new Date();
    }

    if (status === 'completed' && !job.actualEndTime) {
      updates.actualEndTime = new Date();
    }

    const updatedJob: Job = { ...job, ...updates };
    this.jobs.set(id, updatedJob);
    return updatedJob;
  }

  async remove(id: string): Promise<void> {
    const job = await this.findOne(id);

    // Don't allow deletion of jobs that are in progress
    if (job.status === 'in_progress') {
      throw new BadRequestException('Cannot delete job that is in progress');
    }

    this.jobs.delete(id);
  }

  async assignCrew(id: string, crewAssignments: Omit<CrewAssignment, 'assignedAt' | 'status'>[], assignedBy: string): Promise<Job> {
    const job = await this.findOne(id);

    const newAssignments: CrewAssignment[] = crewAssignments.map(assignment => ({
      ...assignment,
      assignedAt: new Date(),
      status: 'assigned',
    }));

    const updatedJob: Job = {
      ...job,
      assignedCrew: [...job.assignedCrew, ...newAssignments],
      leadCrew: job.leadCrew || newAssignments.find(c => c.role === 'lead')?.crewMemberId,
      updatedAt: new Date(),
      lastModifiedBy: assignedBy,
    };

    this.jobs.set(id, updatedJob);
    return updatedJob;
  }

  async updateCrewStatus(id: string, crewMemberId: string, status: CrewAssignment['status'], updatedBy: string): Promise<Job> {
    const job = await this.findOne(id);

    const updatedCrew = job.assignedCrew.map(crew => {
      if (crew.crewMemberId === crewMemberId) {
        const updates: Partial<CrewAssignment> = { status };

        if (status === 'checked_in') {
          updates.checkInTime = new Date();
        }
        if (status === 'checked_out') {
          updates.checkOutTime = new Date();
          if (crew.checkInTime) {
            updates.hoursWorked = (new Date().getTime() - crew.checkInTime.getTime()) / (1000 * 60 * 60);
          }
        }

        return { ...crew, ...updates };
      }
      return crew;
    });

    const updatedJob: Job = {
      ...job,
      assignedCrew: updatedCrew,
      updatedAt: new Date(),
      lastModifiedBy: updatedBy,
    };

    this.jobs.set(id, updatedJob);
    return updatedJob;
  }

  async addNote(id: string, note: Omit<InternalNote, 'id' | 'createdAt'>, addedBy: string): Promise<Job> {
    const job = await this.findOne(id);

    const newNote: InternalNote = {
      ...note,
      id: this.generateId(),
      createdAt: new Date(),
      createdBy: addedBy,
    };

    const updatedJob: Job = {
      ...job,
      internalNotes: [...job.internalNotes, newNote],
      updatedAt: new Date(),
      lastModifiedBy: addedBy,
    };

    this.jobs.set(id, updatedJob);
    return updatedJob;
  }

  async updateMilestone(id: string, milestoneId: string, status: JobMilestone['status'], completedBy?: string): Promise<Job> {
    const job = await this.findOne(id);

    const updatedMilestones = job.milestones.map(milestone => {
      if (milestone.id === milestoneId) {
        const updates: Partial<JobMilestone> = { status };
        if (status === 'completed') {
          updates.completedAt = new Date();
          updates.completedBy = completedBy;
        }
        return { ...milestone, ...updates };
      }
      return milestone;
    });

    const updatedJob: Job = {
      ...job,
      milestones: updatedMilestones,
      updatedAt: new Date(),
      lastModifiedBy: completedBy || 'system',
    };

    this.jobs.set(id, updatedJob);
    return updatedJob;
  }

  async getJobStats(): Promise<JobStats> {
    const jobs = Array.from(this.jobs.values());
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekStart = new Date(today);
    weekStart.setDate(today.getDate() - today.getDay());

    const stats: JobStats = {
      total: jobs.length,
      byStatus: {},
      byType: {},
      byPriority: {},
      scheduledToday: 0,
      scheduledThisWeek: 0,
      inProgress: 0,
      overdue: 0,
      averageDuration: 0,
      totalRevenue: 0,
    };

    let totalDuration = 0;
    let completedJobs = 0;

    for (const job of jobs) {
      // Count by status
      stats.byStatus[job.status] = (stats.byStatus[job.status] || 0) + 1;

      // Count by type
      stats.byType[job.type] = (stats.byType[job.type] || 0) + 1;

      // Count by priority
      stats.byPriority[job.priority] = (stats.byPriority[job.priority] || 0) + 1;

      // Scheduled today
      if (job.scheduledDate >= today && job.scheduledDate < new Date(today.getTime() + 24 * 60 * 60 * 1000)) {
        stats.scheduledToday++;
      }

      // Scheduled this week
      if (job.scheduledDate >= weekStart) {
        stats.scheduledThisWeek++;
      }

      // In progress
      if (job.status === 'in_progress') {
        stats.inProgress++;
      }

      // Overdue (scheduled before today but not completed)
      if (job.scheduledDate < today && job.status !== 'completed' && job.status !== 'cancelled') {
        stats.overdue++;
      }

      // Revenue calculation
      if (job.actualCost) {
        stats.totalRevenue += job.actualCost;
      } else if (job.status === 'completed') {
        stats.totalRevenue += job.estimatedCost;
      }

      // Duration calculation
      if (job.actualStartTime && job.actualEndTime) {
        totalDuration += (job.actualEndTime.getTime() - job.actualStartTime.getTime()) / (1000 * 60 * 60);
        completedJobs++;
      }
    }

    stats.averageDuration = completedJobs > 0 ? totalDuration / completedJobs : 0;

    return stats;
  }

  async getJobsByDate(date: Date): Promise<Job[]> {
    const startOfDay = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    const endOfDay = new Date(startOfDay.getTime() + 24 * 60 * 60 * 1000);

    return Array.from(this.jobs.values())
      .filter(job => job.scheduledDate >= startOfDay && job.scheduledDate < endOfDay)
      .sort((a, b) => a.scheduledStartTime.localeCompare(b.scheduledStartTime));
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
}