ARG TRAILBASE_VERSION=0.24.0

FROM node:22-bookworm-slim AS wasm-builder

WORKDIR /build/wasm-guest

COPY wasm-guest/package.json ./
RUN npm install

COPY wasm-guest/ ./
RUN npm run build:bundle && npm run build:wasm

FROM oven/bun:1-alpine AS backfill-runtime

FROM alpine:3.21 AS auth-ui
ARG TRAILBASE_VERSION=0.24.0

WORKDIR /build/auth-ui
RUN apk add --no-cache curl unzip
RUN curl -fLsS -o auth-ui.zip "https://github.com/trailbaseio/trailbase/releases/download/v${TRAILBASE_VERSION}/trailbase_v${TRAILBASE_VERSION}_wasm_auth_ui.zip" \
  && unzip -jo auth-ui.zip auth_ui_component.wasm \
  && rm -f auth-ui.zip

FROM trailbase/trailbase:${TRAILBASE_VERSION} AS runtime

WORKDIR /app

COPY --chown=trailbase traildepot /app/traildepot
COPY entrypoint.sh /app/entrypoint.sh

USER root
RUN mkdir -p /app/traildepot/wasm
COPY --from=backfill-runtime /usr/local/bin/bun /usr/local/bin/bun
COPY --from=backfill-runtime /usr/lib/libstdc++.so.6 /lib/libstdc++.so.6
COPY --from=backfill-runtime /usr/lib/libgcc_s.so.1 /lib/libgcc_s.so.1
COPY --from=wasm-builder /build/wasm-guest/dist/component.wasm /app/traildepot/wasm/component.wasm
COPY --from=auth-ui /build/auth-ui/auth_ui_component.wasm /app/traildepot/wasm/auth_ui_component.wasm

RUN chmod +x /app/entrypoint.sh \
  && ln -sf /lib/libstdc++.so.6 /usr/lib/libstdc++.so.6 \
  && ln -sf /lib/libgcc_s.so.1 /usr/lib/libgcc_s.so.1

ENV CORS_ALLOWED_ORIGINS="https://www.645.live,https://645.live" \
    BACKFILL_ON_STARTUP="true" \
    BACKFILL_DRAWS="true" \
    BACKFILL_DRAW_LATEST_ROUNDS="30" \
    BACKFILL_STORES="true" \
    BACKFILL_STORE_LATEST_ROUNDS="10" \
    BACKFILL_STRICT="false" \
    RUNTIME_THREADS="8"

EXPOSE 4000
ENTRYPOINT ["tini", "--"]
CMD ["/app/entrypoint.sh"]
