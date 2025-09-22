# Multi-stage build for NestJS API
FROM node:20-alpine AS dependencies

# Install build dependencies
RUN apk add --no-cache python3 make g++

# Set working directory
WORKDIR /app

# Copy package files for dependency installation
COPY package*.json ./
COPY nx.json ./
COPY tsconfig.base.json ./

# Install all dependencies (including dev dependencies for build)
RUN npm ci && npm cache clean --force

# Builder stage
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

# Build the application
RUN npx nx build api --prod

# Create production dependencies
FROM node:20-alpine AS prod-deps

# Install build dependencies
RUN apk add --no-cache python3 make g++

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install only production dependencies
RUN npm ci --only=production --ignore-scripts && npm cache clean --force

# Production stage
FROM node:20-alpine AS production

# Install runtime dependencies
RUN apk add --no-cache curl tini

# Create app directory
WORKDIR /app

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodeuser -u 1001 -G nodejs

# Copy built application
COPY --from=builder /app/dist/apps/api ./
COPY --from=prod-deps /app/node_modules ./node_modules

# Create logs directory
RUN mkdir -p /app/logs && \
    chown -R nodeuser:nodejs /app

# Switch to non-root user
USER nodeuser

# Expose port
EXPOSE 4000

# Add security labels
LABEL security.non-root=true
LABEL security.no-new-privileges=true

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
  CMD curl -f http://localhost:4000/api/health || exit 1

# Use tini as init process for proper signal handling
ENTRYPOINT ["/sbin/tini", "--"]

# Start the application
CMD ["node", "main.js"]