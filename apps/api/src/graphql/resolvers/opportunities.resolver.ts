import { Resolver, Query, Mutation, Args, ResolveField, Parent } from '@nestjs/graphql';
import { UseGuards, Request } from '@nestjs/common';
import { OpportunitiesService } from '../../opportunities/opportunities.service';
import { CustomersService } from '../../customers/customers.service';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { CustomerDataLoader } from '../dataloaders/customer.dataloader';

@Resolver('Opportunity')
@UseGuards(JwtAuthGuard, RolesGuard)
export class OpportunitiesResolver {
  constructor(
    private readonly opportunitiesService: OpportunitiesService,
    private readonly customersService: CustomersService,
    private readonly customerDataLoader: CustomerDataLoader
  ) {}

  // Queries
  @Query('opportunity')
  async getOpportunity(@Args('id') id: string) {
    return this.opportunitiesService.findById(id);
  }

  @Query('opportunities')
  async getOpportunities(@Args('filters') filters?: any) {
    return this.opportunitiesService.findAll(filters);
  }

  @Query('opportunityStatistics')
  @Roles('super_admin', 'admin', 'dispatcher')
  async getStatistics(@Args('userId') userId?: string, @Request() req?: any) {
    const targetUserId = userId || req?.user?.userId;
    return this.opportunitiesService.getStatistics(targetUserId);
  }

  // Mutations
  @Mutation('createOpportunity')
  @Roles('super_admin', 'admin', 'dispatcher')
  async createOpportunity(
    @Args('input') input: any,
    @Request() req: any
  ) {
    const userId = req.user?.userId || 'system';
    return this.opportunitiesService.create(input, userId);
  }

  @Mutation('updateOpportunity')
  @Roles('super_admin', 'admin', 'dispatcher')
  async updateOpportunity(
    @Args('id') id: string,
    @Args('input') input: any,
    @Request() req: any
  ) {
    const userId = req.user?.userId || 'system';
    return this.opportunitiesService.update(id, input, userId);
  }

  @Mutation('updateOpportunityStatus')
  @Roles('super_admin', 'admin', 'dispatcher')
  async updateOpportunityStatus(
    @Args('id') id: string,
    @Args('status') status: string,
    @Request() req: any
  ) {
    const userId = req.user?.userId || 'system';
    return this.opportunitiesService.updateStatus(id, status, userId);
  }

  @Mutation('deleteOpportunity')
  @Roles('super_admin', 'admin')
  async deleteOpportunity(@Args('id') id: string): Promise<boolean> {
    await this.opportunitiesService.delete(id);
    return true;
  }

  // Field Resolvers
  @ResolveField('customer')
  async getCustomer(@Parent() opportunity: any) {
    if (!opportunity.customerId) return null;
    return this.customerDataLoader.load(opportunity.customerId);
  }

  @ResolveField('assignedSalesRepDetails')
  async getAssignedSalesRep(@Parent() opportunity: any) {
    if (!opportunity.assignedSalesRep) return null;
    // This would need a User DataLoader - for now return basic info
    return {
      id: opportunity.assignedSalesRep,
      fullName: 'Sales Representative' // Placeholder
    };
  }
}
