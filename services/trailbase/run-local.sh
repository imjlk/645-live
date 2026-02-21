#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
LOCAL_CORS_ORIGINS="${LOCAL_CORS_ORIGINS:-http://localhost:5173,http://127.0.0.1:5173,http://localhost:4173,http://127.0.0.1:4173}"

"$SCRIPT_DIR/ensure-auth-ui.sh"

cd "$SCRIPT_DIR/wasm-guest"
npm run build

IFS=',' read -r -a cors_origins <<< "$LOCAL_CORS_ORIGINS"

cmd=(
  trail
  --data-dir "$SCRIPT_DIR/traildepot"
  run
  --address 0.0.0.0:4000
)

for origin in "${cors_origins[@]}"; do
  origin="${origin#"${origin%%[![:space:]]*}"}"
  origin="${origin%"${origin##*[![:space:]]}"}"
  if [[ -n "$origin" ]]; then
    cmd+=(--cors-allowed-origins "$origin")
  fi
done

exec "${cmd[@]}"
