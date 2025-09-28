import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsOptional } from 'class-validator';
import { HealthCheckLevel } from '../interfaces/health-check.interface';

export class HealthCheckQueryDto {
  @ApiProperty({
    description: 'Level of health check to perform',
    enum: HealthCheckLevel,
    required: false,
    default: HealthCheckLevel.BASIC,
  })
  @IsOptional()
  @IsEnum(HealthCheckLevel)
  level?: HealthCheckLevel = HealthCheckLevel.BASIC;

  @ApiProperty({
    description: 'Include detailed timing information',
    required: false,
    default: false,
  })
  @IsOptional()
  includeTiming?: boolean = false;
}

export class HealthCheckResponseDto {
  @ApiProperty({
    description: 'Overall health status',
    enum: ['ok', 'error', 'shutting_down'],
  })
  status!: 'ok' | 'error' | 'shutting_down';

  @ApiProperty({
    description: 'Timestamp of the health check',
  })
  timestamp!: string;

  @ApiProperty({
    description: 'Service identifier',
  })
  service!: string;

  @ApiProperty({
    description: 'Environment information',
  })
  environment!: string;

  @ApiProperty({
    description: 'Application version',
  })
  version!: string;

  @ApiProperty({
    description: 'Health check details by component',
    required: false,
  })
  info?: Record<string, any>;

  @ApiProperty({
    description: 'Error details if any components are unhealthy',
    required: false,
  })
  error?: Record<string, any>;

  @ApiProperty({
    description: 'Additional details about the health check',
    required: false,
  })
  details?: Record<string, any>;
}
