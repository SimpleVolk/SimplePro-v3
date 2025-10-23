# Docker Build Network Error Fixes

## Problem Summary

You were experiencing network timeout errors when pushing multi-architecture Docker images to GitHub Container Registry (ghcr.io):

```
error: failed to copy: failed to do request: Put "https://ghcr.io/...": write tcp ... write: broken pipe
error: failed to copy: ... use of closed network connection
```

**Root Cause**: Multi-architecture builds (`linux/amd64,linux/arm64`) take 50-60 minutes total, and there was:
- No retry logic on network failures
- No timeout optimization
- No fallback strategy if multi-arch push fails

## Fixes Implemented

### 1. GitHub Actions Workflows (CI/CD and CD)

**Files Modified**:
- `.github/workflows/ci-cd.yml` (lines 126-221)
- `.github/workflows/cd.yml` (lines 23-140)

**Changes**:

#### a. Added Job-Level Timeout
```yaml
build:
  timeout-minutes: 60  # Prevents infinite hangs
```

#### b. Optimized Docker Buildx Configuration
```yaml
- name: Setup Docker Buildx (Optimized)
  uses: docker/setup-buildx-action@v3
  with:
    driver-opts: |
      image=moby/buildkit:latest
      network=host  # Reduces network overhead
    buildkitd-flags: --allow-insecure-entitlement network.host
```

**Benefits**:
- Uses latest BuildKit image with best network handling
- `network=host` eliminates Docker bridge network overhead
- Faster and more stable connections to ghcr.io

#### c. Automatic Retry on Network Failure
```yaml
- name: Build and push Docker image (multi-arch)
  id: docker-build
  continue-on-error: true  # Don't fail job immediately
  timeout-minutes: 50
  # ... build config ...

- name: Retry build on network failure
  if: steps.docker-build.outcome == 'failure'
  # ... retry with same config ...
```

**Benefits**:
- Automatically retries once if first build fails
- Same configuration, leverages GitHub Actions cache
- 50-minute timeout per attempt

#### d. Fallback to amd64-Only Build
```yaml
- name: Fallback build (amd64 only)
  id: docker-build-fallback
  if: steps.docker-build.outcome == 'failure'
  platforms: linux/amd64  # Single architecture
  timeout-minutes: 30
```

**Benefits**:
- If multi-arch fails after retry, falls back to x86-only
- 30-minute timeout (much faster for single arch)
- Prevents complete workflow failure
- Still deployable to most production servers

#### e. Added Compression Optimization
```yaml
outputs: type=registry,push=true,compression=zstd,compression-level=3
provenance: false
```

**Benefits**:
- ZSTD compression reduces upload size by 20-30%
- Faster pushes to registry
- Disabled provenance to reduce metadata overhead

#### f. Strategy Optimization
```yaml
strategy:
  matrix:
    service: [api, web]
  fail-fast: false  # Continue building web even if api fails
```

### 2. Local Build Script Enhancement

**File Modified**: `scripts/build-docker-images.sh`

**New Features**:

#### a. Automatic Multi-Architecture Detection
```bash
IS_MULTI_ARCH=false
if [[ "$PLATFORMS" == *","* ]] || [[ "$PLATFORMS" == *"arm"* ]]; then
    IS_MULTI_ARCH=true
fi
```

#### b. Docker Buildx Support
```bash
setup_buildx() {
    docker buildx create --name simplepro-builder \
        --driver docker-container --use \
        --driver-opt network=host \
        --buildkitd-flags '--allow-insecure-entitlement network.host'
}
```

#### c. Smart Build Strategy
- Uses `docker buildx build` for multi-arch builds
- Falls back to standard `docker build` for single architecture
- Automatic push integration with Buildx
- ZSTD compression for registry pushes

