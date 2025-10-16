# ---------- Stage 1: Builder (install dev deps; compile with Nx) ----------
FROM node:20-bullseye AS builder
WORKDIR /workspace

# Native build deps (more reliable on ARM64 than Alpine)
RUN apt-get update && apt-get install -y python3 make g++ && rm -rf /var/lib/apt/lists/*

# Give Node more headroom (helpful on low-RAM machines too)
ENV NODE_OPTIONS="--max-old-space-size=1536"

# Copy minimal files first to maximize layer cache
COPY package.json package-lock.json ./
COPY nx.json tsconfig.base.json ./

# IMPORTANT: copy the WHOLE repo so Nx can resolve workspace libs/packages
COPY . .

# Install ALL deps (dev + prod). Use --legacy-peer-deps to bypass your peer conflicts.
# If you later fix the repo's deps, switch back to: npm ci --no-audit --no-fund
RUN npm install --no-audit --no-fund --legacy-peer-deps

# If you use Prisma, uncomment:
# RUN npx prisma generate

# Build API with Nx (no NODE_ENV=production here!)
RUN npx nx build api --configuration=production --skip-nx-cache --verbose --stats-error-details


# ---------- Stage 2: Production deps only ----------
FROM node:20-alpine AS prod-deps
WORKDIR /app
RUN apk add --no-cache python3 make g++
COPY package.json package-lock.json ./
# Prod deps only for runtime image
RUN npm ci --omit=dev --no-audit --no-fund && rm -rf /root/.npm /tmp/*


# ---------- Stage 3: Runtime ----------
FROM node:20-alpine AS production
WORKDIR /app
RUN apk add --no-cache curl tini ca-certificates tzdata

ENV TZ=UTC
ENV NODE_ENV=production
ENV PORT=4000

# Non-root user
RUN addgroup -g 1001 -S nodejs && adduser -S nodeuser -u 1001 -G nodejs

# Copy compiled app and prod node_modules
COPY --from=builder  /workspace/dist/apps/api ./        # dist contains main.js, assets, etc.
COPY --from=prod-deps /app/node_modules ./node_modules

# Permissions
RUN mkdir -p /app/logs /app/uploads && chown -R nodeuser:nodejs /app && chmod -R 755 /app
USER nodeuser

EXPOSE 4000

# Healthcheck
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
  CMD curl -f http://localhost:4000/api/health || exit 1

ENTRYPOINT ["/sbin/tini","--"]
# We copied dist/apps/api/* into /app, so main.js is at /app/main.js
CMD ["node","main.js"]