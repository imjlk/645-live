ARG TRAILBASE_VERSION=0.33.15

FROM node:22-bookworm-slim AS wasm-builder

WORKDIR /build/wasm-guest

COPY services/trailbase/wasm-guest/package.json services/trailbase/wasm-guest/package-lock.json ./
RUN npm ci

COPY services/trailbase/wasm-guest/ ./
RUN npm run build:bundle && npm run build:wasm

FROM rust:1.96-slim-bookworm AS miniapp-builder
WORKDIR /build
RUN rustup target add wasm32-wasip2
COPY vendor/trailbase-apps-in-toss-kit/Cargo.toml vendor/trailbase-apps-in-toss-kit/Cargo.toml
COPY vendor/trailbase-apps-in-toss-kit/crates vendor/trailbase-apps-in-toss-kit/crates
COPY services/trailbase/miniapp-guest services/trailbase/miniapp-guest
RUN cargo build --manifest-path services/trailbase/miniapp-guest/Cargo.toml --locked --release --target wasm32-wasip2

FROM oven/bun:1-alpine AS backfill-runtime

FROM trailbase/trailbase:${TRAILBASE_VERSION} AS trailbase-base

FROM trailbase-base AS runtime

WORKDIR /app

COPY --chown=trailbase services/trailbase/traildepot /app/traildepot-image
COPY services/trailbase/entrypoint.sh /app/entrypoint.sh
COPY services/trailbase/miniapp-settings.mjs /app/miniapp-settings.mjs

USER root
RUN rm -rf /app/traildepot-image/data /app/traildepot-image/backups /app/traildepot-image/uploads \
  && mkdir -p /app/traildepot/wasm
COPY --from=backfill-runtime /usr/local/bin/bun /usr/local/bin/bun
COPY --from=wasm-builder /build/wasm-guest/dist/component.wasm /app/traildepot-image/wasm/component.wasm
COPY --from=miniapp-builder /build/services/trailbase/miniapp-guest/target/wasm32-wasip2/release/lotto_miniapp.wasm /app/traildepot-image/wasm/lotto_miniapp.wasm
COPY --from=trailbase-base /app/traildepot/wasm/trailbase_auth_ui_component.wasm /app/traildepot-image/wasm/auth_ui_component.wasm

RUN chmod +x /app/entrypoint.sh \
  && apk add --no-cache libstdc++ libgcc \
  && bun --version

ENV CORS_ALLOWED_ORIGINS="https://www.645.live,https://645.live" \
    BACKFILL_ON_STARTUP="true" \
    BACKFILL_DRAWS="true" \
    BACKFILL_DRAW_LATEST_ROUNDS="30" \
    BACKFILL_STORES="true" \
    BACKFILL_STORE_LATEST_ROUNDS="10" \
    BACKFILL_STRICT="false" \
    RUNTIME_THREADS="1"

EXPOSE 4000
ENTRYPOINT ["tini", "--"]
CMD ["/app/entrypoint.sh"]
