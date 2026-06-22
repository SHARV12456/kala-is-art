#!/bin/bash
# KALA IS ART - PRODUCTION DEPLOYMENT SCRIPT

echo "=============================================="
echo "    KALA IS ART - DEPLOYMENT INITIALIZATION   "
echo "=============================================="

# 1. Check for Docker
if ! [ -x "$(command -v docker)" ]; then
  echo "Error: Docker is not installed." >&2
  exit 1
fi

# 2. Check for docker-compose
if ! [ -x "$(command -v docker-compose)" ]; then
  echo "Error: docker-compose is not installed." >&2
  exit 1
fi

# 3. Ensure environment variables exist
if [ ! -f ".env.production" ]; then
    echo "Creating default .env.production file... (PLEASE UPDATE PASSWORDS LATER)"
    cat <<EOT >> .env.production
# Database Configuration
DB_USER=postgres
DB_PASSWORD=production_secure_password_123
DB_NAME=kala_is_art

# Backend Configuration
PORT=5000
JWT_SECRET=super_secure_production_jwt_secret_999
CORS_ORIGIN=http://localhost

# Frontend Configuration
VITE_API_URL=http://localhost:5000
EOT
fi

echo "Pulling latest images (if any)..."
docker-compose -f docker-compose.prod.yml pull

echo "Building and starting production containers in detached mode..."
docker-compose -f docker-compose.prod.yml --env-file .env.production up -d --build

echo "=============================================="
echo " Deployment successful. Services are starting."
echo " Frontend: http://localhost:80"
echo " Backend:  http://localhost:5000"
echo "=============================================="
