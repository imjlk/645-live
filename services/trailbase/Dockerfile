FROM node:22-bookworm-slim AS wasm-builder

WORKDIR /build/wasm-guest

COPY wasm-guest/package.json ./
RUN npm install

COPY wasm-guest/ ./
RUN npm run build:bundle && npm run build:wasm

FROM trailbase/trailbase:0.24.0 AS runtime

WORKDIR /app

COPY --chown=trailbase traildepot /app/traildepot

USER root
RUN mkdir -p /app/traildepot/wasm
COPY --from=wasm-builder /build/wasm-guest/dist/component.wasm /app/traildepot/wasm/component.wasm

ENV CORS_ALLOWED_ORIGINS="https://www.645.live,https://645.live"

EXPOSE 4000
ENTRYPOINT ["tini", "--"]
CMD ["/bin/sh", "-lc", "exec /app/trail --data-dir /app/traildepot run --address 0.0.0.0:4000 --cors-allowed-origins \"${CORS_ALLOWED_ORIGINS}\""]
