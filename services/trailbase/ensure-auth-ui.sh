#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
TRAILBASE_VERSION_FOR_AUTH_UI="${TRAILBASE_VERSION_FOR_AUTH_UI:-0.33.15}"
AUTH_UI_WASM_PATH="$SCRIPT_DIR/traildepot/wasm/auth_ui_component.wasm"

if [ -f "$AUTH_UI_WASM_PATH" ] && [ "${1:-}" != "--force" ]; then
  exit 0
fi

echo "[trailbase] downloading auth UI for TrailBase ${TRAILBASE_VERSION_FOR_AUTH_UI}..."
mkdir -p "$SCRIPT_DIR/traildepot/wasm"

tmp_dir="$(mktemp -d)"
trap 'rm -rf "$tmp_dir"' EXIT

curl -fLsS \
  -o "$tmp_dir/auth-ui.zip" \
  "https://github.com/trailbaseio/trailbase/releases/download/v${TRAILBASE_VERSION_FOR_AUTH_UI}/trailbase_v${TRAILBASE_VERSION_FOR_AUTH_UI}_wasm_auth_ui.zip"

unzip -p "$tmp_dir/auth-ui.zip" trailbase_auth_ui_component.wasm > "$tmp_dir/auth_ui_component.wasm"
test -s "$tmp_dir/auth_ui_component.wasm"
mv "$tmp_dir/auth_ui_component.wasm" "$AUTH_UI_WASM_PATH"
echo "[trailbase] downloaded $AUTH_UI_WASM_PATH"
