import { validateEnvironment } from './env.validation';

describe('Environment Validation', () => {
  describe('Development Environment', () => {
    it('should validate minimum required variables', () => {
      const env = {
        NODE_ENV: 'development',
        MONGODB_URI: 'mongodb://localhost:27017/test',
        REDIS_HOST: 'localhost',
        REDIS_PASSWORD: 'test_password_12345',
        JWT_SECRET: 'test_jwt_secret_that_is_long_enough_32_chars',
        JWT_REFRESH_SECRET: 'different_refresh_secret_long_enough_32_chars',
      };

      expect(() => validateEnvironment(env)).not.toThrow();
    });

    it('should fail without required variables', () => {
      const env = {
        NODE_ENV: 'development',
      };

      expect(() => validateEnvironment(env)).toThrow();
    });

    it('should accept 32-character secrets in development', () => {
      const env = {
        NODE_ENV: 'development',
        MONGODB_URI: 'mongodb://localhost:27017/test',
        REDIS_HOST: 'localhost',
        REDIS_PASSWORD: 'test_password_12345',
        JWT_SECRET: '12345678901234567890123456789012', // exactly 32 chars
        JWT_REFRESH_SECRET: 'abcdefghijklmnopqrstuvwxyz012345', // exactly 32 chars
      };

      expect(() => validateEnvironment(env)).not.toThrow();
    });
  });

  describe('Production Environment', () => {
    it('should require 64-character secrets', () => {
      const env = {
        NODE_ENV: 'production',
        MONGODB_URI: 'mongodb://prod:password@host:27017/db',
        REDIS_HOST: 'redis.prod.com',
        REDIS_PASSWORD: 'strong_random_password_32_chars_long',
        JWT_SECRET: '12345678901234567890123456789012', // only 32 chars
        JWT_REFRESH_SECRET: 'abcdefghijklmnopqrstuvwxyz012345', // only 32 chars
        API_BASE_URL: 'https://api.example.com',
        WEB_APP_URL: 'https://app.example.com',
        ALLOWED_ORIGINS: 'https://app.example.com',
        SESSION_SECRET: '1234567890123456789012345678901234567890123456789012345678901234',
      };

      expect(() => validateEnvironment(env)).toThrow('64 characters');
    });

    it('should reject HTTP URLs in production', () => {
      const env = {
        NODE_ENV: 'production',
        MONGODB_URI: 'mongodb://prod:password@host:27017/db',
        REDIS_HOST: 'redis.prod.com',
        REDIS_PASSWORD: 'strong_random_password_32_chars_long',
        JWT_SECRET: '1234567890123456789012345678901234567890123456789012345678901234',
        JWT_REFRESH_SECRET: 'abcdefghijklmnopqrstuvwxyz0123456789012345678901234567890123456789',
        API_BASE_URL: 'http://api.example.com', // HTTP not HTTPS
        WEB_APP_URL: 'https://app.example.com',
        ALLOWED_ORIGINS: 'https://app.example.com',
        SESSION_SECRET: '1234567890123456789012345678901234567890123456789012345678901234',
      };

      expect(() => validateEnvironment(env)).toThrow('HTTPS');
    });

    it('should require ALLOWED_ORIGINS to be set', () => {
      const env = {
        NODE_ENV: 'production',
        MONGODB_URI: 'mongodb://prod:password@host:27017/db',
        REDIS_HOST: 'redis.prod.com',
        REDIS_PASSWORD: 'strong_random_password_32_chars_long',
        JWT_SECRET: '1234567890123456789012345678901234567890123456789012345678901234',
        JWT_REFRESH_SECRET: 'abcdefghijklmnopqrstuvwxyz0123456789012345678901234567890123456789',
        API_BASE_URL: 'https://api.example.com',
        WEB_APP_URL: 'https://app.example.com',
        SESSION_SECRET: '1234567890123456789012345678901234567890123456789012345678901234',
        // ALLOWED_ORIGINS missing
      };

      expect(() => validateEnvironment(env)).toThrow();
    });

    it('should reject wildcard in ALLOWED_ORIGINS', () => {
      const env = {
        NODE_ENV: 'production',
        MONGODB_URI: 'mongodb://prod:password@host:27017/db',
        REDIS_HOST: 'redis.prod.com',
        REDIS_PASSWORD: 'strong_random_password_32_chars_long',
        JWT_SECRET: '1234567890123456789012345678901234567890123456789012345678901234',
        JWT_REFRESH_SECRET: 'abcdefghijklmnopqrstuvwxyz0123456789012345678901234567890123456789',
        API_BASE_URL: 'https://api.example.com',
        WEB_APP_URL: 'https://app.example.com',
        ALLOWED_ORIGINS: '*', // Wildcard not allowed
        SESSION_SECRET: '1234567890123456789012345678901234567890123456789012345678901234',
      };

      expect(() => validateEnvironment(env)).toThrow('wildcards');
    });

    it('should reject DEBUG_MODE=true', () => {
      const env = {
        NODE_ENV: 'production',
        MONGODB_URI: 'mongodb://prod:password@host:27017/db',
        REDIS_HOST: 'redis.prod.com',
        REDIS_PASSWORD: 'strong_random_password_32_chars_long',
        JWT_SECRET: '1234567890123456789012345678901234567890123456789012345678901234',
        JWT_REFRESH_SECRET: 'abcdefghijklmnopqrstuvwxyz0123456789012345678901234567890123456789',
        API_BASE_URL: 'https://api.example.com',
        WEB_APP_URL: 'https://app.example.com',
        ALLOWED_ORIGINS: 'https://app.example.com',
        SESSION_SECRET: '1234567890123456789012345678901234567890123456789012345678901234',
        DEBUG_MODE: 'true', // Should be false
      };

      expect(() => validateEnvironment(env)).toThrow('DEBUG_MODE');
    });

    it('should reject SEED_DATA=true', () => {
      const env = {
        NODE_ENV: 'production',
        MONGODB_URI: 'mongodb://prod:password@host:27017/db',
        REDIS_HOST: 'redis.prod.com',
        REDIS_PASSWORD: 'strong_random_password_32_chars_long',
        JWT_SECRET: '1234567890123456789012345678901234567890123456789012345678901234',
        JWT_REFRESH_SECRET: 'abcdefghijklmnopqrstuvwxyz0123456789012345678901234567890123456789',
        API_BASE_URL: 'https://api.example.com',
        WEB_APP_URL: 'https://app.example.com',
        ALLOWED_ORIGINS: 'https://app.example.com',
        SESSION_SECRET: '1234567890123456789012345678901234567890123456789012345678901234',
        SEED_DATA: 'true', // Should be false
      };

      expect(() => validateEnvironment(env)).toThrow('SEED_DATA');
    });

    it('should reject identical JWT secrets', () => {
      const secret = '1234567890123456789012345678901234567890123456789012345678901234';
      const env = {
        NODE_ENV: 'production',
        MONGODB_URI: 'mongodb://prod:password@host:27017/db',
        REDIS_HOST: 'redis.prod.com',
        REDIS_PASSWORD: 'strong_random_password_32_chars_long',
        JWT_SECRET: secret,
        JWT_REFRESH_SECRET: secret, // Same as JWT_SECRET
        API_BASE_URL: 'https://api.example.com',
        WEB_APP_URL: 'https://app.example.com',
        ALLOWED_ORIGINS: 'https://app.example.com',
        SESSION_SECRET: '1234567890123456789012345678901234567890123456789012345678901234',
      };

      expect(() => validateEnvironment(env)).toThrow('different');
    });

    it('should reject secrets with dev patterns', () => {
      const env = {
        NODE_ENV: 'production',
        MONGODB_URI: 'mongodb://prod:password@host:27017/db',
        REDIS_HOST: 'redis.prod.com',
        REDIS_PASSWORD: 'strong_random_password_32_chars_long',
        JWT_SECRET: 'dev_secret_1234567890123456789012345678901234567890123456789012',
        JWT_REFRESH_SECRET: 'abcdefghijklmnopqrstuvwxyz0123456789012345678901234567890123456789',
        API_BASE_URL: 'https://api.example.com',
        WEB_APP_URL: 'https://app.example.com',
        ALLOWED_ORIGINS: 'https://app.example.com',
        SESSION_SECRET: '1234567890123456789012345678901234567890123456789012345678901234',
      };

      expect(() => validateEnvironment(env)).toThrow('dev');
    });

    it('should require SESSION_COOKIE_SECURE=true', () => {
      const env = {
        NODE_ENV: 'production',
        MONGODB_URI: 'mongodb://prod:password@host:27017/db',
        REDIS_HOST: 'redis.prod.com',
        REDIS_PASSWORD: 'strong_random_password_32_chars_long',
        JWT_SECRET: '1234567890123456789012345678901234567890123456789012345678901234',
        JWT_REFRESH_SECRET: 'abcdefghijklmnopqrstuvwxyz0123456789012345678901234567890123456789',
        API_BASE_URL: 'https://api.example.com',
        WEB_APP_URL: 'https://app.example.com',
        ALLOWED_ORIGINS: 'https://app.example.com',
        SESSION_SECRET: '1234567890123456789012345678901234567890123456789012345678901234',
        SESSION_COOKIE_SECURE: 'false', // Should be true
      };

      expect(() => validateEnvironment(env)).toThrow('SESSION_COOKIE_SECURE');
    });

    it('should require STORAGE_USE_SSL=true', () => {
      const env = {
        NODE_ENV: 'production',
        MONGODB_URI: 'mongodb://prod:password@host:27017/db',
        REDIS_HOST: 'redis.prod.com',
        REDIS_PASSWORD: 'strong_random_password_32_chars_long',
        JWT_SECRET: '1234567890123456789012345678901234567890123456789012345678901234',
        JWT_REFRESH_SECRET: 'abcdefghijklmnopqrstuvwxyz0123456789012345678901234567890123456789',
        API_BASE_URL: 'https://api.example.com',
        WEB_APP_URL: 'https://app.example.com',
        ALLOWED_ORIGINS: 'https://app.example.com',
        SESSION_SECRET: '1234567890123456789012345678901234567890123456789012345678901234',
        STORAGE_USE_SSL: 'false', // Should be true
      };

      expect(() => validateEnvironment(env)).toThrow('STORAGE_USE_SSL');
    });

    it('should validate complete production config', () => {
      const env = {
        NODE_ENV: 'production',
        MONGODB_URI: 'mongodb://prod:SecurePass123!@#$@host:27017/db?ssl=true',
        REDIS_HOST: 'redis.prod.com',
        REDIS_PASSWORD: 'SecureRandomPassword123!@#$%^&*',
        REDIS_TLS_ENABLED: 'true',
        JWT_SECRET: 'a'.repeat(64), // 64 random chars
        JWT_REFRESH_SECRET: 'b'.repeat(64), // Different 64 chars
        API_BASE_URL: 'https://api.example.com',
        WEB_APP_URL: 'https://app.example.com',
        ALLOWED_ORIGINS: 'https://app.example.com',
        SESSION_SECRET: 'c'.repeat(64),
        SESSION_COOKIE_SECURE: 'true',
        STORAGE_USE_SSL: 'true',
        DEBUG_MODE: 'false',
        SEED_DATA: 'false',
      };

      expect(() => validateEnvironment(env)).not.toThrow();
    });
  });

  describe('Staging Environment', () => {
    it('should accept staging configuration', () => {
      const env = {
        NODE_ENV: 'staging',
        MONGODB_URI: 'mongodb://staging:password@host:27017/db',
        REDIS_HOST: 'redis.staging.com',
        REDIS_PASSWORD: 'staging_password_12345678',
        JWT_SECRET: '1234567890123456789012345678901234567890123456789012345678901234',
        JWT_REFRESH_SECRET: 'abcdefghijklmnopqrstuvwxyz0123456789012345678901234567890123456789',
      };

      expect(() => validateEnvironment(env)).not.toThrow();
    });
  });

  describe('Type Transformations', () => {
    it('should transform string numbers to integers', () => {
      const env = {
        NODE_ENV: 'development',
        PORT: '3001',
        MONGODB_URI: 'mongodb://localhost:27017/test',
        REDIS_HOST: 'localhost',
        REDIS_PORT: '6379',
        REDIS_PASSWORD: 'test_password_12345',
        JWT_SECRET: 'test_jwt_secret_that_is_long_enough_32_chars',
        JWT_REFRESH_SECRET: 'different_refresh_secret_long_enough_32_chars',
      };

      const validated = validateEnvironment(env);
      expect(typeof validated.PORT).toBe('number');
      expect(validated.PORT).toBe(3001);
      expect(typeof validated.REDIS_PORT).toBe('number');
      expect(validated.REDIS_PORT).toBe(6379);
    });

    it('should transform string booleans', () => {
      const env = {
        NODE_ENV: 'development',
        MONGODB_URI: 'mongodb://localhost:27017/test',
        REDIS_HOST: 'localhost',
        REDIS_PASSWORD: 'test_password_12345',
        REDIS_TLS_ENABLED: 'true',
        JWT_SECRET: 'test_jwt_secret_that_is_long_enough_32_chars',
        JWT_REFRESH_SECRET: 'different_refresh_secret_long_enough_32_chars',
        DEBUG_MODE: 'false',
      };

      const validated = validateEnvironment(env);
      expect(typeof validated.REDIS_TLS_ENABLED).toBe('boolean');
      expect(validated.REDIS_TLS_ENABLED).toBe(true);
      expect(typeof validated.DEBUG_MODE).toBe('boolean');
      expect(validated.DEBUG_MODE).toBe(false);
    });
  });
});
