#!/usr/bin/env bash

# Manual server-side fallback. Normal production deployments are performed by
# .github/workflows/deploy.yml after changes reach main.

set -Eeuo pipefail

APP_DIR="${DEPLOY_PATH:-$(cd "$(dirname "$0")" && pwd)}"
BACKEND_DIR="$APP_DIR/backend"
SERVICE_NAME="${SERVICE_NAME:-little-cloud.service}"
HEALTH_URL="${HEALTH_URL:-http://127.0.0.1:8100/api/health}"

cd "$APP_DIR"
test -d .git
test -f "$APP_DIR/.env"

old_sha=$(git rev-parse HEAD)
timestamp=$(date +%Y%m%d-%H%M%S)
mkdir -p "$BACKEND_DIR/backups"

rollback() {
  echo "Health check failed; rolling back to $old_sha." >&2
  git reset --hard "$old_sha"
  sudo -n systemctl restart "$SERVICE_NAME"
  sudo -n systemctl restart little-cloud-log-api.service
  exit 1
}

if [ -f "$BACKEND_DIR/quiz.db" ]; then
  sqlite3 "$BACKEND_DIR/quiz.db" \
    ".backup '$BACKEND_DIR/backups/quiz-${timestamp}-${old_sha:0:12}.db'"
fi

git fetch --prune origin main
git reset --hard origin/main

if [ ! -x "$BACKEND_DIR/venv/bin/python" ]; then
  python3 -m venv "$BACKEND_DIR/venv"
fi
pip_index_url="${PIP_INDEX_URL:-https://mirrors.aliyun.com/pypi/simple}"
"$BACKEND_DIR/venv/bin/python" -m pip install --quiet --index-url "$pip_index_url" -r "$BACKEND_DIR/requirements.txt"

if command -v npm >/dev/null 2>&1; then
  (
    cd "$APP_DIR/frontend"
    npm ci
    npm run build
  )
  rm -rf "$BACKEND_DIR/dist"
  cp -a "$APP_DIR/frontend/dist" "$BACKEND_DIR/dist"
elif [ ! -f "$BACKEND_DIR/dist/index.html" ]; then
  echo "Node.js is unavailable and backend/dist is missing." >&2
  echo "Use GitHub Actions or upload a frontend build before restarting." >&2
  exit 1
fi

sudo -n systemctl restart "$SERVICE_NAME"
sudo -n systemctl restart little-cloud-log-api.service

main_healthy=0
for attempt in 1 2 3 4 5 6 7 8 9 10; do
  if response=$(curl --fail --silent --show-error --max-time 5 "$HEALTH_URL"); then
    if printf '%s' "$response" | grep -q '"status":"ok"'; then
      main_healthy=1
      break
    fi
  fi
  sleep 2
done
if [ "$main_healthy" -ne 1 ]; then
  rollback
fi

log_api_healthy=0
for attempt in 1 2 3 4 5 6 7 8 9 10; do
  if response=$(curl --fail --silent --show-error --max-time 5 http://127.0.0.1:8110/health); then
    if printf '%s' "$response" | grep -q '"status":"ok"'; then
      log_api_healthy=1
      break
    fi
  fi
  sleep 2
done
if [ "$log_api_healthy" -ne 1 ]; then
  rollback
fi

echo "Deployment $(git rev-parse --short HEAD) succeeded."
