#!/bin/bash

# Dev Remote Start Script for Logiscool
# Starts backend and frontend in dev mode, exposes via Traefik for remote access
# Usage: ./dev-remote.sh

set -e

# Ensure dev servers bind to all interfaces so Docker can access them
export HOST=0.0.0.0

# Enable Traefik dynamic configuration for dev mode
export TRAEFIK_DYNAMIC_VOLUME="- ./traefik-dynamic.yml:/etc/traefik/dynamic/dev.yml:ro"

# Start required infrastructure services (db, redis, minio, traefik) in detached mode
SERVICES="traefik db redis minio"
echo "🚀 Starting infrastructure services: $SERVICES ..."
docker compose up -d $SERVICES

echo "⏳ Waiting for infrastructure to be ready..."
sleep 8

# Start backend in dev mode (with live reload)
echo "🟢 Starting backend in dev mode (binding to 0.0.0.0:4000)..."
(cd backend && npm install && HOST=0.0.0.0 PORT=4000 npm run dev &)

# Start frontend in dev mode (with live reload)
echo "🟢 Starting frontend in dev mode (binding to 0.0.0.0:3000)..."
(cd frontend && npm install && HOST=0.0.0.0 PORT=3000 npm run dev &)

# Wait a bit for dev servers to start
sleep 5

echo "🌐 Your development app is now accessible remotely via your domain (https://popa-stefan.be)"
echo "   - Frontend: https://popa-stefan.be (proxied to localhost:3000 dev server)"
echo "   - Backend: https://popa-stefan.be/api (proxied to localhost:4000 dev server)"
echo ""
echo "🔧 Dev servers are running with live reload - changes will be reflected immediately!"
echo "📝 To stop dev servers, use 'pkill -f \"npm run dev\"' or stop the script manually."
echo "🛑 To stop infrastructure: docker compose down"
echo ""
echo "💡 Tip: Check Traefik dashboard at http://localhost:8080 for routing details"
