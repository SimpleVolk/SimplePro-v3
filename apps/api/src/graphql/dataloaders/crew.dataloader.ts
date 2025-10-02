import { Injectable, Scope } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import DataLoader from 'dataloader';
import { User, UserDocument } from '../../auth/schemas/user.schema';

// Crew member type (based on User schema)
interface CrewMember {
  id: string;
  userId: string;
  firstName: string;
  lastName: string;
  fullName?: string;
  email: string;
  phone?: string;
  role: string;
  status: string;
  skills?: string[];
  certifications?: string[];
  availability?: any;
}

@Injectable({ scope: Scope.REQUEST })
export class CrewDataLoader {
  constructor(
    @InjectModel(User.name) private userModel: Model<UserDocument>
  ) {}

  private readonly batchCrewMembers = new DataLoader<string, CrewMember | null>(
    async (crewMemberIds: readonly string[]) => {
      // Fetch crew members (users with crew role) in a single query
      const users = await this.userModel
        .find({
          _id: { $in: crewMemberIds as string[] },
          role: { $in: ['crew', 'crew_lead', 'driver'] }
        })
        .lean()
        .exec();

      // Create a map for quick lookup
      const crewMap = new Map<string, CrewMember>();
      users.forEach((user: any) => {
        crewMap.set(user._id.toString(), this.convertUserToCrewMember(user));
      });

      // Return crew members in the same order as requested IDs
      return crewMemberIds.map(id => crewMap.get(id) || null);
    }
  );

  async load(crewMemberId: string): Promise<CrewMember | null> {
    return this.batchCrewMembers.load(crewMemberId);
  }

  async loadMany(crewMemberIds: string[]): Promise<(CrewMember | null)[]> {
    return this.batchCrewMembers.loadMany(crewMemberIds);
  }

  async loadAvailableCrew(date: Date): Promise<CrewMember[]> {
    // This could be optimized with a separate query
    // For now, we'll fetch all crew members
    const users = await this.userModel
      .find({
        role: { $in: ['crew', 'crew_lead', 'driver'] },
        isActive: true
      })
      .lean()
      .exec();

    return users.map(user => this.convertUserToCrewMember(user));
  }

  private convertUserToCrewMember(user: any): CrewMember {
    return {
      id: user._id?.toString() || user.id,
      userId: user._id?.toString() || user.id,
      firstName: user.firstName || '',
      lastName: user.lastName || '',
      fullName: user.firstName && user.lastName ? `${user.firstName} ${user.lastName}` : user.username,
      email: user.email,
      phone: user.phone,
      role: user.role,
      status: user.isActive ? 'active' : 'inactive',
      skills: user.skills || [],
      certifications: user.certifications || [],
      availability: user.availability || {}
    };
  }
}
