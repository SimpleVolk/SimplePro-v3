# Multi-stage build for Next.js web app
FROM node:20-alpine AS builder

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./
COPY nx.json ./
COPY tsconfig.base.json ./

# Copy app source
COPY apps/web ./apps/web
COPY packages ./packages

# Install dependencies
RUN npm ci && npm cache clean --force

# Build the application
RUN npx nx build web --prod

# Production stage
FROM node:20-alpine AS production

# Install serve to run the static files
RUN npm install -g serve

# Create app directory
WORKDIR /app

# Copy built application
COPY --from=builder /app/dist/apps/web .

# Create non-root user
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nextjs -u 1001

# Change ownership
RUN chown -R nextjs:nodejs /app
USER nextjs

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:3000/ || exit 1

# Start the application
CMD ["serve", "-s", ".", "-l", "3000"]