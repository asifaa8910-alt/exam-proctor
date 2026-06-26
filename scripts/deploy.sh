#!/bin/bash
echo "🚀 Starting Deployment Process..."

# Check if docker is installed
if ! [ -x "$(command -v docker)" ]; then
  echo '❌ Error: docker is not installed.' >&2
  exit 1
fi

if ! [ -x "$(command -v docker compose)" ] && ! docker compose version &> /dev/null; then
  echo '❌ Error: docker compose is not installed.' >&2
  exit 1
fi

echo "🔄 Rebuilding and starting docker containers..."
docker compose down
docker compose up --build -d

echo "✅ Deployment completed successfully! Frontend: http://localhost:3000, Backend: http://localhost:5002"
