#!/bin/bash

# Restart script for Logiscool containers
# Run this script from the LMI-3 directory

echo "🔄 Restarting Logiscool containers..."

# Restart all services
echo "⏳ Restarting services..."
docker-compose restart

# Wait a moment for services to stabilize
echo "⏳ Waiting for services to stabilize..."
sleep 10

# Check status
echo "📊 Service status after restart:"
docker-compose ps

echo ""
echo "✅ Container restart complete!"
echo "🌐 App should be available at: https://popa-stefan.be"