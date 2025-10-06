import { Resolver, Mutation, Args } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { EstimatesService } from '../../estimates/estimates.service';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { RequirePermissions } from '../../auth/decorators/permissions.decorator';

@Resolver('Estimate')
@UseGuards(JwtAuthGuard, RolesGuard)
export class EstimatesResolver {
  constructor(private readonly estimatesService: EstimatesService) {}

  @Mutation('calculateEstimate')
  @RequirePermissions(
    { resource: 'estimates', action: 'create' },
    { resource: 'estimates', action: 'read' },
  )
  async calculateEstimate(@Args('input') input: any) {
    return this.estimatesService.calculateEstimate(input);
  }
}
