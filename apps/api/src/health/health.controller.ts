import {
  Controller,
  Get,
  Query,
  HttpStatus,
  HttpCode,
  Logger,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery } from '@nestjs/swagger';
import { Public } from '../auth/decorators/public.decorator';
import { HealthService } from './health.service';
import {
  HealthCheckQueryDto,
  HealthCheckResponseDto,
} from './dto/health-check.dto';
import { HealthCheckLevel } from './interfaces/health-check.interface';

@ApiTags('health')
@Controller('health')
@Public()
export class HealthController {
  private readonly logger = new Logger(HealthController.name);

  constructor(private readonly healthService: HealthService) {}

  @Get()
  @ApiOperation({
    summary: 'Comprehensive health check',
    description:
      'Performs health check with configurable depth. Use level parameter to control check comprehensiveness.',
  })
  @ApiResponse({
    status: 200,
    description: 'Health check completed successfully',
    type: HealthCheckResponseDto,
  })
  @ApiResponse({
    status: 503,
    description: 'Service unhealthy - one or more dependencies failed',
    type: HealthCheckResponseDto,
  })
  @ApiQuery({
    name: 'level',
    required: false,
    enum: HealthCheckLevel,
    description: 'Level of health check to perform',
  })
  @ApiQuery({
    name: 'includeTiming',
    required: false,
    type: Boolean,
    description: 'Include detailed timing information',
  })
  async check(
    @Query() query: HealthCheckQueryDto,
  ): Promise<HealthCheckResponseDto> {
    const level = query.level || HealthCheckLevel.BASIC;

    try {
      let result: HealthCheckResponseDto;

      switch (level) {
        case HealthCheckLevel.BASIC:
          result = await this.healthService.basicHealthCheck();
          break;
        case HealthCheckLevel.DETAILED:
          result = await this.healthService.detailedHealthCheck();
          break;
        case HealthCheckLevel.FULL:
          result = await this.healthService.fullHealthCheck();
          break;
        default:
          result = await this.healthService.basicHealthCheck();
      }

      // Log health check requests in production for monitoring
      if (process.env.NODE_ENV === 'production') {
        this.logger.log(
          `Health check completed - Level: ${level}, Status: ${result.status}, ` +
            `Response time: ${result.details?.responseTime}ms`,
        );
      }

      return result;
    } catch (error) {
      this.logger.error('Health check failed:', error);
      throw error;
    }
  }

  @Get('basic')
  @ApiOperation({
    summary: 'Basic health check',
    description: 'Fast health check with minimal dependencies (database only)',
  })
  @ApiResponse({
    status: 200,
    description: 'Basic health check passed',
    type: HealthCheckResponseDto,
  })
  @ApiResponse({
    status: 503,
    description: 'Basic health check failed',
  })
  async basic(): Promise<HealthCheckResponseDto> {
    return this.healthService.basicHealthCheck();
  }

  @Get('detailed')
  @ApiOperation({
    summary: 'Detailed health check',
    description:
      'Comprehensive health check including database, Redis, memory, and disk',
  })
  @ApiResponse({
    status: 200,
    description: 'Detailed health check passed',
    type: HealthCheckResponseDto,
  })
  @ApiResponse({
    status: 503,
    description: 'Detailed health check failed',
  })
  async detailed(): Promise<HealthCheckResponseDto> {
    return this.healthService.detailedHealthCheck();
  }

  @Get('full')
  @ApiOperation({
    summary: 'Full health check',
    description:
      'Complete health check including all dependencies and external services',
  })
  @ApiResponse({
    status: 200,
    description: 'Full health check passed',
    type: HealthCheckResponseDto,
  })
  @ApiResponse({
    status: 503,
    description: 'Full health check failed',
  })
  async full(): Promise<HealthCheckResponseDto> {
    return this.healthService.fullHealthCheck();
  }

  @Get('liveness')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Liveness probe',
    description:
      'Kubernetes liveness probe - minimal check to verify service is running',
  })
  @ApiResponse({
    status: 200,
    description: 'Service is alive',
    type: HealthCheckResponseDto,
  })
  async liveness(): Promise<HealthCheckResponseDto> {
    return this.healthService.livenessCheck();
  }

  @Get('readiness')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Readiness probe',
    description:
      'Kubernetes readiness probe - check if service is ready to receive traffic',
  })
  @ApiResponse({
    status: 200,
    description: 'Service is ready',
    type: HealthCheckResponseDto,
  })
  @ApiResponse({
    status: 503,
    description: 'Service not ready',
  })
  async readiness(): Promise<HealthCheckResponseDto> {
    return this.healthService.readinessCheck();
  }

  @Get('info')
  @ApiOperation({
    summary: 'System information',
    description: 'Get detailed system and application information',
  })
  @ApiResponse({
    status: 200,
    description: 'System information retrieved successfully',
  })
  async info(): Promise<any> {
    return this.healthService.getSystemInfo();
  }
}
