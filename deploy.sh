#!/bin/bash

# Production Deployment script for Logiscool
# Run this scr# Build phase - simple and reliable
echo "🔨 Building application images..."t from the LMI-3 directory

set -e  # Exit on any error

echo "🚀 Starting Logiscool production deployment..."

# Load root .env early (for COMPOSE_BAKE or manual BUILD_ID overrides)
if [ -f ./.env ]; then
    echo "📦 Loading root .env variables"
    # shellcheck disable=SC2046
    export $(grep -v '^#' ./.env | grep -E '^[A-Za-z0-9_]+=' | xargs -d '\n')
fi

# Enable BuildKit for faster builds
export DOCKER_BUILDKIT=1
export COMPOSE_DOCKER_CLI_BUILD=1

# Use simple docker-compose build (no bake complexity)
echo "ℹ️  Using standard docker-compose build (reliable and stable)"

# Pre-deployment checks
echo "📋 Running pre-deployment checks..."

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo "❌ Docker is not running. Please start Docker and try again."
    exit 1
fi

# Check if domain is pointing to this server
echo "🌐 Checking domain configuration..."
DOMAIN_IP=$(dig +short popa-stefan.be)
SERVER_IP=$(curl -s ifconfig.me)
if [ "$DOMAIN_IP" != "$SERVER_IP" ]; then
    echo "⚠️  Warning: Domain popa-stefan.be ($DOMAIN_IP) may not be pointing to this server ($SERVER_IP)"
fi

# Create letsencrypt directory if it doesn't exist
mkdir -p ./letsencrypt
chmod 600 ./letsencrypt

# Pull latest base images
echo "📥 Pulling latest base images..."
docker pull traefik:v3.0 || echo "⚠️  Failed to pull traefik image, continuing..."
docker pull postgres:15 || echo "⚠️  Failed to pull postgres image, continuing..."
docker pull redis:7-alpine || echo "⚠️  Failed to pull redis image, continuing..."
docker pull minio/minio:latest || echo "⚠️  Failed to pull minio image, continuing..."

# Stop existing services gracefully
echo "🛑 Stopping existing services..."
if [ "$USE_BAKE" = "true" ]; then
    docker compose down --remove-orphans --volumes || true
    # Remove any dangling containers from previous deployments
    docker container prune -f || true
else
    docker-compose down --remove-orphans --volumes || true
    # Remove any dangling containers from previous deployments
    docker container prune -f || true
fi

# Clean up old images and build cache
echo "🧹 Cleaning up old Docker images and build cache..."
docker image prune -f
docker builder prune -f --filter until=24h

BUILD_ID=$(date +%Y%m%d%H%M%S)-$RANDOM
export BUILD_ID
echo "🔢 Using BUILD_ID=$BUILD_ID"

# ------------- BUILD PHASE WITH PANIC / FAILURE FALLBACK -------------
echo "� Starting build phase (panic-aware)..."

echo "� Building backend image..."
docker-compose build backend

echo "📦 Building frontend image (no-cache for fresh builds)..."
docker-compose build --no-cache frontend

echo "✅ Build phase completed successfully"

# Start services (force recreate to avoid stale containers)
echo "🚢 Starting services (forcing recreate, propagating BUILD_ID to runtime)..."

# Start Traefik first to ensure network is ready
echo "🔀 Starting Traefik first..."
docker-compose up -d traefik --force-recreate

# Wait for Traefik to be ready
echo "⏳ Waiting for Traefik to initialize..."
sleep 10

# Start remaining services
echo "🚢 Starting all services..."
docker-compose up -d --force-recreate

# Wait for services to be healthy
echo "⏳ Waiting for services to be healthy..."
sleep 30

# Restart Traefik to ensure it picks up all service labels
echo "🔄 Restarting Traefik to refresh service discovery..."
docker-compose restart traefik

# Wait for Traefik to restart
sleep 15

# Check health of all services with improved validation
echo "🩺 Checking service health..."
PS_CMD="docker-compose"

