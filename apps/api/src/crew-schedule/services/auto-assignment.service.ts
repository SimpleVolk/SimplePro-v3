import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
  CrewAssignment,
  CrewAssignmentDocument,
} from '../schemas/crew-assignment.schema';
import { AutoAssignDto } from '../dto';
import { WorkloadService } from './workload.service';
import { TimeOffService } from './time-off.service';
import { parseISO, startOfDay } from 'date-fns';

export interface JobRequirements {
  requiredSkills: string[];
  crewSize: number;
  jobDate: Date;
  estimatedDuration: number;
  preferredCrewLeadId?: string;
  excludeCrewIds?: string[];
}

export interface CrewSuggestion {
  crewMemberId: string;
  crewMemberName: string;
  score: number;
  scoreBreakdown: {
    skillsMatch: number;
    availability: number;
    proximity: number;
    performance: number;
    workload: number;
    teamPreference: number;
  };
  isAvailable: boolean;
  currentWorkload: {
    totalJobs: number;
    hoursWorked: number;
    utilizationRate: number;
  };
}

export interface Address {
  street?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  latitude?: number;
  longitude?: number;
}

@Injectable()
export class AutoAssignmentService {
  constructor(
    @InjectModel(CrewAssignment.name)
    private crewAssignmentModel: Model<CrewAssignmentDocument>,
    private workloadService: WorkloadService,
    private timeOffService: TimeOffService,
  ) {}

  async suggestCrew(
    jobId: string,
    requirements: JobRequirements,
  ): Promise<CrewSuggestion[]> {
    // Get all crew members (this will be replaced with actual user query)
    // For now, return empty array - will be implemented when integrated with AuthModule
    return [];
  }

  async autoAssignCrew(
    jobId: string,
    requirements: JobRequirements,
    assignedBy: string,
  ): Promise<CrewAssignment> {
    const suggestions = await this.suggestCrew(jobId, requirements);

    if (suggestions.length < requirements.crewSize) {
      throw new BadRequestException(
        `Not enough available crew members. Required: ${requirements.crewSize}, Available: ${suggestions.length}`,
      );
    }

    // Filter out unavailable crew
    const availableCrew = suggestions.filter((s) => s.isAvailable);

    if (availableCrew.length < requirements.crewSize) {
      throw new BadRequestException(
        `Not enough available crew members on the specified date`,
      );
    }

    // Sort by score and select top crew members
    const selectedCrew = availableCrew
      .sort((a, b) => b.score - a.score)
      .slice(0, requirements.crewSize);

    const crewMemberIds = selectedCrew.map((c) => c.crewMemberId);
    const scores: Record<string, number> = {};
    selectedCrew.forEach((c) => {
      scores[c.crewMemberId] = c.score;
    });

    // Determine crew lead (highest score or preferred)
    let crewLeadId = requirements.preferredCrewLeadId;
    if (!crewLeadId || !crewMemberIds.includes(crewLeadId)) {
      crewLeadId = selectedCrew[0].crewMemberId; // Highest scoring crew member
    }

    const assignment = new this.crewAssignmentModel({
      jobId,
      crewMembers: crewMemberIds,
      crewLeadId,
      assignedDate: requirements.jobDate,
      assignedBy,
      assignmentMethod: 'auto',
      autoAssignmentScores: scores,
      isConfirmed: false,
      confirmedBy: [],
    });

    return assignment.save();
  }

