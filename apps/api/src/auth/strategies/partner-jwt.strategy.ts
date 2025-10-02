import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { PartnersService } from '../../partners/partners.service';

@Injectable()
export class PartnerJwtStrategy extends PassportStrategy(Strategy, 'partner-jwt') {
  constructor(
    configService: ConfigService,
    private partnersService: PartnersService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('JWT_SECRET') || 'default-secret-key',
    });
  }

  async validate(payload: any) {
    // Validate that this is a partner token
    if (payload.type !== 'partner') {
      throw new UnauthorizedException('Invalid token type');
    }

    // Fetch partner details
    const partner = await this.partnersService.findById(payload.partnerId);

    if (!partner || partner.status !== 'active' || !partner.portalAccess.enabled) {
      throw new UnauthorizedException('Partner portal access is disabled');
    }

    return {
      partnerId: payload.partnerId,
      partnerEmail: payload.email,
      companyName: partner.companyName,
      type: 'partner'
    };
  }
}