FAILED_SERVICES=()
for service in traefik db redis backend frontend minio; do
    if $PS_CMD ps $service | grep -q "Up"; then
        echo "✅ $service is running"
        
        # Additional health checks for critical services
        case $service in
            traefik)
                echo "   🔍 Checking Traefik dashboard accessibility..."
                if docker exec traefik wget -q --spider http://localhost:8080/api/http/routers 2>/dev/null; then
                    echo "   ✅ Traefik API is responding"
                else
                    echo "   ⚠️  Traefik API not responding yet"
                fi
                ;;
            backend)
                echo "   🔍 Checking backend health..."
                sleep 5  # Give backend time to start
                if docker exec backend wget -q --spider http://localhost:4000/health 2>/dev/null || docker exec backend curl -f http://localhost:4000/health >/dev/null 2>&1; then
                    echo "   ✅ Backend health check passed"
                else
                    echo "   ⚠️  Backend health check failed (may still be starting)"
                fi
                ;;
            frontend)
                echo "   🔍 Checking frontend health..."
                sleep 3  # Give frontend time to start
                if docker exec frontend wget -q --spider http://localhost:3000 2>/dev/null || docker exec frontend curl -f http://localhost:3000 >/dev/null 2>&1; then
                    echo "   ✅ Frontend health check passed"
                else
                    echo "   ⚠️  Frontend health check failed (may still be starting)"
                fi
                ;;
        esac
    else
        echo "❌ $service failed to start"
        FAILED_SERVICES+=($service)
        echo "   📋 Recent logs for $service:"
        $PS_CMD logs $service --tail=10
        echo ""
    fi
done

# Report on failed services
if [ ${#FAILED_SERVICES[@]} -gt 0 ]; then
    echo "⚠️  Warning: ${#FAILED_SERVICES[@]} service(s) failed to start properly: ${FAILED_SERVICES[*]}"
    echo "   Check logs with: $PS_CMD logs <service_name>"
fi

# Test database migration
echo "🗄️  Running database migrations..."
echo "   ⏳ Waiting for database to be fully ready..."
sleep 10

# Check if backend container is ready for database operations
MAX_RETRIES=5
RETRY_COUNT=0
while [ $RETRY_COUNT -lt $MAX_RETRIES ]; do
    if docker-compose exec -T backend npx prisma migrate deploy 2>/dev/null; then
        echo "   ✅ Database migrations completed successfully"
        break
    else
        echo "   ⏳ Migration attempt $((RETRY_COUNT + 1))/$MAX_RETRIES failed, retrying in 10s..."
    fi
    
    RETRY_COUNT=$((RETRY_COUNT + 1))
    if [ $RETRY_COUNT -lt $MAX_RETRIES ]; then
        sleep 10
    fi
done

if [ $RETRY_COUNT -eq $MAX_RETRIES ]; then
    echo "   ⚠️  Migration failed after $MAX_RETRIES attempts. Check backend and database logs:"
    echo "     - Backend logs: $PS_CMD logs backend --tail=20"
    echo "     - Database logs: $PS_CMD logs db --tail=20"
fi

# Final deployment validation
echo "🧪 Running final deployment validation..."

# Test external connectivity
echo "🌐 Testing external connectivity to your domain..."
if curl -s --max-time 10 -o /dev/null -w "%{http_code}" https://popa-stefan.be | grep -q "200\|301\|302"; then
    echo "   ✅ Domain is responding to HTTPS requests"
else
    echo "   ⚠️  Domain not responding properly to HTTPS (may need time to propagate)"
fi

# Check Traefik routing
echo "🔀 Checking Traefik service discovery..."
TRAEFIK_SERVICES=$(docker-compose exec -T traefik wget -qO- http://localhost:8080/api/http/services 2>/dev/null | grep -o '"name":"[^"]*"' | wc -l || echo "0")
echo "   🔍 Traefik discovered $TRAEFIK_SERVICES services"

# Final status check
echo "📊 Final service status:"
docker-compose ps
echo ""
echo "🔍 Service resource usage:"
docker-compose top 2>/dev/null || echo "   ℹ️  Resource usage info not available"

echo ""
echo "🔍 Build information:"
echo "   📦 Frontend image build ID: $BUILD_ID"
docker images --format "table {{.Repository}}\t{{.Tag}}\t{{.CreatedAt}}\t{{.Size}}" | grep -E "(frontend|backend)" || true

echo ""
echo "🎉 Deployment complete!"
echo "🌐 Access your app at: https://popa-stefan.be"
echo "🆔 Build ID: $BUILD_ID (visible in browser console as config.BUILD_ID)"
echo ""
echo "📋 Useful commands:"
echo "  📝 Check logs: $PS_CMD logs -f [service_name]"
echo "  🔍 Monitor services: $PS_CMD ps"
echo "  🔄 Restart service: $PS_CMD restart [service_name]"
echo "  🛑 Stop all: $PS_CMD down"
echo "  📊 Resource usage: $PS_CMD top"
echo ""
echo "🔐 Security reminders:"
echo "  - Change default database credentials in production"
echo "  - Update JWT secret key"
echo "  - Review firewall settings"
echo "  - Monitor logs regularly for security issues"