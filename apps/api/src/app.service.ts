import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class AppService {
  constructor(private readonly configService: ConfigService) {}

  getInfo() {
    return {
      name: 'SimplePro API',
      description: 'Moving Company Management System API',
      environment: this.configService.get<string>('NODE_ENV'),
      timestamp: new Date().toISOString(),
    };
  }

  getVersion() {
    return {
      version: '1.0.0',
      build: process.env.BUILD_NUMBER || 'local',
      commit: process.env.GIT_COMMIT || 'development',
    };
  }
}