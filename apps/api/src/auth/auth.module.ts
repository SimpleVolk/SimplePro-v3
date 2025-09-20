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
import { User as UserSchema, UserSchema as UserSchemaDefinition } from './schemas/user.schema';
import { UserSession as UserSessionSchema, UserSessionSchema as UserSessionSchemaDefinition } from './schemas/user-session.schema';

@Module({
  imports: [
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.register({
      secret: process.env.JWT_SECRET || 'simplepro-development-secret-key-change-in-production',
      signOptions: {
        expiresIn: '1h',
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