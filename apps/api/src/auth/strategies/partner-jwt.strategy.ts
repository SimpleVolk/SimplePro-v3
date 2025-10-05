import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { PartnersService } from '../../partners/partners.service';

// Dynamic import to handle missing secrets.config gracefully
let loadSecrets: (() => any) | undefined;
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  loadSecrets = require('../../config/secrets.config').loadSecrets;
} catch {
  // Secrets config not available, will use env vars
  loadSecrets = undefined;
}

@Injectable()
export class PartnerJwtStrategy extends PassportStrategy(Strategy, 'partner-jwt') {

  constructor(
    configService: ConfigService,
    private partnersService: PartnersService,
  ) {
    const secret = (() => {
      try {
        if (loadSecrets) {
          const secrets = loadSecrets();
          return secrets.jwt.secret;
        }
      } catch (error) {
        // Fallback to environment variable
      }

      // Fallback to environment variable for development
      const envSecret = configService.get<string>('JWT_SECRET');
      if (!envSecret) {
        throw new Error(
          'JWT_SECRET configuration failed for Partner Portal. ' +
          'For production: ensure secrets are configured via production-secrets.sh script. ' +
          'For development: set JWT_SECRET environment variable.'
        );
      }
      if (envSecret.length < 32) {
        throw new Error(
          'JWT_SECRET must be at least 32 characters long for security. ' +
          'Please use a strong, randomly generated secret key.'
        );
      }
      return envSecret;
    })();

    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: secret,
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
