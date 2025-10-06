import { Controller, Post, Body, UseGuards } from '@nestjs/common';
import { EstimatesService } from './estimates.service';
import { CreateEstimateDto } from './dto/create-estimate.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { RequirePermissions } from '../auth/decorators/permissions.decorator';

@Controller('estimates')
@UseGuards(JwtAuthGuard, RolesGuard)
export class EstimatesController {
  constructor(private readonly estimatesService: EstimatesService) {}

  @Post('calculate')
  @RequirePermissions(
    { resource: 'estimates', action: 'create' },
    { resource: 'estimates', action: 'read' },
  )
  calculateEstimate(@Body() createEstimateDto: CreateEstimateDto) {
    return this.estimatesService.calculateEstimate(createEstimateDto);
  }
}
