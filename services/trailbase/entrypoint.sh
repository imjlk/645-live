#!/bin/sh
set -eu

log() {
  echo "[trailbase-startup] $*"
}

is_true() {
  case "${1:-}" in
    1|true|TRUE|yes|YES|on|ON) return 0 ;;
    *) return 1 ;;
  esac
}

run_step() {
  desc="$1"
  shift

  log "$desc"
  if "$@"; then
    log "ok: $desc"
    return 0
  fi

  log "failed: $desc"
  if is_true "${BACKFILL_STRICT:-false}"; then
    log "BACKFILL_STRICT=true, aborting startup"
    exit 1
  fi

  log "continuing startup because BACKFILL_STRICT=false"
  return 0
}

if is_true "${BACKFILL_ON_STARTUP:-true}"; then
  cd /app/traildepot

  if command -v bun >/dev/null 2>&1; then
    if is_true "${BACKFILL_DRAWS:-true}"; then
      rounds="${BACKFILL_DRAW_LATEST_ROUNDS:-30}"
      run_step "backfill draw results (latest ${rounds} rounds)" \
        bun run import-draw-results.ts latest "${rounds}"
    fi

    if is_true "${BACKFILL_STORES:-true}"; then
      store_rounds="${BACKFILL_STORE_LATEST_ROUNDS:-0}"
      case "$store_rounds" in
        ''|*[!0-9]*) store_rounds=0 ;;
      esac

      if [ "$store_rounds" -gt 0 ]; then
        run_step "backfill winning stores (latest ${store_rounds} rounds)" \
          bun run import-top-store.ts latest-range "$store_rounds"
      else
        run_step "backfill winning stores (latest)" \
          bun run import-top-store.ts latest
      fi
    fi
  else
    log "bun not found, skipping backfill steps"
  fi
else
  log "BACKFILL_ON_STARTUP=false, skipping backfill steps"
fi

set -- /app/trail \
  --data-dir /app/traildepot \
  run \
  --address 0.0.0.0:4000 \
  --runtime-threads "${RUNTIME_THREADS:-8}"

cors_allowed_origins="${CORS_ALLOWED_ORIGINS:-https://www.645.live,https://645.live}"
old_ifs="$IFS"
IFS=','
for origin in $cors_allowed_origins; do
  origin="$(printf '%s' "$origin" | sed 's/^[[:space:]]*//;s/[[:space:]]*$//')"
  if [ -n "$origin" ]; then
    set -- "$@" --cors-allowed-origins "$origin"
  fi
done
IFS="$old_ifs"

exec "$@"
