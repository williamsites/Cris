#!/usr/bin/env bash
# Sobe o Worker (wrangler dev) com um D1 local limpo, espera ficar pronto e roda os testes da API.
set -euo pipefail
cd "$(dirname "$0")/.."

PORT="${PORT:-8787}"
rm -rf .wrangler/state
npx wrangler dev --port "$PORT" --ip 127.0.0.1 > /tmp/cris-barber-wrangler.log 2>&1 &
WRANGLER_PID=$!
trap 'kill "$WRANGLER_PID" 2>/dev/null || true' EXIT

for _ in $(seq 1 90); do
  if curl -fsS "http://127.0.0.1:$PORT/api/health" > /dev/null 2>&1; then break; fi
  sleep 1
done

npx esbuild tests/api.test.ts --bundle --platform=node --format=esm \
  --outfile=node_modules/.cache/api.test.mjs --log-level=warning
API_BASE="http://127.0.0.1:$PORT" node node_modules/.cache/api.test.mjs

npx esbuild tests/client.test.ts --bundle --platform=node --format=esm \
  --outfile=node_modules/.cache/client.test.mjs --log-level=warning
API_BASE="http://127.0.0.1:$PORT" node node_modules/.cache/client.test.mjs