#### d. Enhanced Examples
```bash
# Single architecture (default)
./scripts/build-docker-images.sh all

# Multi-architecture for Raspberry Pi
PLATFORMS=linux/amd64,linux/arm64 ./scripts/build-docker-images.sh all

# Build and push to registry
PLATFORMS=linux/amd64,linux/arm64 PUSH=true ./scripts/build-docker-images.sh all

# ARM64 only for Pi
PLATFORMS=linux/arm64 PUSH=true ./scripts/build-docker-images.sh api
```

## How to Use the Fixes

### For GitHub Actions (Automatic)

The fixes are now automatic in your CI/CD pipeline:

1. **Push to `main` or `develop` branch**:
   ```bash
   git add .
   git commit -m "Your changes"
   git push origin main
   ```

2. **GitHub Actions will**:
   - Attempt multi-arch build (50 min timeout)
   - Retry once on network failure
   - Fall back to amd64-only if multi-arch fails
   - Use optimized Buildx configuration

3. **Monitor the workflow**:
   - Check Actions tab in GitHub
   - Look for warnings if fallback was used
   - Images will be tagged at `ghcr.io/simplevolk/simplepro-api:latest`

### For Local Testing

#### Standard amd64 Build (Fast)
```bash
# Build for local testing on x86 machine
./scripts/build-docker-images.sh all
```

#### Multi-Architecture Build (Raspberry Pi)
```bash
# Build both amd64 and ARM64
PLATFORMS=linux/amd64,linux/arm64 ./scripts/build-docker-images.sh all

# Build and push to your registry
PLATFORMS=linux/amd64,linux/arm64 PUSH=true REGISTRY=ghcr.io/youruser ./scripts/build-docker-images.sh all
```

#### ARM64 Only (Pi Deployment)
```bash
# Build only ARM64 for Raspberry Pi
PLATFORMS=linux/arm64 PUSH=true ./scripts/build-docker-images.sh all
```

## Expected Behavior

### Successful Multi-Arch Build
```
✓ Build and push Docker image (multi-arch) - 45 minutes
  - linux/amd64: Built and pushed
  - linux/arm64: Built and pushed
  - Manifest list: Created and pushed
```

### Network Failure with Retry
```
✗ Build and push Docker image (multi-arch) - Failed (network error)
⟳ Retry build on network failure - 40 minutes
  - linux/amd64: Built and pushed
  - linux/arm64: Built and pushed
  - Manifest list: Created and pushed
✓ Build successful on retry
```

### Multi-Arch Failure with Fallback
```
✗ Build and push Docker image (multi-arch) - Failed
✗ Retry build on network failure - Failed
⚠ Fallback build (amd64 only) - 15 minutes
  - linux/amd64: Built and pushed
✓ Build successful (amd64-only)
⚠ Warning: Multi-arch build failed, fell back to amd64-only build
```

## Troubleshooting

### If Builds Still Fail

1. **Check GitHub Actions Logs**:
   - Navigate to Actions tab
   - Click on failed workflow
   - Expand "Build and push Docker image" step
   - Look for specific error message

