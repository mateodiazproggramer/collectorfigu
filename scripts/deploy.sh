#!/usr/bin/env bash
set -euo pipefail

APP_DIR="/opt/collectorfigu"

echo "Deploying CollectorFigu..."
mkdir -p "$APP_DIR"
rsync -av --delete ./ "$APP_DIR" --exclude node_modules --exclude .next --exclude .git
cd "$APP_DIR"

docker compose pull || true
docker compose --env-file .env.production -f docker-compose.prod.yml up -d --build
docker compose --env-file .env.production -f docker-compose.prod.yml exec -T api npx prisma migrate deploy

echo "Deployment completed."
