import { Injectable, NestMiddleware, Logger } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import helmet from 'helmet';
import { rateLimit } from 'express-rate-limit';

interface SecurityConfig {
  enableHelmet: boolean;
  enableRateLimit: boolean;
  rateLimitWindowMs: number;
  rateLimitMaxRequests: number;
  trustedProxies: string[];
  allowedOrigins: string[];
  adminEndpoints: string[];
  adminRateLimitMaxRequests: number;
}

@Injectable()
export class SecurityMiddleware implements NestMiddleware {
  private readonly logger = new Logger(SecurityMiddleware.name);
  private readonly config: SecurityConfig;
  private rateLimiter: any;
  private adminRateLimiter: any;

  constructor() {
    this.config = {
      enableHelmet: true,
      enableRateLimit: true,
      rateLimitWindowMs: 15 * 60 * 1000, // 15 minutes
      rateLimitMaxRequests: process.env.NODE_ENV === 'production' ? 100 : 1000, // Lower limit in production
      trustedProxies: process.env.TRUSTED_PROXIES?.split(',') || [],
      allowedOrigins: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3008'],
      adminEndpoints: ['/api/auth/users', '/api/auth/roles', '/api/system', '/api/pricing-rules'],
      adminRateLimitMaxRequests: process.env.NODE_ENV === 'production' ? 20 : 100,
    };

    this.initializeRateLimiters();
  }

  private initializeRateLimiters(): void {
    // General rate limiter
    this.rateLimiter = rateLimit({
      windowMs: this.config.rateLimitWindowMs,
      max: this.config.rateLimitMaxRequests,
      message: {
        error: 'Too many requests from this IP, please try again later.',
        statusCode: 429,
        timestamp: new Date().toISOString(),
      },
      standardHeaders: true,
      legacyHeaders: false,
      handler: (req: Request, res: Response) => {
        this.logger.warn(`Rate limit exceeded for IP: ${this.getClientIp(req)}, Path: ${req.path}`);
        res.status(429).json({
          error: 'Too many requests from this IP, please try again later.',
          statusCode: 429,
          timestamp: new Date().toISOString(),
          retryAfter: Math.ceil(this.config.rateLimitWindowMs / 1000),
        });
      },
      skip: (req: Request) => {
        // Skip rate limiting for health checks
        return req.path === '/api/health';
      },
    });

    // Stricter rate limiter for admin endpoints
    this.adminRateLimiter = rateLimit({
      windowMs: this.config.rateLimitWindowMs,
      max: this.config.adminRateLimitMaxRequests,
      message: {
        error: 'Too many admin requests from this IP, please try again later.',
        statusCode: 429,
        timestamp: new Date().toISOString(),
      },
      standardHeaders: true,
      legacyHeaders: false,
      handler: (req: Request, res: Response) => {
        this.logger.error(`SECURITY ALERT: Admin rate limit exceeded for IP: ${this.getClientIp(req)}, Path: ${req.path}, User: ${(req as any).user?.username || 'Anonymous'}`);
        res.status(429).json({
          error: 'Too many admin requests from this IP, please try again later.',
          statusCode: 429,
          timestamp: new Date().toISOString(),
          retryAfter: Math.ceil(this.config.rateLimitWindowMs / 1000),
        });
      },
    });
  }

  use(req: Request, res: Response, next: NextFunction): void {
    // Apply Helmet security headers
    if (this.config.enableHelmet) {
      this.applyHelmetSecurity(req, res, () => {
        this.applyAdditionalSecurity(req, res, next);
      });
    } else {
      this.applyAdditionalSecurity(req, res, next);
    }
  }

