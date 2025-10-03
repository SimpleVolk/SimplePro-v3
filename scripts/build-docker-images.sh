#!/bin/bash

# SimplePro Docker Image Build Script
# This script builds production Docker images with proper versioning and metadata

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}SimplePro Docker Image Builder${NC}"
echo "================================"
echo ""

# Get version information
VERSION=${VERSION:-$(git describe --tags --always --dirty 2>/dev/null || echo "dev")}
BUILD_DATE=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
VCS_REF=$(git rev-parse HEAD 2>/dev/null || echo "unknown")

echo "Build Information:"
echo "  Version: $VERSION"
echo "  Build Date: $BUILD_DATE"
echo "  Git Commit: $VCS_REF"
echo ""

# Parse command line arguments
SERVICE="${1:-all}"
REGISTRY="${REGISTRY:-ghcr.io/simplepro}"
PUSH="${PUSH:-false}"
PLATFORMS="${PLATFORMS:-linux/amd64}"

# Function to build a service
build_service() {
    local service=$1
    local dockerfile=$2

    echo -e "${YELLOW}Building ${service}...${NC}"

    docker build \
        --build-arg BUILD_DATE="$BUILD_DATE" \
        --build-arg VCS_REF="$VCS_REF" \
        --build-arg VERSION="$VERSION" \
        --file "$dockerfile" \
        --tag "simplepro-${service}:${VERSION}" \
        --tag "simplepro-${service}:latest" \
        .

    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✓ ${service} build successful${NC}"

        # Show image size
        IMAGE_SIZE=$(docker images simplepro-${service}:latest --format "{{.Size}}")
        echo "  Image size: $IMAGE_SIZE"

        # Tag for registry if needed
        if [ "$PUSH" = "true" ]; then
            echo "  Tagging for registry: ${REGISTRY}/${service}:${VERSION}"
            docker tag "simplepro-${service}:${VERSION}" "${REGISTRY}/${service}:${VERSION}"
            docker tag "simplepro-${service}:${VERSION}" "${REGISTRY}/${service}:latest"
        fi
    else
        echo -e "${RED}✗ ${service} build failed${NC}"
        return 1
    fi
    echo ""
}

# Build services based on argument
case $SERVICE in
    api)
        build_service "api" "apps/api/Dockerfile"
        ;;
    web)
        build_service "web" "apps/web/Dockerfile"
        ;;
    all)
        build_service "api" "apps/api/Dockerfile"
        build_service "web" "apps/web/Dockerfile"
        ;;
    *)
        echo -e "${RED}Unknown service: $SERVICE${NC}"
        echo "Usage: $0 [api|web|all]"
        echo ""
        echo "Environment variables:"
        echo "  VERSION     - Version tag (default: git describe)"
        echo "  REGISTRY    - Container registry (default: ghcr.io/simplepro)"
        echo "  PUSH        - Push to registry (default: false)"
        echo "  PLATFORMS   - Target platforms (default: linux/amd64)"
        echo ""
        echo "Examples:"
        echo "  $0 api                    # Build API only"
        echo "  $0 web                    # Build Web only"
        echo "  $0 all                    # Build all services"
        echo "  VERSION=1.2.3 $0 all      # Build with specific version"
        echo "  PUSH=true $0 all          # Build and tag for registry"
        exit 1
        ;;
esac

# Push images if requested
if [ "$PUSH" = "true" ]; then
    echo -e "${YELLOW}Pushing images to registry...${NC}"

    if [ "$SERVICE" = "all" ] || [ "$SERVICE" = "api" ]; then
        docker push "${REGISTRY}/api:${VERSION}"
        docker push "${REGISTRY}/api:latest"
        echo -e "${GREEN}✓ Pushed API images${NC}"
    fi

    if [ "$SERVICE" = "all" ] || [ "$SERVICE" = "web" ]; then
        docker push "${REGISTRY}/web:${VERSION}"
        docker push "${REGISTRY}/web:latest"
        echo -e "${GREEN}✓ Pushed Web images${NC}"
    fi
    echo ""
fi

# Summary
echo -e "${GREEN}Build Complete!${NC}"
echo ""
echo "Built images:"
docker images | grep simplepro | head -10
echo ""
echo "Next steps:"
echo "  1. Test locally: docker-compose -f docker-compose.prod.yml up -d"
echo "  2. Push to registry: PUSH=true $0 $SERVICE"
echo "  3. Deploy to production: See docs/deployment/DOCKER_DEPLOYMENT_GUIDE.md"
