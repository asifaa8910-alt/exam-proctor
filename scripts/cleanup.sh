#!/bin/bash
echo "🧹 Starting Cleanup Process..."

# Stop containers and remove volumes
docker compose down -v

# Prune unused docker objects
docker system prune -f

echo "✅ Cleanup completed successfully!"
