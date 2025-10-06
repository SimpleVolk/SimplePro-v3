import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { MongooseModule } from '@nestjs/mongoose';
import { APP_GUARD } from '@nestjs/core';

import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtStrategy } from './strategies/jwt.strategy';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { RolesGuard } from './guards/roles.guard';
import {
  User as UserSchema,
  UserSchema as UserSchemaDefinition,
} from './schemas/user.schema';
import {
  UserSession as UserSessionSchema,
  UserSessionSchema as UserSessionSchemaDefinition,
} from './schemas/user-session.schema';
import { AuditLogsModule } from '../audit-logs/audit-logs.module';

// Dynamic import to handle missing secrets.config gracefully
let loadSecrets: (() => any) | undefined;
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  loadSecrets = require('../config/secrets.config').loadSecrets;
} catch {
  // Secrets config not available, will use env vars
  loadSecrets = undefined;
}

@Module({
  imports: [
    AuditLogsModule,
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.register({
      secret: (() => {
        try {
          if (loadSecrets) {
            const secrets = loadSecrets();
            return secrets.jwt.secret;
          }
        } catch (error) {
          // Fallback to environment variable
        }

        // Fallback to environment variable for development
        const secret = process.env.JWT_SECRET;
        if (!secret) {
          throw new Error(
            'JWT_SECRET configuration failed. ' +
              'For production: ensure secrets are configured via production-secrets.sh script. ' +
              'For development: set JWT_SECRET environment variable.',
          );
        }
        if (secret.length < 32) {
          throw new Error(
            'JWT_SECRET must be at least 32 characters long for security. ' +
              'Please use a strong, randomly generated secret key.',
          );
        }
        return secret;
      })(),
      signOptions: {
        expiresIn: (() => {
          try {
            if (loadSecrets) {
              const secrets = loadSecrets();
              return secrets.jwt.expiresIn;
            }
          } catch (error) {
            // Fallback to environment variable
          }
          return process.env.JWT_EXPIRES_IN || '1h';
        })(),
      },
    }),
    MongooseModule.forFeature([
      { name: UserSchema.name, schema: UserSchemaDefinition },
      { name: UserSessionSchema.name, schema: UserSessionSchemaDefinition },
    ]),
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    JwtStrategy,
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
    RolesGuard,
  ],
  exports: [AuthService, JwtModule],
})
export class AuthModule {}
