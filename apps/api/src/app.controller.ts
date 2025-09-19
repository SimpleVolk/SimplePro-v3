import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { AppService } from './app.service';

@ApiTags('Root')
@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  @ApiOperation({ summary: 'Get API information' })
  @ApiResponse({ status: 200, description: 'API information' })
  getInfo() {
    return this.appService.getInfo();
  }

  @Get('version')
  @ApiOperation({ summary: 'Get API version' })
  @ApiResponse({ status: 200, description: 'API version information' })
  getVersion() {
    return this.appService.getVersion();
  }
}