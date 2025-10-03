# Multi-stage build for NestJS API
# Stage 1: Dependencies
FROM node:20-alpine AS dependencies

# Build arguments for versioning
ARG BUILD_DATE
ARG VCS_REF
ARG VERSION=1.0.0

# Install build dependencies
RUN apk add --no-cache python3 make g++ curl

# Set working directory
WORKDIR /app

# Copy package files for dependency installation
COPY package*.json ./
COPY nx.json ./
COPY tsconfig.base.json ./

# Install all dependencies (including dev dependencies for build)
RUN npm ci --legacy-peer-deps && npm cache clean --force

# Stage 2: Builder
FROM node:20-alpine AS builder

# Install build dependencies
RUN apk add --no-cache python3 make g++

WORKDIR /app

# Copy dependencies from previous stage
COPY --from=dependencies /app/node_modules ./node_modules
COPY --from=dependencies /app/package*.json ./
COPY --from=dependencies /app/nx.json ./
COPY --from=dependencies /app/tsconfig.base.json ./

# Copy source code
COPY apps/api ./apps/api
COPY packages ./packages

# Set production environment
ENV NODE_ENV=production

# Build the application
RUN npx nx build api --configuration=production

# Verify build output
RUN ls -la /app/dist/apps/api

# Stage 3: Production dependencies
FROM node:20-alpine AS prod-deps

# Install build dependencies
RUN apk add --no-cache python3 make g++

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install only production dependencies
RUN npm ci --only=production --ignore-scripts --legacy-peer-deps && \
    npm cache clean --force && \
    rm -rf /root/.npm /tmp/*

# Stage 4: Production
FROM node:20-alpine AS production

# Build arguments for metadata
ARG BUILD_DATE
ARG VCS_REF
ARG VERSION=1.0.0

# Install runtime dependencies (curl for health checks, tini for signal handling)
RUN apk add --no-cache curl tini ca-certificates tzdata && \
    rm -rf /var/cache/apk/*

# Set timezone to UTC
ENV TZ=UTC

# Create app directory
WORKDIR /app

# Create non-root user with specific UID/GID
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodeuser -u 1001 -G nodejs

# Copy built application from builder
COPY --from=builder --chown=nodeuser:nodejs /app/dist/apps/api ./

# Copy production dependencies
COPY --from=prod-deps --chown=nodeuser:nodejs /app/node_modules ./node_modules

# Create necessary directories with proper permissions
RUN mkdir -p /app/logs /app/uploads && \
    chown -R nodeuser:nodejs /app && \
    chmod -R 755 /app

# Set environment variables
ENV NODE_ENV=production \
    PORT=4000 \
    LOG_LEVEL=info

# Switch to non-root user
USER nodeuser

# Expose port
EXPOSE 4000

# Add comprehensive metadata labels
LABEL org.opencontainers.image.title="SimplePro API" \
      org.opencontainers.image.description="SimplePro Moving Company Management API" \
      org.opencontainers.image.version="${VERSION}" \
      org.opencontainers.image.created="${BUILD_DATE}" \
      org.opencontainers.image.revision="${VCS_REF}" \
      org.opencontainers.image.vendor="Simple Moves" \
      org.opencontainers.image.licenses="PROPRIETARY" \
      security.non-root="true" \
      security.no-new-privileges="true" \
      maintainer="Simple Moves DevOps <devops@simplemoves.com>"

# Health check - verify API is responding
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
  CMD curl -f http://localhost:4000/api/health || exit 1

# Use tini as init process for proper signal handling
ENTRYPOINT ["/sbin/tini", "--"]

# Start the application
CMD ["node", "main.js"]