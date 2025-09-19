import { NestFactory } from '@nestjs/core';
import { ValidationPipe, VersioningType } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import * as helmet from 'helmet';
import * as compression from 'compression';
import * as cookieParser from 'cookie-parser';
import { Logger, LoggerErrorInterceptor } from 'nestjs-pino';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    bufferLogs: true,
  });

  // Get config service
  const configService = app.get(ConfigService);
  const port = configService.get<number>('API_PORT') || 3001;
  const env = configService.get<string>('NODE_ENV') || 'development';

  // Use Pino logger
  app.useLogger(app.get(Logger));
  app.useGlobalInterceptors(new LoggerErrorInterceptor());

  // Security middleware
  app.use(helmet({
    crossOriginEmbedderPolicy: false,
    contentSecurityPolicy: {
      directives: {
        imgSrc: [`'self'`, 'data:', 'apollo-server-landing-page.cdn.apollographql.com'],
        scriptSrc: [`'self'`, `https: 'unsafe-inline'`],
        manifestSrc: [`'self'`, 'apollo-server-landing-page.cdn.apollographql.com'],
        frameSrc: [`'self'`, 'sandbox.embed.apollographql.com'],
      },
    },
  }));
  
  app.use(compression());
  app.use(cookieParser());

  // CORS configuration
  app.enableCors({
    origin: configService.get<string>('CORS_ORIGINS')?.split(',') || ['http://localhost:3000'],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  });

  // Global prefix and versioning
  app.setGlobalPrefix('api');
  app.enableVersioning({
    type: VersioningType.URI,
    defaultVersion: '1',
  });

  // Global pipes
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  // Swagger documentation
  if (configService.get<boolean>('ENABLE_SWAGGER', true)) {
    const config = new DocumentBuilder()
      .setTitle('SimplePro API')
      .setDescription('The SimplePro Moving Company Management System API')
      .setVersion('1.0')
      .addBearerAuth()
      .addTag('Authentication')
      .addTag('Users')
      .addTag('Customers')
      .addTag('Estimates')
      .addTag('Jobs')
      .addTag('Crews')
      .addTag('Inventory')
      .addTag('Payments')
      .addTag('Reviews')
      .addTag('Documents')
      .addTag('Analytics')
      .build();

    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('api/docs', app, document, {
      swaggerOptions: {
        persistAuthorization: true,
      },
    });
  }

  // Graceful shutdown
  app.enableShutdownHooks();

  // Start server
  await app.listen(port);

  const logger = app.get(Logger);
  logger.log(`🚀 Application is running in ${env} mode on: http://localhost:${port}/api`);
  
  if (configService.get<boolean>('ENABLE_SWAGGER', true)) {
    logger.log(`📚 API Documentation available at: http://localhost:${port}/api/docs`);
  }
}