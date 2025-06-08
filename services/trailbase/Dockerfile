FROM trailbase/trailbase:latest AS base
USER root
RUN apk add --no-cache sqlite

WORKDIR /app

# Debug: List what's in the build context
RUN echo "=== Build context contents ===" && ls -la /

COPY --chown=trailbase:trailbase traildepot/ /app/traildepot/

# Debug: Check what was copied
RUN echo "=== Copied traildepot contents ===" && ls -la /app/traildepot/ && \
    echo "=== Migrations directory ===" && ls -la /app/traildepot/migrations/ || echo "No migrations directory found"

USER trailbase

EXPOSE 4000
ENTRYPOINT ["tini", "--"]
CMD ["/app/trail", "--data-dir", "/app/traildepot", "run", "--address", "0.0.0.0:4000", "--dev"]

HEALTHCHECK CMD curl --fail http://localhost:4000/api/healthcheck || exit 1