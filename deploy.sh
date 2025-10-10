#!/bin/bash

# LMI-3 Production Deployment Script
# Supports fast and complete rebuild modes with zero-downtime deployment

set -e

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log_info() { echo -e "${BLUE}ℹ️  $1${NC}"; }
log_success() { echo -e "${GREEN}✅ $1${NC}"; }
log_warning() { echo -e "${YELLOW}⚠️  $1${NC}"; }
log_error() { echo -e "${RED}❌ $1${NC}"; }

echo "╔════════════════════════════════════════════╗"
echo "║     LMI-3 Production Deployment            ║"
echo "║     popa-stefan.be/lmi3                    ║"
echo "╚════════════════════════════════════════════╝"
echo ""

if [ -f ./.env ]; then
    log_info "Loading environment variables"
    export $(grep -v '^#' ./.env | grep -E '^[A-Za-z0-9_]+=' | xargs -d '\n')
fi

export DOCKER_BUILDKIT=1
export COMPOSE_DOCKER_CLI_BUILD=1

BUILD_ID="$(date +%Y%m%d-%H%M%S)"
export BUILD_ID
log_info "Build ID: $BUILD_ID"

log_info "Running pre-deployment checks..."

if ! docker info > /dev/null 2>&1; then
    log_error "Docker is not running"
    exit 1
fi
log_success "Docker is running"

if [ ! -f ./docker-compose.yml ]; then
    log_error "docker-compose.yml not found"
    exit 1
fi

if ! docker network inspect starcozka-app-network > /dev/null 2>&1; then
    log_warning "Creating network..."
    docker network create starcozka-app-network
fi

echo ""
echo "Select deployment mode:"
echo "  1) Fast rebuild (uses cache)"
echo "  2) Complete rebuild (no cache)"
echo ""
read -p "Enter choice [1-2]: " choice

BUILD_ARGS=""
case $choice in
    1)
        log_info "Using FAST rebuild mode"
        BUILD_MODE="fast"
        ;;
    2)
        log_info "Using COMPLETE rebuild mode"
        BUILD_MODE="complete"
        BUILD_ARGS="--no-cache --pull"
        ;;
    *)
        log_error "Invalid choice"
        exit 1
        ;;
esac

log_info "Backing up current state..."
CURRENT_CONTAINERS=$(docker compose ps -q 2>/dev/null || true)
if [ -n "$CURRENT_CONTAINERS" ]; then
    docker tag lmi-3-backend_lmi3:latest lmi-3-backend_lmi3:previous 2>/dev/null || true
    docker tag lmi-3-frontend_lmi3:latest lmi-3-frontend_lmi3:previous 2>/dev/null || true
    log_success "Backup created"
fi

echo ""
log_info "Building images..."

if [ "$BUILD_MODE" = "complete" ]; then
    docker builder prune -f --filter until=1h
fi

log_info "Building backend_lmi3..."
if docker compose build $BUILD_ARGS backend_lmi3; then
    log_success "Backend built"
else
    log_error "Backend build failed"
    exit 1
fi

log_info "Building frontend_lmi3..."
if docker compose build $BUILD_ARGS frontend_lmi3; then
    log_success "Frontend built"
else
    log_error "Frontend build failed"
    exit 1
fi

echo ""
log_info "Starting services..."
docker compose up -d --no-deps --force-recreate db_postgres_lmi3 redis_lmi3

log_info "Waiting for database..."
sleep 10

docker compose up -d --no-deps --force-recreate backend_lmi3

log_info "Waiting for database and running schema push..."
sleep 10

for i in {1..3}; do
    if docker compose exec -T backend_lmi3 npx prisma db push --accept-data-loss; then
        log_success "Schema push completed"
        break
    else
        if [ $i -eq 3 ]; then
            log_error "Schema push failed"
            exit 1
        fi
        log_warning "Retry $i/3..."
        sleep 5
    fi
done

docker compose up -d --no-deps --force-recreate frontend_lmi3

echo ""
log_info "Checking for admin user..."

ADMIN_CHECK=$(docker compose exec -T backend_lmi3 node -e "
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
prisma.user.findFirst({ where: { admin: true } })
  .then(user => {
    console.log(user ? 'FOUND' : 'NOT_FOUND');
    return prisma.\$disconnect();
  })
  .catch(err => {
    console.error('ERROR');
    return prisma.\$disconnect();
  });
" 2>/dev/null || echo "ERROR")

if [ "$ADMIN_CHECK" = "NOT_FOUND" ]; then
    log_warning "No admin found"
    log_info "Creating admin user..."
    if docker compose exec -T backend_lmi3 node create-admin.js; then
        log_success "Admin created"
    else
        log_error "Admin creation failed"
    fi
elif [ "$ADMIN_CHECK" = "FOUND" ]; then
    log_success "Admin user exists"
else
    log_warning "Could not verify admin"
fi

echo ""
log_success "Deployment successful!"

log_info "Cleaning up..."
docker image prune -f
docker rmi lmi-3-backend_lmi3:previous 2>/dev/null || true
docker rmi lmi-3-frontend_lmi3:previous 2>/dev/null || true

echo ""
echo "╔════════════════════════════════════════════╗"
echo "║     DEPLOYMENT SUCCESSFUL! 🎉              ║"
echo "╚════════════════════════════════════════════╝"
echo ""
echo "  📦 Build ID: $BUILD_ID"
echo "  🔨 Mode: $BUILD_MODE"
echo "  🌐 URL: https://popa-stefan.be/lmi3"
echo "  🔗 API: https://popa-stefan.be/lmi3/api"
echo ""
docker compose ps
