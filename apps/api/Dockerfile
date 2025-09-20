# Multi-stage build for NestJS API
FROM node:20-alpine AS builder

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./
COPY nx.json ./
COPY tsconfig.base.json ./

# Copy app source
COPY apps/api ./apps/api
COPY packages ./packages

# Install dependencies
RUN npm ci --only=production && npm cache clean --force

# Build the application
RUN npx nx build api --prod

# Production stage
FROM node:20-alpine AS production

# Create app directory
WORKDIR /app

# Copy built application
COPY --from=builder /app/dist/apps/api ./
COPY --from=builder /app/node_modules ./node_modules

# Create non-root user
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nextjs -u 1001

# Change ownership
RUN chown -R nextjs:nodejs /app
USER nextjs

# Expose port
EXPOSE 4000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node healthcheck.js

# Start the application
CMD ["node", "main.js"]