  private applyHelmetSecurity(req: Request, res: Response, next: NextFunction): void {
    const helmetConfig = helmet({
      // Content Security Policy
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          styleSrc: [
            "'self'",
            "'unsafe-inline'", // Required for Swagger UI
            "https://cdnjs.cloudflare.com",
          ],
          scriptSrc: [
            "'self'",
            "'unsafe-inline'", // Required for Swagger UI
            "https://cdnjs.cloudflare.com",
          ],
          imgSrc: ["'self'", "data:", "https:"],
          connectSrc: ["'self'"],
          fontSrc: ["'self'", "https://cdnjs.cloudflare.com"],
          objectSrc: ["'none'"],
          mediaSrc: ["'self'"],
          frameSrc: ["'none'"],
        },
      },

      // HTTP Strict Transport Security (HSTS)
      hsts: {
        maxAge: 31536000, // 1 year
        includeSubDomains: true,
        preload: true,
      },

      // X-Frame-Options
      frameguard: {
        action: 'deny',
      },

      // X-Content-Type-Options
      noSniff: true,

      // X-XSS-Protection
      xssFilter: true,

      // Referrer Policy
      referrerPolicy: {
        policy: ['same-origin'],
      },

      // Cross-Origin-Embedder-Policy
      crossOriginEmbedderPolicy: false, // Disable to allow Swagger UI

      // Cross-Origin-Opener-Policy
      crossOriginOpenerPolicy: {
        policy: 'same-origin',
      },

      // Cross-Origin-Resource-Policy
      crossOriginResourcePolicy: {
        policy: 'cross-origin', // Allow for API usage
      },

      // DNS Prefetch Control
      dnsPrefetchControl: {
        allow: false,
      },

      // Hide X-Powered-By header
      hidePoweredBy: true,

      // IE No Open
      ieNoOpen: true,

      // Origin Agent Cluster
      originAgentCluster: true,

      // Permissions Policy (remove if not supported in this helmet version)
      // permissionsPolicy: {
      //   features: {
      //     camera: ["'none'"],
      //     microphone: ["'none'"],
      //     geolocation: ["'none'"],
      //     payment: ["'none'"],
      //   },
      // },
    });

    helmetConfig(req, res, next);
  }

  private applyAdditionalSecurity(req: Request, res: Response, next: NextFunction): void {
    // Add custom security headers
    res.setHeader('X-API-Version', '1.0.0');
    res.setHeader('X-Request-ID', this.generateRequestId());
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');

    // Remove sensitive headers that might leak information
    res.removeHeader('X-Powered-By');
    res.removeHeader('Server');

    // Apply rate limiting
    if (this.config.enableRateLimit) {
      this.applyRateLimit(req, res, () => {
        this.validateRequest(req, res, next);
      });
    } else {
      this.validateRequest(req, res, next);
    }
  }

  private applyRateLimit(req: Request, res: Response, next: NextFunction): void {
    // Check if this is an admin endpoint
    const isAdminEndpoint = this.config.adminEndpoints.some(endpoint =>
      req.path.startsWith(endpoint)
    );

    if (isAdminEndpoint) {
      this.adminRateLimiter(req, res, next);
    } else {
      this.rateLimiter(req, res, next);
    }
  }

  private validateRequest(req: Request, res: Response, next: NextFunction): void {
    const clientIp = this.getClientIp(req);
    const userAgent = req.get('User-Agent') || 'Unknown';

    // Log security-relevant requests
    if (req.path.startsWith('/api/auth')) {
      this.logger.log(`Auth request: ${req.method} ${req.path} from IP: ${clientIp}`);
    }

    // Check for suspicious patterns
    this.detectSuspiciousActivity(req, clientIp, userAgent);

    // Validate Content-Type for POST/PUT/PATCH requests
    if (['POST', 'PUT', 'PATCH'].includes(req.method)) {
      const contentType = req.get('Content-Type');
      if (!contentType || (!contentType.includes('application/json') && !contentType.includes('multipart/form-data'))) {
        this.logger.warn(`Suspicious request with invalid Content-Type: ${contentType} from IP: ${clientIp}`);
        res.status(415).json({
          error: 'Unsupported Media Type',
          statusCode: 415,
          timestamp: new Date().toISOString(),
        });
        return;
      }
    }

    // Add request metadata for logging middleware
    (req as any).securityContext = {
      requestId: res.get('X-Request-ID'),
      clientIp,
      userAgent,
      timestamp: new Date().toISOString(),
    };

    next();
  }

  private detectSuspiciousActivity(req: Request, clientIp: string, userAgent: string): void {
    const suspiciousPatterns = [
      // SQL injection patterns
      /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|UNION)\b)/i,
      // XSS patterns
      /<script[^>]*>.*?<\/script>/gi,
      // Path traversal
      /\.\.\//g,
      // Command injection
      /(\b(eval|exec|system|shell_exec)\b)/i,
    ];

    const requestData = `${req.url} ${JSON.stringify(req.query)} ${JSON.stringify(req.body)}`;

    for (const pattern of suspiciousPatterns) {
      if (pattern.test(requestData)) {
        this.logger.error(`SECURITY ALERT: Suspicious pattern detected in request from IP: ${clientIp}, Pattern: ${pattern}, URL: ${req.url}`);
        break;
      }
    }

    // Check for suspicious User-Agent strings
    const suspiciousUserAgents = ['sqlmap', 'nikto', 'nmap', 'nessus', 'burp', 'zap'];
    if (suspiciousUserAgents.some(agent => userAgent.toLowerCase().includes(agent))) {
      this.logger.error(`SECURITY ALERT: Suspicious User-Agent detected: ${userAgent} from IP: ${clientIp}`);
    }

    // Check for rapid requests (potential DoS)
    const now = Date.now();
    const requestKey = `req_${clientIp}`;
    const lastRequest = (global as any).lastRequestTimes?.[requestKey] || 0;

    if (!((global as any).lastRequestTimes)) {
      (global as any).lastRequestTimes = {};
    }

    if (now - lastRequest < 100) { // Less than 100ms between requests
      this.logger.warn(`Rapid requests detected from IP: ${clientIp}, Time diff: ${now - lastRequest}ms`);
    }

    (global as any).lastRequestTimes[requestKey] = now;

    // Clean up old entries periodically
    if (Math.random() < 0.01) { // 1% chance to clean up
      const cutoff = now - 60000; // 1 minute ago
      for (const [key, timestamp] of Object.entries((global as any).lastRequestTimes)) {
        if ((timestamp as number) < cutoff) {
          delete (global as any).lastRequestTimes[key];
        }
      }
    }
  }

  private getClientIp(req: Request): string {
    // Check for trusted proxy headers in order of preference
    const forwarded = req.get('X-Forwarded-For');
    if (forwarded) {
      const ips = forwarded.split(',').map(ip => ip.trim());
      return ips[0]; // First IP is the original client
    }

    const realIp = req.get('X-Real-IP');
    if (realIp) {
      return realIp;
    }

    const cfConnectingIp = req.get('CF-Connecting-IP'); // Cloudflare
    if (cfConnectingIp) {
      return cfConnectingIp;
    }

    return req.ip || req.connection.remoteAddress || 'unknown';
  }

  private generateRequestId(): string {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substr(2, 5);
    return `req_${timestamp}_${random}`;
  }

  // Method to manually check if IP is in whitelist (for future admin IP restrictions)
  private isIpWhitelisted(ip: string): boolean {
    const whitelist = process.env.ADMIN_IP_WHITELIST?.split(',') || [];
    if (whitelist.length === 0) return true; // No whitelist means all IPs allowed

    return whitelist.some(whitelistedIp => {
      // Support CIDR notation in the future
      return ip === whitelistedIp.trim();
    });
  }

  // Method used by rate limiter to check admin whitelisting
  validateAdminAccess(ip: string): boolean {
    return this.isIpWhitelisted(ip);
  }

  // Health check method for monitoring
  getSecurityStatus(): {
    rateLimitEnabled: boolean;
    helmetEnabled: boolean;
    activeConnections: number;
    lastSecurityIncident?: Date;
  } {
    return {
      rateLimitEnabled: this.config.enableRateLimit,
      helmetEnabled: this.config.enableHelmet,
      activeConnections: Object.keys((global as any).lastRequestTimes || {}).length,
    };
  }
}