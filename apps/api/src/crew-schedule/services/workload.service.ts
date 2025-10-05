import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
  CrewWorkload,
  CrewWorkloadDocument,
} from '../schemas/crew-workload.schema';
import { startOfWeek, addWeeks } from 'date-fns';

export interface WorkloadDistribution {
  weekStartDate: Date;
  crewWorkloads: Array<{
    crewMemberId: string;
    crewMemberName: string;
    totalJobs: number;
    hoursWorked: number;
    utilizationRate: number;
    isOverloaded: boolean;
  }>;
}

export interface BalancingResult {
  totalCrewMembers: number;
  totalJobs: number;
  averageJobsPerCrew: number;
  overloadedCrew: number;
  underutilizedCrew: number;
  recommendations: Array<{
    crewMemberId: string;
    currentJobs: number;
    recommendedAction: string;
  }>;
}

@Injectable()
export class WorkloadService {
  constructor(
    @InjectModel(CrewWorkload.name)
    private crewWorkloadModel: Model<CrewWorkloadDocument>,
  ) {}

  async calculateWorkload(
    crewId: string,
    weekStartDate: Date,
  ): Promise<CrewWorkload> {
    const weekStart = startOfWeek(weekStartDate, { weekStartsOn: 1 });

    // This will be populated once we integrate with JobsModule
    // For now, create/update with default values
    const existingWorkload = await this.crewWorkloadModel.findOne({
      crewMemberId: crewId,
      weekStartDate: weekStart,
    });

    if (existingWorkload) {
      existingWorkload.lastUpdated = new Date();
      return existingWorkload.save();
    }

    const workload = new this.crewWorkloadModel({
      crewMemberId: crewId,
      weekStartDate: weekStart,
      totalJobs: 0,
      scheduledJobs: 0,
      inProgressJobs: 0,
      completedJobs: 0,
      hoursWorked: 0,
      utilizationRate: 0,
      isOverloaded: false,
      lastUpdated: new Date(),
    });

    return workload.save();
  }

  async updateWorkloadMetrics(crewId: string): Promise<void> {
    const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 });
    await this.calculateWorkload(crewId, weekStart);
  }

  async getWorkloadDistribution(
    startDate: Date,
    endDate: Date,
  ): Promise<WorkloadDistribution[]> {
    const weekStart = startOfWeek(startDate, { weekStartsOn: 1 });
    const weekEnd = startOfWeek(endDate, { weekStartsOn: 1 });

    const distributions: WorkloadDistribution[] = [];
    let currentWeek = weekStart;

    while (currentWeek <= weekEnd) {
      const workloads = await this.crewWorkloadModel
        .find({ weekStartDate: currentWeek })
        .populate('crewMemberId', 'name email')
        .lean()
        .exec();

      const crewWorkloads = workloads.map((w) => ({
        crewMemberId: w.crewMemberId.toString(),
        crewMemberName: (w as any).crewMemberId.name || 'Unknown',
        totalJobs: w.totalJobs,
        hoursWorked: w.hoursWorked,
        utilizationRate: w.utilizationRate,
        isOverloaded: w.isOverloaded,
      }));

      distributions.push({
        weekStartDate: currentWeek,
        crewWorkloads,
      });

      currentWeek = addWeeks(currentWeek, 1);
    }

    return distributions;
  }

  async getOverloadedCrew(weekStartDate: Date): Promise<any[]> {
    const weekStart = startOfWeek(weekStartDate, { weekStartsOn: 1 });

    const overloaded = await this.crewWorkloadModel
      .find({
        weekStartDate: weekStart,
        isOverloaded: true,
      })
      .populate('crewMemberId', 'name email phone')
      .lean()
      .exec();

    return overloaded.map((w) => ({
      ...(w as any).crewMemberId,
      workload: {
        totalJobs: w.totalJobs,
        scheduledJobs: w.scheduledJobs,
        hoursWorked: w.hoursWorked,
        utilizationRate: w.utilizationRate,
      },
    }));
  }

  async balanceWorkload(jobDate: Date): Promise<BalancingResult> {
    const weekStart = startOfWeek(jobDate, { weekStartsOn: 1 });

    const workloads = await this.crewWorkloadModel
      .find({ weekStartDate: weekStart })
      .populate('crewMemberId', 'name')
      .lean()
      .exec();

    if (workloads.length === 0) {
      return {
        totalCrewMembers: 0,
        totalJobs: 0,
        averageJobsPerCrew: 0,
        overloadedCrew: 0,
        underutilizedCrew: 0,
        recommendations: [],
      };
    }

    const totalJobs = workloads.reduce((sum, w) => sum + w.totalJobs, 0);
    const averageJobsPerCrew = totalJobs / workloads.length;
    const overloadedCrew = workloads.filter((w) => w.isOverloaded).length;
    const underutilizedCrew = workloads.filter(
      (w) => w.totalJobs < averageJobsPerCrew * 0.7,
    ).length;

    const recommendations = workloads.map((w) => {
      let recommendedAction = 'Normal workload';
      if (w.isOverloaded) {
        recommendedAction = 'Reduce workload - consider reassigning jobs';
      } else if (w.totalJobs < averageJobsPerCrew * 0.7) {
        recommendedAction = 'Underutilized - can take more jobs';
      }

      return {
        crewMemberId: w.crewMemberId.toString(),
        currentJobs: w.totalJobs,
        recommendedAction,
      };
    });

    return {
      totalCrewMembers: workloads.length,
      totalJobs,
      averageJobsPerCrew: Math.round(averageJobsPerCrew * 10) / 10,
      overloadedCrew,
      underutilizedCrew,
      recommendations,
    };
  }

  async getCrewWorkload(
    crewId: string,
    weekDate: Date,
  ): Promise<CrewWorkload | null> {
    const weekStart = startOfWeek(weekDate, { weekStartsOn: 1 });
    return this.crewWorkloadModel
      .findOne({
        crewMemberId: crewId,
        weekStartDate: weekStart,
      })
      .lean()
      .exec();
  }
}
