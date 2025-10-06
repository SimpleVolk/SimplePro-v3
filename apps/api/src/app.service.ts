import { Injectable } from '@nestjs/common';

@Injectable()
export class AppService {
  getInfo() {
    return {
      name: 'SimplePro API',
      description: 'Moving Company Management System API',
      environment: process.env.NODE_ENV || 'development',
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
