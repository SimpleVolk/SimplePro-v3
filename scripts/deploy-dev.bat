@echo off
REM SimplePro-v3 Development Deployment Script for Windows

echo 🚀 Starting SimplePro-v3 Development Environment...

REM Check if Docker is running
docker info >nul 2>&1
if errorlevel 1 (
    echo ❌ Docker is not running. Please start Docker and try again.
    exit /b 1
)

REM Stop any existing containers
echo 🛑 Stopping existing containers...
docker-compose -f docker-compose.dev.yml down

REM Pull latest images
echo 📥 Pulling latest Docker images...
docker-compose -f docker-compose.dev.yml pull

REM Start infrastructure services
echo 🔧 Starting infrastructure services...
docker-compose -f docker-compose.dev.yml up -d

REM Wait for services to be healthy
echo ⏳ Waiting for services to be ready...
timeout /t 10 /nobreak >nul

REM Check service health
echo 🔍 Checking service health...
docker-compose -f docker-compose.dev.yml ps

REM Show service URLs
echo.
echo ✅ SimplePro-v3 Development Environment is ready!
echo.
echo 📊 Available Services:
echo    MongoDB:    http://localhost:27017
echo    Redis:      http://localhost:6379
echo    MinIO:      http://localhost:9000 (Console: http://localhost:9001)
echo    MailHog:    http://localhost:8025
echo.
echo 🏗️  To start the applications:
echo    API:        npm run dev:api
echo    Web:        npm run dev:web
echo.
echo 📝 Logs: docker-compose -f docker-compose.dev.yml logs -f
echo 🛑 Stop: docker-compose -f docker-compose.dev.yml down

pause