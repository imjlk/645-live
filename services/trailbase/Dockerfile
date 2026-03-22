ARG TRAILBASE_VERSION=0.24.0

FROM node:22-bookworm-slim AS wasm-builder

WORKDIR /build/wasm-guest

COPY wasm-guest/package.json ./
RUN npm install

COPY wasm-guest/ ./
RUN npm run build:bundle && npm run build:wasm

FROM oven/bun:1-alpine AS backfill-runtime

FROM trailbase/trailbase:${TRAILBASE_VERSION} AS runtime

WORKDIR /app

COPY --chown=trailbase traildepot /app/traildepot-image
COPY entrypoint.sh /app/entrypoint.sh

USER root
RUN rm -rf /app/traildepot-image/data /app/traildepot-image/backups /app/traildepot-image/uploads \
  && mkdir -p /app/traildepot/wasm
COPY --from=backfill-runtime /usr/local/bin/bun /usr/local/bin/bun
COPY --from=wasm-builder /build/wasm-guest/dist/component.wasm /app/traildepot-image/wasm/component.wasm

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
