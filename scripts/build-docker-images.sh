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
USE_BUILDX="${USE_BUILDX:-auto}"

# Detect if multi-architecture build is needed
IS_MULTI_ARCH=false
if [[ "$PLATFORMS" == *","* ]] || [[ "$PLATFORMS" == *"arm"* ]]; then
    IS_MULTI_ARCH=true
fi

# Setup Docker Buildx if needed
setup_buildx() {
    if [ "$IS_MULTI_ARCH" = true ] || [ "$USE_BUILDX" = "true" ]; then
        echo -e "${YELLOW}Setting up Docker Buildx for multi-architecture builds...${NC}"

        # Create builder if it doesn't exist
        if ! docker buildx inspect simplepro-builder >/dev/null 2>&1; then
            docker buildx create --name simplepro-builder --driver docker-container --use \
                --driver-opt network=host \
                --buildkitd-flags '--allow-insecure-entitlement network.host' \
                >/dev/null 2>&1
            echo "  Created new Buildx builder: simplepro-builder"
        else
            docker buildx use simplepro-builder >/dev/null 2>&1
            echo "  Using existing Buildx builder: simplepro-builder"
        fi

        # Bootstrap the builder
        docker buildx inspect --bootstrap >/dev/null 2>&1
        echo -e "${GREEN}✓ Buildx ready${NC}"
        echo ""
    fi
}

# Function to build a service
build_service() {
    local service=$1
    local dockerfile=$2

    echo -e "${YELLOW}Building ${service} for ${PLATFORMS}...${NC}"

    # Use Buildx for multi-arch or if explicitly requested
    if [ "$IS_MULTI_ARCH" = true ] || [ "$USE_BUILDX" = "true" ]; then
        # Buildx build command
        local buildx_args=(
            "buildx" "build"
            "--platform" "$PLATFORMS"
            "--build-arg" "BUILD_DATE=$BUILD_DATE"
            "--build-arg" "VCS_REF=$VCS_REF"
            "--build-arg" "VERSION=$VERSION"
            "--file" "$dockerfile"
            "--tag" "simplepro-${service}:${VERSION}"
            "--tag" "simplepro-${service}:latest"
            "--provenance" "false"
        )

        # Add registry tags if pushing
        if [ "$PUSH" = "true" ]; then
            buildx_args+=("--tag" "${REGISTRY}/${service}:${VERSION}")
            buildx_args+=("--tag" "${REGISTRY}/${service}:latest")
            buildx_args+=("--push")
            buildx_args+=("--output" "type=registry,push=true,compression=zstd,compression-level=3")
        else
            buildx_args+=("--load")
        fi

        buildx_args+=(".")

        docker "${buildx_args[@]}"
    else
        # Standard docker build for single platform
        docker build \
            --build-arg BUILD_DATE="$BUILD_DATE" \
            --build-arg VCS_REF="$VCS_REF" \
            --build-arg VERSION="$VERSION" \
            --file "$dockerfile" \
            --tag "simplepro-${service}:${VERSION}" \
            --tag "simplepro-${service}:latest" \
            .
    fi

    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✓ ${service} build successful${NC}"

        # Show image size (only for non-multi-arch or if not pushed)
        if [ "$IS_MULTI_ARCH" = false ] || [ "$PUSH" = false ]; then
            IMAGE_SIZE=$(docker images simplepro-${service}:latest --format "{{.Size}}" 2>/dev/null || echo "N/A")
            echo "  Image size: $IMAGE_SIZE"
        else
            echo "  Multi-arch image pushed to registry"
        fi

        # Tag for registry if needed (non-buildx push)
        if [ "$PUSH" = "true" ] && [ "$IS_MULTI_ARCH" = false ]; then
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

# Setup buildx if needed
setup_buildx

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
        echo "              - For multi-arch: linux/amd64,linux/arm64"
        echo "  USE_BUILDX  - Force Buildx usage (default: auto)"
        echo ""
        echo "Examples:"
        echo ""
        echo "  # Single architecture builds"
        echo "  bash $0 api                               # Build API for amd64"
        echo "  bash $0 web                               # Build Web for amd64"
        echo "  bash $0 all                               # Build all services for amd64"
        echo ""
        echo "  # Multi-architecture builds (Raspberry Pi) - Linux/macOS/Git Bash"
        echo "  PLATFORMS=linux/amd64,linux/arm64 bash $0 all  # Build for x86 + ARM64"
        echo "  PLATFORMS=linux/arm64 bash $0 api              # Build API for ARM64 only"
        echo ""
        echo "  # Multi-architecture builds - Windows PowerShell"
        echo "  \$env:PLATFORMS=\"linux/amd64,linux/arm64\"; bash $0 all"
        echo "  \$env:PLATFORMS=\"linux/arm64\"; bash $0 api"
        echo ""
        echo "  # Multi-architecture builds - Windows CMD"
        echo "  set PLATFORMS=linux/amd64,linux/arm64 && bash $0 all"
        echo "  set PLATFORMS=linux/arm64 && bash $0 api"
        echo ""
        echo "  # Build and push to registry"
        echo "  VERSION=1.2.3 PUSH=true bash $0 all            # Build and push amd64 (Bash)"
        echo "  \$env:PLATFORMS=\"linux/amd64,linux/arm64\"; \$env:PUSH=\"true\"; bash $0 all  # PowerShell"
        echo ""
        echo "  # Advanced options"
        echo "  USE_BUILDX=true bash $0 api                    # Force Buildx for single-arch"
        echo "  REGISTRY=ghcr.io/myuser PUSH=true bash $0 all  # Custom registry (Bash)"
        exit 1
        ;;
esac

# Push images if requested (only for non-buildx/single-arch builds)
if [ "$PUSH" = "true" ] && [ "$IS_MULTI_ARCH" = false ]; then
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
elif [ "$PUSH" = "true" ] && [ "$IS_MULTI_ARCH" = true ]; then
    echo -e "${GREEN}✓ Multi-arch images already pushed via Buildx${NC}"
    echo ""
fi

# Summary
echo -e "${GREEN}Build Complete!${NC}"
echo ""

if [ "$IS_MULTI_ARCH" = false ]; then
    echo "Built images:"
    docker images | grep simplepro | head -10
    echo ""
fi

echo "Build configuration:"
echo "  Service(s): $SERVICE"
echo "  Platform(s): $PLATFORMS"
echo "  Version: $VERSION"
echo "  Registry: $REGISTRY"
echo "  Pushed: $PUSH"
echo ""

if [ "$IS_MULTI_ARCH" = false ]; then
    echo "Next steps:"
    echo "  1. Test locally: docker-compose -f docker-compose.prod.yml up -d"
    echo "  2. Push to registry: PUSH=true $0 $SERVICE"
    echo "  3. Deploy to production: See docs/deployment/DOCKER_DEPLOYMENT_GUIDE.md"
else
    echo "Multi-architecture build info:"
    echo "  Images built for: $PLATFORMS"
    if [ "$PUSH" = "true" ]; then
        echo "  Images pushed to: $REGISTRY"
        echo ""
        echo "Next steps for Raspberry Pi deployment:"
        echo "  1. On Raspberry Pi:"
        echo "     docker pull ${REGISTRY}/api:${VERSION}"
        echo "     docker pull ${REGISTRY}/web:${VERSION}"
        echo "  2. Start services:"
        echo "     docker-compose -f docker-compose.prod.yml up -d"
    else
        echo "  Images available locally for testing"
        echo ""
        echo "To push multi-arch images:"
        echo "  PLATFORMS=$PLATFORMS PUSH=true $0 $SERVICE"
    fi
fi
