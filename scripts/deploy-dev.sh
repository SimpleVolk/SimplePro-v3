#!/bin/bash

# SimplePro-v3 Development Deployment Script

set -e

echo "🚀 Starting SimplePro-v3 Development Environment..."

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo "❌ Docker is not running. Please start Docker and try again."
    exit 1
fi

# Load environment variables
if [ -f .env.local ]; then
    export $(cat .env.local | grep -v '^#' | xargs)
    echo "✅ Loaded environment variables from .env.local"
else
    echo "⚠️  .env.local not found, using default values"
fi

# Stop any existing containers
echo "🛑 Stopping existing containers..."
docker-compose -f docker-compose.dev.yml down

# Pull latest images
echo "📥 Pulling latest Docker images..."
docker-compose -f docker-compose.dev.yml pull

# Start infrastructure services
echo "🔧 Starting infrastructure services..."
docker-compose -f docker-compose.dev.yml up -d

# Wait for services to be healthy
echo "⏳ Waiting for services to be ready..."
sleep 10

# Check service health
echo "🔍 Checking service health..."
docker-compose -f docker-compose.dev.yml ps

# Show service URLs
echo ""
echo "✅ SimplePro-v3 Development Environment is ready!"
echo ""
echo "📊 Available Services:"
echo "   MongoDB:    http://localhost:27017"
echo "   Redis:      http://localhost:6379"
echo "   MinIO:      http://localhost:9000 (Console: http://localhost:9001)"
echo "   MailHog:    http://localhost:8025"
echo ""
echo "🏗️  To start the applications:"
echo "   API:        npm run dev:api"
echo "   Web:        npm run dev:web"
echo ""
echo "📝 Logs: docker-compose -f docker-compose.dev.yml logs -f"
echo "🛑 Stop: docker-compose -f docker-compose.dev.yml down"