import { Controller, Post, Body } from '@nestjs/common';
import { EstimatesService } from './estimates.service';
import { CreateEstimateDto } from './dto/create-estimate.dto';
import { Public } from '../auth/decorators/public.decorator';

@Controller('estimates')
@Public() // Temporarily public for development - will be secured later
export class EstimatesController {
  constructor(private readonly estimatesService: EstimatesService) {}

  @Post('calculate')
  calculateEstimate(@Body() createEstimateDto: CreateEstimateDto) {
    return this.estimatesService.calculateEstimate(createEstimateDto);
  }
}