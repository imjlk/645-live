#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
LOCAL_CORS_ORIGINS="${LOCAL_CORS_ORIGINS:-http://localhost:5173,http://127.0.0.1:5173,http://localhost:4173,http://127.0.0.1:4173}"

cd "$SCRIPT_DIR/wasm-guest"
npm run build

exec trail \
  --data-dir "$SCRIPT_DIR/traildepot" \
  run \
  --address 0.0.0.0:4000 \
  --cors-allowed-origins "$LOCAL_CORS_ORIGINS"
