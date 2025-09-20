import { Controller, Post, Body } from '@nestjs/common';
import { EstimatesService } from './estimates.service';
import { CreateEstimateDto } from './dto/create-estimate.dto';

@Controller('estimates')
export class EstimatesController {
  constructor(private readonly estimatesService: EstimatesService) {}

  @Post('calculate')
  calculateEstimate(@Body() createEstimateDto: CreateEstimateDto) {
    return this.estimatesService.calculateEstimate(createEstimateDto);
  }
}