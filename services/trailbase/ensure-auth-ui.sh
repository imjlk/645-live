#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
TRAILBASE_VERSION_FOR_AUTH_UI="${TRAILBASE_VERSION_FOR_AUTH_UI:-0.24.0}"
AUTH_UI_WASM_PATH="$SCRIPT_DIR/traildepot/wasm/auth_ui_component.wasm"

if [ -f "$AUTH_UI_WASM_PATH" ]; then
  exit 0
fi

echo "[trailbase] auth_ui_component.wasm missing, downloading release artifact..."
mkdir -p "$SCRIPT_DIR/traildepot/wasm"

tmp_zip="$(mktemp)"
trap 'rm -f "$tmp_zip"' EXIT

curl -fLsS \
  -o "$tmp_zip" \
  "https://github.com/trailbaseio/trailbase/releases/download/v${TRAILBASE_VERSION_FOR_AUTH_UI}/trailbase_v${TRAILBASE_VERSION_FOR_AUTH_UI}_wasm_auth_ui.zip"

unzip -jo "$tmp_zip" auth_ui_component.wasm -d "$SCRIPT_DIR/traildepot/wasm"
echo "[trailbase] downloaded $AUTH_UI_WASM_PATH"
