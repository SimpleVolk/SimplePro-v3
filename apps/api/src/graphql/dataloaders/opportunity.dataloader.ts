import { Injectable, Scope } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import DataLoader from 'dataloader';
import { Opportunity, OpportunityDocument } from '../../opportunities/schemas/opportunity.schema';

@Injectable({ scope: Scope.REQUEST })
export class OpportunityDataLoader {
  constructor(
    @InjectModel(Opportunity.name) private opportunityModel: Model<OpportunityDocument>
  ) {}

  private readonly batchOpportunities = new DataLoader<string, Opportunity | null>(
    async (opportunityIds: readonly string[]) => {
      // Fetch all opportunities in a single query
      const opportunities = await this.opportunityModel
        .find({ _id: { $in: opportunityIds as string[] } })
        .lean()
        .exec();

      // Create a map for quick lookup
      const opportunityMap = new Map<string, Opportunity>();
      opportunities.forEach((opportunity: any) => {
        opportunityMap.set(opportunity._id.toString(), this.convertOpportunityDocument(opportunity));
      });

      // Return opportunities in the same order as requested IDs
      return opportunityIds.map(id => opportunityMap.get(id) || null);
    }
  );

  async load(opportunityId: string): Promise<Opportunity | null> {
    return this.batchOpportunities.load(opportunityId);
  }

  async loadMany(opportunityIds: string[]): Promise<(Opportunity | null)[]> {
    return this.batchOpportunities.loadMany(opportunityIds) as Promise<(Opportunity | null)[]>;
  }

  private convertOpportunityDocument(doc: any): Opportunity {
    return {
      id: doc._id?.toString() || doc.id,
      customerId: doc.customerId,
      serviceType: doc.serviceType,
      moveDate: doc.moveDate,
      origin: doc.origin,
      destination: doc.destination,
      estimatedValue: doc.estimatedValue,
      status: doc.status,
      leadSource: doc.leadSource,
      assignedSalesRep: doc.assignedSalesRep,
      notes: doc.notes,
      followUpDate: doc.followUpDate,
      tags: doc.tags,
      createdAt: doc.createdAt,
      updatedAt: doc.updatedAt,
      createdBy: doc.createdBy,
      updatedBy: doc.updatedBy
    } as any;
  }
}
