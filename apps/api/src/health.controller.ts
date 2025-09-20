import { Controller, Get } from '@nestjs/common';

@Controller('health')
export class HealthController {
  @Get()
  check() {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      service: 'simplepro-api'
    };
  }

  @Get('liveness')
  liveness() {
    return { status: 'ok' };
  }

  @Get('readiness')
  readiness() {
    return {
      status: 'ok',
      ready: true
    };
  }
}