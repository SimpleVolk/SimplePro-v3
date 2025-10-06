// Load environment variables first
import { config } from 'dotenv';
config(); // Load .env file

import { NestFactory } from '@nestjs/core';
import { ValidationPipe, BadRequestException, Logger } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { SecurityMiddleware } from './common/middleware/security.middleware';
import { LoggingMiddleware } from './common/middleware/logging.middleware';
import { GlobalExceptionFilter } from './common/filters/global-exception.filter';
import { CompanyService } from './company/company.service';
import compression from 'compression';
import cookieParser from 'cookie-parser';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  const port = parseInt(process.env.PORT || '3001', 10);
  const logger = new Logger('Bootstrap');

  // Initialize company settings on startup
  try {
    const companyService = app.get(CompanyService);
    await companyService.getSettings(); // Will create defaults if not exists
    logger.log('✓ Company settings initialized');
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.warn('Company settings initialization skipped:', errorMessage);
  }

  // Initialize tariff settings on startup (if SEED_DATA=true)
  if (process.env.SEED_DATA === 'true') {
    try {
      logger.log('🌱 Seeding tariff settings...');
      const { TariffSettingsSeeder } = await import('./database/seeders/tariff-settings.seeder');
      const tariffSeeder = app.get(TariffSettingsSeeder);
      const hasDefaultTariff = await tariffSeeder.hasDefaultTariff();

      if (!hasDefaultTariff) {
        await tariffSeeder.seed();
        logger.log('✓ Tariff settings seeded successfully');
      } else {
        logger.log('✓ Default tariff settings already exist (skipping seed)');
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.warn('Tariff settings seed skipped:', errorMessage);
    }
  }

  // Enable graceful shutdown
  app.enableShutdownHooks();

  // Security middleware
  // OPTIMIZED: Enhanced compression configuration (1KB threshold, level 6)
  app.use(compression({
    filter: (req, res) => {
      // Don't compress responses with x-no-compression header
      if (req.headers['x-no-compression']) {
        return false;
      }
      // Use compression filter (defaults to text, json, xml, etc.)
      return compression.filter(req, res);
    },
    threshold: 1024, // Only compress responses > 1KB
    level: 6, // Compression level 1-9 (6 is good balance between speed/compression)
  }));
  app.use(cookieParser()); // Parse cookies securely
  app.use(new SecurityMiddleware().use.bind(new SecurityMiddleware()));
  app.use(new LoggingMiddleware().use.bind(new LoggingMiddleware()));

  // Global exception filter for standardized error handling
  app.useGlobalFilters(new GlobalExceptionFilter());

  // Global validation pipe with security enhancements
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true, // Strip properties that don't have decorators
      forbidNonWhitelisted: true, // Throw error for unknown properties
      transform: true, // Transform payloads to be objects typed according to their DTO classes
      disableErrorMessages: process.env.NODE_ENV === 'production', // Hide detailed validation errors in production
      exceptionFactory: (errors) => {
        const errorMessages = errors.map(error => {
          const constraints = error.constraints;
          return constraints ? Object.values(constraints).join(', ') : 'Validation failed';
        });
        return new BadRequestException({
          message: 'Validation failed',
          errors: errorMessages,
          statusCode: 400,
        });
      },
    }),
  );

  // CORS configuration - restrict origins in production
  const allowedOrigins = process.env.NODE_ENV === 'production'
    ? (process.env.ALLOWED_ORIGINS?.split(',') || [])
    : ['http://localhost:3000', 'http://localhost:3004', 'http://localhost:3007', 'http://localhost:3008', 'http://localhost:3009', 'http://localhost:3010', 'http://localhost:4000'];

  app.enableCors({
    origin: allowedOrigins,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  });

  // Global prefix
  app.setGlobalPrefix('api');

  // Setup Swagger documentation
  if (process.env.NODE_ENV !== 'production' || process.env.ENABLE_SWAGGER === 'true') {
    setupSwagger(app, port);
  }

  // Start server
  await app.listen(port);

  logger.log(`🚀 Application is running on: http://localhost:${port}/api`);
  logger.log(`🔒 CORS enabled for origins: ${JSON.stringify(allowedOrigins)}`);
  logger.log(`🛡️  Security middleware enabled`);
  logger.log(`📊 Request logging enabled`);

  // Setup graceful shutdown handlers
  setupGracefulShutdown(app);
}

// Swagger API documentation setup
function setupSwagger(app: any, port: number) {
  const config = new DocumentBuilder()
    .setTitle('SimplePro API')
    .setDescription('Moving Company Management System API')
    .setVersion('1.0.0')
    .addTag('auth', 'Authentication and authorization')
    .addTag('customers', 'Customer management')
    .addTag('estimates', 'Estimate calculations')
    .addTag('jobs', 'Job management')
    .addTag('analytics', 'Analytics and reporting')
    .addTag('health', 'System health checks')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        name: 'JWT',
        description: 'Enter JWT token',
        in: 'header',
      },
      'JWT-auth'
    )
    .addServer(`http://localhost:${port}/api`, 'Development server')
    .addServer('https://api.simplepro.com/api', 'Production server')
    .build();

  const document = SwaggerModule.createDocument(app, config, {
    operationIdFactory: (_controllerKey: string, methodKey: string) => methodKey,
  });

  SwaggerModule.setup('api/docs', app, document, {
    customSiteTitle: 'SimplePro API Documentation',
    customfavIcon: '/favicon.ico',
    customJs: [
      'https://cdnjs.cloudflare.com/ajax/libs/swagger-ui/4.15.5/swagger-ui-bundle.min.js',
    ],
    customCssUrl: [
      'https://cdnjs.cloudflare.com/ajax/libs/swagger-ui/4.15.5/swagger-ui.min.css',
    ],
    swaggerOptions: {
      persistAuthorization: true,
      displayRequestDuration: true,
      docExpansion: 'none',
      filter: true,
      showRequestHeaders: true,
      tryItOutEnabled: true,
    },
  });
}

// Graceful shutdown handler
function setupGracefulShutdown(app: any) {
  const signals = ['SIGTERM', 'SIGINT', 'SIGQUIT'] as const;
  const logger = new (require('@nestjs/common').Logger)('Bootstrap');

  signals.forEach((signal) => {
    process.on(signal, async () => {
      logger.log(`Received ${signal}, starting graceful shutdown...`);

      try {
        // Set shutdown timeout
        const shutdownTimer = setTimeout(() => {
          logger.error('Forced shutdown due to timeout');
          process.exit(1);
        }, 30000); // 30 second timeout

        // Close the application gracefully
        await app.close();

        clearTimeout(shutdownTimer);
        logger.log('Application closed gracefully');
        process.exit(0);
      } catch (error) {
        logger.error('Error during graceful shutdown:', error);
        process.exit(1);
      }
    });
  });

  // Handle uncaught exceptions
  process.on('uncaughtException', (error) => {
    logger.error('Uncaught Exception:', error);
    process.exit(1);
  });

  // Handle unhandled promise rejections
  process.on('unhandledRejection', (reason, promise) => {
    logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
    process.exit(1);
  });
}

bootstrap().catch((error) => {
  console.error('Failed to start application:', error);
  process.exit(1);
});