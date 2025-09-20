#!/bin/bash

# SimplePro-v3 Production Deployment Script

set -e

echo "🚀 Starting SimplePro-v3 Production Deployment..."

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo "❌ Docker is not running. Please start Docker and try again."
    exit 1
fi

# Check for production environment file
if [ ! -f .env.production ]; then
    echo "❌ .env.production file not found!"
    echo "Please create .env.production with your production configuration."
    exit 1
fi

# Load environment variables
export $(cat .env.production | grep -v '^#' | xargs)
echo "✅ Loaded production environment variables"

# Security check - ensure secrets are set
if [ "$JWT_SECRET" = "your_super_secure_jwt_secret_here_minimum_32_characters" ]; then
    echo "❌ Please update JWT_SECRET in .env.production"
    exit 1
fi

if [ "$MONGODB_PASSWORD" = "your_secure_mongodb_password_here" ]; then
    echo "❌ Please update MONGODB_PASSWORD in .env.production"
    exit 1
fi

# Build applications
echo "🏗️  Building applications..."
npm run build

# Stop existing containers
echo "🛑 Stopping existing containers..."
docker-compose -f docker-compose.prod.yml down

# Build and start services
echo "🔧 Building and starting production services..."
docker-compose -f docker-compose.prod.yml up -d --build

# Wait for services to be healthy
echo "⏳ Waiting for services to be ready..."
sleep 30

# Check service health
echo "🔍 Checking service health..."
docker-compose -f docker-compose.prod.yml ps

# Show service URLs
echo ""
echo "✅ SimplePro-v3 Production Environment is ready!"
echo ""
echo "🌐 Available Services:"
echo "   Application: http://localhost (nginx reverse proxy)"
echo "   API:         http://localhost/api"
echo "   MinIO:       http://localhost:9000"
echo "   Grafana:     http://localhost:3001"
echo "   Prometheus:  http://localhost:9090"
echo ""
echo "📝 Logs: docker-compose -f docker-compose.prod.yml logs -f"
echo "🛑 Stop: docker-compose -f docker-compose.prod.yml down"
echo ""
echo "🔐 Security:"
echo "   - Change default passwords in .env.production"
echo "   - Configure SSL certificates for HTTPS"
echo "   - Set up proper firewall rules"
echo "   - Configure backup procedures"