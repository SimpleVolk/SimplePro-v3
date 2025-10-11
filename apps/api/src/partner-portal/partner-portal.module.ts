import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { PartnerPortalController } from './partner-portal.controller';
import { PartnersModule } from '../partners/partners.module';
import { ReferralsModule } from '../referrals/referrals.module';
import { PartnerJwtStrategy } from '../auth/strategies/partner-jwt.strategy';

@Module({
  imports: [
    ConfigModule,
    PartnersModule,
    ReferralsModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET'),
        signOptions: { expiresIn: '8h' },
      }),
      inject: [ConfigService],
    }),
  ],
  controllers: [PartnerPortalController],
  providers: [PartnerJwtStrategy],
})
export class PartnerPortalModule {}
