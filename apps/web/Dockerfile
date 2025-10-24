# Multi-stage build for Next.js web app using standalone mode
# Stage 1: Dependencies
FROM node:20-alpine AS dependencies

# Build arguments for versioning
ARG BUILD_DATE
ARG VCS_REF
ARG VERSION=1.0.0

# Install build dependencies
RUN apk add --no-cache python3 make g++ libc6-compat

# Set working directory
WORKDIR /app

# Copy package files for dependency installation
COPY package*.json ./
COPY nx.json ./
COPY tsconfig.base.json ./
COPY .eslintrc.json ./

# Install all dependencies
RUN npm ci --legacy-peer-deps && npm cache clean --force

# Stage 2: Builder
FROM node:20-alpine AS builder

# Install build dependencies
RUN apk add --no-cache python3 make g++ libc6-compat

WORKDIR /app

# Copy minimal files first (cache layer)
COPY package.json package-lock.json ./
COPY nx.json tsconfig.base.json .eslintrc.json ./

# Copy full repo so NX can resolve workspaces/libs
COPY . .

# Install all dependencies (this will create proper workspace symlinks)
RUN npm ci --legacy-peer-deps && npm cache clean --force

# Set environment variables for build
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Build the application with NX
RUN npx nx build web --configuration=production

# Verify standalone build output
RUN ls -la /app/apps/web/.next/standalone || echo "Standalone output not found, checking dist..."
RUN ls -la /app/dist/apps/web || echo "Build output verification"

# Stage 3: Production
FROM node:20-alpine AS production

# Build arguments for metadata
ARG BUILD_DATE
ARG VCS_REF
ARG VERSION=1.0.0
ARG NEXT_PUBLIC_API_URL=http://localhost:3001

# Install runtime dependencies
RUN apk add --no-cache curl tini ca-certificates tzdata && \
    rm -rf /var/cache/apk/*

# Set timezone to UTC
ENV TZ=UTC

# Create app directory
WORKDIR /app

# Create non-root user with specific UID/GID
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nextjs -u 1001 -G nodejs

# Copy built Next.js standalone output
# Next.js creates a standalone folder with minimal dependencies
COPY --from=builder /app/apps/web/.next/standalone ./
COPY --from=builder /app/apps/web/.next/static ./apps/web/.next/static
COPY --from=builder /app/apps/web/public ./apps/web/public

# Set proper ownership
RUN chown -R nextjs:nodejs /app

# Set environment variables
ENV NODE_ENV=production \
    PORT=3009 \
    HOSTNAME="0.0.0.0" \
    NEXT_TELEMETRY_DISABLED=1

# Switch to non-root user
USER nextjs

# Expose port (using 3009 to match development setup)
EXPOSE 3009

# Add comprehensive metadata labels
LABEL org.opencontainers.image.title="SimplePro Web" \
      org.opencontainers.image.description="SimplePro Moving Company Management Web Dashboard" \
      org.opencontainers.image.version="${VERSION}" \
      org.opencontainers.image.created="${BUILD_DATE}" \
      org.opencontainers.image.revision="${VCS_REF}" \
      org.opencontainers.image.vendor="Simple Moves" \
      org.opencontainers.image.licenses="PROPRIETARY" \
      security.non-root="true" \
      security.no-new-privileges="true" \
      maintainer="Simple Moves DevOps <devops@simplemoves.com>"

# Health check - verify web app is responding
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD curl -f http://localhost:3009/ || exit 1

# Use tini as init process for proper signal handling
ENTRYPOINT ["/sbin/tini", "--"]

# Start Next.js server using standalone mode
CMD ["node", "apps/web/server.js"]