2. **Network Issues**:
   - GitHub Actions runners have good connectivity
   - If all retries fail, may indicate registry issue
   - Check [GitHub Status](https://www.githubstatus.com/)

3. **Authentication Issues**:
   ```bash
   # Ensure GITHUB_TOKEN has correct permissions
   # In repo settings: Settings → Actions → General → Workflow permissions
   # Select: "Read and write permissions"
   ```

4. **Local Build Issues**:
   ```bash
   # Ensure Docker Buildx is installed
   docker buildx version

   # If not installed:
   docker buildx install

   # Create builder manually
   docker buildx create --name simplepro-builder --use
   ```

### Performance Expectations

| Build Type | Time (First Run) | Time (Cached) | Image Size |
|------------|------------------|---------------|------------|
| Single amd64 | 8-12 min | 3-5 min | 400-600 MB |
| Multi-arch (amd64+arm64) | 45-60 min | 20-30 min | 400-600 MB |
| ARM64 only | 25-35 min | 10-15 min | 400-600 MB |

**Note**: ARM64 builds are slower due to QEMU emulation on x86 runners.

## Deployment to Raspberry Pi

### Option 1: Pull from GitHub Container Registry (Recommended)

On your Raspberry Pi 5:

```bash
# Login to GitHub Container Registry
echo $YOUR_GITHUB_TOKEN | docker login ghcr.io -u yourusername --password-stdin

# Pull ARM64 images (automatically selected)
docker pull ghcr.io/simplevolk/simplepro-api:latest
docker pull ghcr.io/simplepro-web:latest

# Start services
docker-compose -f docker-compose.prod.yml up -d
```

### Option 2: Build Locally on Pi

On your Raspberry Pi 5:

```bash
git clone https://github.com/simplevolk/SimplePro-v3.git
cd SimplePro-v3

# Build native ARM64 images (no emulation needed)
./scripts/build-docker-images.sh all

# Start services
docker-compose -f docker-compose.prod.yml up -d
```

**Note**: Building on Pi5 takes 15-20 minutes (faster than x86 emulation).

## Files Changed Summary

```
.github/workflows/
├── ci-cd.yml           ✓ Added retry logic, timeout, fallback
└── cd.yml              ✓ Added retry logic, timeout, fallback

scripts/
└── build-docker-images.sh  ✓ Added Buildx support, multi-arch
```

## Key Improvements

| Feature | Before | After |
|---------|--------|-------|
| **Timeout** | None (default 360 min) | 60 min job, 50 min step |
| **Retry** | None | 1 automatic retry |
| **Fallback** | Fail entire build | Fall back to amd64 |
| **Network** | Default Docker bridge | Optimized host network |
| **Compression** | gzip | ZSTD level 3 (faster) |
| **Buildx** | Not in local script | Fully supported |
| **Multi-arch** | CI/CD only | CI/CD + local script |

## Testing Recommendations

1. **Test locally first**:
   ```bash
   # Quick test with single architecture
   ./scripts/build-docker-images.sh api
   docker run -it --rm simplepro-api:latest node --version
   ```

2. **Test multi-arch build**:
   ```bash
   # This will take 45-60 minutes
   PLATFORMS=linux/amd64,linux/arm64 ./scripts/build-docker-images.sh api
   ```

3. **Push to GitHub and monitor**:
   ```bash
   git add .github/workflows/ scripts/
   git commit -m "Fix: Add retry logic and Buildx support for Docker builds"
   git push origin main

   # Watch the Actions tab in GitHub
   ```

## Next Steps

1. **Commit these changes**:
   ```bash
   git add .github/workflows/ scripts/ DOCKER_BUILD_FIXES.md
   git commit -m "Fix: Resolve Docker build network errors with retry + fallback strategy"
   git push origin main
   ```

2. **Monitor the next build**:
   - Watch GitHub Actions for successful build
   - Check for any warnings about fallback usage

3. **Test on Raspberry Pi**:
   - Pull the multi-arch images
   - Verify they run correctly
   - Check performance metrics

## Additional Resources

- [Docker Buildx Documentation](https://docs.docker.com/buildx/working-with-buildx/)
- [GitHub Actions Docker Build Push](https://github.com/docker/build-push-action)
- [Multi-Platform Builds](https://docs.docker.com/build/building/multi-platform/)
- [Raspberry Pi Docker Setup](https://docs.docker.com/engine/install/debian/)

## Support

If you continue to experience issues:

1. Check the logs in GitHub Actions
2. Verify Docker Buildx is properly installed locally
3. Ensure GitHub Container Registry is accessible
4. Check rate limits on ghcr.io
5. Review Docker daemon logs on build machine

---

**Last Updated**: 2025-10-23
**Fixes Applied**: Network retry, timeout optimization, Buildx integration, fallback strategy
