#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

"$SCRIPT_DIR/ensure-auth-ui.sh"

cd "$SCRIPT_DIR/wasm-guest"
exec npm run dev
