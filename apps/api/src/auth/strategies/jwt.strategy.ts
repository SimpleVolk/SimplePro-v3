import { Injectable, UnauthorizedException, Logger } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { AuthService } from '../auth.service';
import { JwtPayload, User } from '../interfaces/user.interface';

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
export class JwtStrategy extends PassportStrategy(Strategy) {
  private readonly logger = new Logger(JwtStrategy.name);

  constructor(private authService: AuthService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: (() => {
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
            'For development: set JWT_SECRET environment variable.'
          );
        }
        if (secret.length < 32) {
          throw new Error(
            'JWT_SECRET must be at least 32 characters long for security. ' +
            'Please use a strong, randomly generated secret key.'
          );
        }
        return secret;
      })(),
    });
  }

  async validate(payload: JwtPayload): Promise<User> {
    this.logger.debug(`JWT validation started for user: ${payload.sub}`);

    try {
      const user = await this.authService.validateUser(payload);
      if (!user) {
        this.logger.warn(`JWT validation failed: User ${payload.sub} not found or deactivated`);
        throw new UnauthorizedException('Invalid token or user deactivated');
      }

      this.logger.debug(`JWT validation successful for user: ${payload.sub}`);
      return user;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error(`JWT validation error for user ${payload.sub}:`, errorMessage);
      throw error;
    }
  }
}