import { NestFactory } from '@nestjs/core';
import { ValidationPipe, BadRequestException } from '@nestjs/common';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  const port = process.env.PORT || 4000;

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
    : ['http://localhost:3000', 'http://localhost:3004', 'http://localhost:3007', 'http://localhost:3008', 'http://localhost:3009'];

  app.enableCors({
    origin: allowedOrigins,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  });

  // Global prefix
  app.setGlobalPrefix('api');

  // Start server
  await app.listen(port);

  console.log(`🚀 Application is running on: http://localhost:${port}/api`);
  console.log(`🔒 CORS enabled for origins: ${JSON.stringify(allowedOrigins)}`);
}

bootstrap();