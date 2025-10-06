import { Injectable, ExecutionContext } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';
import { Request } from 'express';

@Injectable()
export class CustomThrottlerGuard extends ThrottlerGuard {
  protected async getTracker(req: Record<string, any>): Promise<string> {
    // Use IP address as the primary tracker
    const request = req as Request;
    const ip = this.getClientIp(request);

    // For authenticated users, also consider user ID
    const user = (request as any).user;
    if (user?.id) {
      return `${ip}:${user.id}`;
    }

    return ip;
  }

  protected async shouldSkip(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();

    // Skip rate limiting for health checks
    if (request.path === '/api/health') {
      return true;
    }

    // Skip for certain user agents (monitoring tools)
    const userAgent = request.get('User-Agent')?.toLowerCase() || '';
    const monitoringAgents = ['healthcheck', 'monitor', 'probe'];
    if (monitoringAgents.some((agent) => userAgent.includes(agent))) {
      return true;
    }

    return false;
  }

  protected getClientIp(request: Request): string {
    // Check for trusted proxy headers in order of preference
    const forwarded = request.get('X-Forwarded-For');
    if (forwarded) {
      const ips = forwarded.split(',').map((ip) => ip.trim());
      return ips[0]; // First IP is the original client
    }

    const realIp = request.get('X-Real-IP');
    if (realIp) {
      return realIp;
    }

    const cfConnectingIp = request.get('CF-Connecting-IP'); // Cloudflare
    if (cfConnectingIp) {
      return cfConnectingIp;
    }

    return request.ip || request.connection?.remoteAddress || 'unknown';
  }

  // Remove handleRequest override to work with current NestJS version
}
