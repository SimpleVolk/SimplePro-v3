# ---------- Stage 1: Builder (dev deps present; compile) ----------
FROM node:20-bullseye AS builder
WORKDIR /workspace

# Native build deps (ARM-friendly)
RUN apt-get update && apt-get install -y python3 make g++ && rm -rf /var/lib/apt/lists/*

# Give Node some headroom
ENV NODE_OPTIONS="--max-old-space-size=1536"

# Copy minimal files first (cache)
COPY package.json package-lock.json ./
COPY nx.json tsconfig.base.json ./
# Copy full repo so Nx can resolve workspaces/libs
COPY . .

RUN set -eux; \
  mkdir -p apps/api/src/config; \
  cat > apps/api/src/config/secrets.config.ts <<'TS'
export interface SecretConfig {
  mongodb: { username: string; password: string; uri: string };
  redis: { password: string; url: string };
  jwt: { secret: string; refreshSecret: string; expiresIn: string; refreshExpiresIn: string };
  minio: { rootUser: string; rootPassword: string; browserRedirectUrl: string };
  grafana: { adminUser: string; adminPassword: string };
}
export const loadSecrets = (): SecretConfig => {
  return {
    mongodb: {
      username: process.env.MONGODB_USERNAME || 'admin',
      password: process.env.MONGODB_PASSWORD || 'password123',
      uri: process.env.MONGODB_URI || process.env.DATABASE_URL || 'mongodb://admin:password123@mongodb:27017/simplepro_prod?authSource=admin'
    },
    redis: {
      password: process.env.REDIS_PASSWORD || '',
      url: process.env.REDIS_URL || 'redis://redis:6379'
    },
    jwt: {
      secret: process.env.JWT_SECRET || 'dev-jwt-secret-min-32-chars-long',
      refreshSecret: process.env.JWT_REFRESH_SECRET || 'dev-refresh-secret-min-32-chars',
      expiresIn: process.env.JWT_EXPIRES_IN || '1h',
      refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d'
    },
    minio: {
      rootUser: process.env.MINIO_ROOT_USER || 'simplepro-admin',
      rootPassword: process.env.MINIO_ROOT_PASSWORD || 'minioadmin',
      browserRedirectUrl: process.env.MINIO_BROWSER_REDIRECT_URL || 'https://yourdomain.com:9001'
    },
    grafana: {
      adminUser: process.env.GRAFANA_ADMIN_USER || 'admin',
      adminPassword: process.env.GRAFANA_ADMIN_PASSWORD || 'admin'
    }
  };
};
export const secretsManager = { loadSecrets };
export const getSecretsConfigSummary = () => ({ environment: process.env.NODE_ENV });
TS

# (optional but recommended if you don’t commit a root tsconfig.json)
RUN [ -f tsconfig.json ] || printf '{\n  "extends": "./tsconfig.base.json",\n  "files": []\n}\n' > tsconfig.json

# Install ALL deps (use legacy to bypass peer conflicts)
RUN npm install --no-audit --no-fund --legacy-peer-deps

# If you use Prisma, uncomment:
# RUN npx prisma generate

# Build API (keep dev deps available)
RUN npx nx build api --configuration=production --skip-nx-cache --verbose --stats-error-details

# Now prune node_modules down to production-only (no re-resolve!)
RUN npm prune --omit=dev


# ---------- Stage 2: Runtime (no install; copy pruned deps) ----------
FROM node:20-alpine AS production
WORKDIR /app
RUN apk add --no-cache curl tini ca-certificates tzdata

ENV TZ=UTC
ENV NODE_ENV=production
ENV PORT=4000
EXPOSE 4000

# Non-root
RUN addgroup -g 1001 -S nodejs && adduser -S nodeuser -u 1001 -G nodejs

# Copy compiled app and pruned node_modules from builder
COPY --from=builder /workspace/dist/apps/api ./        # yields /app/main.js
COPY --from=builder /workspace/node_modules ./node_modules
COPY --from=builder /workspace/package.json ./package.json

# Permissions
RUN mkdir -p /app/logs /app/uploads && chown -R nodeuser:nodejs /app && chmod -R 755 /app
USER nodeuser

# Healthcheck
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
  CMD curl -f http://localhost:4000/api/health || exit 1

ENTRYPOINT ["/sbin/tini","--"]
CMD ["node","main.js"]