  async scoreCrewMember(
    crewMember: any,
    job: any,
    requirements: JobRequirements,
  ): Promise<number> {
    let score = 0;
    const breakdown = {
      skillsMatch: 0,
      availability: 0,
      proximity: 0,
      performance: 0,
      workload: 0,
      teamPreference: 0,
    };

    // 1. Skills Match (30 points)
    const crewSkills = crewMember.skills || [];
    const matchedSkills = requirements.requiredSkills.filter((skill) =>
      crewSkills.includes(skill),
    );
    breakdown.skillsMatch =
      (matchedSkills.length / requirements.requiredSkills.length) * 30;
    score += breakdown.skillsMatch;

    // 2. Availability (20 points)
    const isAvailable = await this.checkAvailabilityForJob(
      crewMember._id.toString(),
      requirements.jobDate,
      requirements.estimatedDuration,
    );
    breakdown.availability = isAvailable ? 20 : 0;
    score += breakdown.availability;

    // 3. Proximity (20 points)
    if (crewMember.homeAddress && job.pickupAddress) {
      const distance = this.calculateProximity(
        crewMember.homeAddress,
        job.pickupAddress,
      );
      if (distance < 10) breakdown.proximity = 20;
      else if (distance < 25) breakdown.proximity = 15;
      else if (distance < 50) breakdown.proximity = 10;
      else breakdown.proximity = 5;
      score += breakdown.proximity;
    }

    // 4. Performance Rating (15 points)
    const performanceRating = crewMember.performanceRating || 3;
    breakdown.performance = (performanceRating / 5) * 15;
    score += breakdown.performance;

    // 5. Workload Balance (10 points)
    const workload = await this.workloadService.getCrewWorkload(
      crewMember._id.toString(),
      requirements.jobDate,
    );
    if (workload) {
      if (workload.totalJobs < 3) breakdown.workload = 10;
      else if (workload.totalJobs < 5) breakdown.workload = 5;
      else breakdown.workload = 0;
      score += breakdown.workload;
    } else {
      // No workload data means crew is available
      breakdown.workload = 10;
      score += 10;
    }

    // 6. Team Preferences (5 points)
    if (job.preferredCrew && job.preferredCrew.includes(crewMember._id.toString())) {
      breakdown.teamPreference = 5;
      score += 5;
    }

    return Math.min(100, Math.max(0, score));
  }

  async checkAvailabilityForJob(
    crewId: string,
    jobDate: Date,
    duration: number,
  ): Promise<boolean> {
    // Check if crew member is on time off
    const isOnTimeOff = await this.timeOffService.isOnTimeOff(
      crewId,
      jobDate,
    );
    if (isOnTimeOff) {
      return false;
    }

    // Check workload - if crew has 5+ jobs, they're overloaded
    const workload = await this.workloadService.getCrewWorkload(
      crewId,
      jobDate,
    );
    if (workload && workload.isOverloaded) {
      return false;
    }

    // Additional availability checks can be added here
    // (checking CrewAvailability records, etc.)

    return true;
  }

  calculateProximity(crewHomeAddress: Address, jobAddress: Address): number {
    // If we have lat/long, use Haversine formula
    if (
      crewHomeAddress.latitude &&
      crewHomeAddress.longitude &&
      jobAddress.latitude &&
      jobAddress.longitude
    ) {
      return this.haversineDistance(
        crewHomeAddress.latitude,
        crewHomeAddress.longitude,
        jobAddress.latitude,
        jobAddress.longitude,
      );
    }

    // Fallback: simple zip code comparison
    if (crewHomeAddress.zipCode && jobAddress.zipCode) {
      if (crewHomeAddress.zipCode === jobAddress.zipCode) return 5;
      if (
        crewHomeAddress.zipCode.substring(0, 3) ===
        jobAddress.zipCode.substring(0, 3)
      ) {
        return 15;
      }
      return 30;
    }

    // Default: assume moderate distance
    return 25;
  }

  private haversineDistance(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number,
  ): number {
    const R = 3959; // Earth's radius in miles
    const dLat = this.toRadians(lat2 - lat1);
    const dLon = this.toRadians(lon2 - lon1);

    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRadians(lat1)) *
        Math.cos(this.toRadians(lat2)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  private toRadians(degrees: number): number {
    return degrees * (Math.PI / 180);
  }

  async getCrewAssignment(jobId: string): Promise<CrewAssignment | null> {
    return this.crewAssignmentModel
      .findOne({ jobId })
      .populate('crewMembers', 'name email phone')
      .populate('crewLeadId', 'name email phone')
      .populate('assignedBy', 'name email')
      .lean()
      .exec();
  }

  async confirmAssignment(
    assignmentId: string,
    crewMemberId: string,
  ): Promise<CrewAssignment> {
    const assignment = await this.crewAssignmentModel.findById(assignmentId);
    if (!assignment) {
      throw new NotFoundException(`Assignment ${assignmentId} not found`);
    }

    if (!assignment.confirmedBy) {
      assignment.confirmedBy = [];
    }

    if (!assignment.confirmedBy.includes(crewMemberId as any)) {
      assignment.confirmedBy.push(crewMemberId as any);
    }

    // If all crew members have confirmed, mark as confirmed
    if (assignment.confirmedBy.length === assignment.crewMembers.length) {
      assignment.isConfirmed = true;
    }

    return assignment.save();
  }
}
