FROM trailbase/trailbase:0.12.0 AS base
USER root
RUN apk add --no-cache sqlite

WORKDIR /app

COPY traildepot /app/traildepot
RUN chown -R trailbase:trailbase /app/traildepot && \
    chmod -R 755 /app/traildepot

USER trailbase

EXPOSE 4000
ENTRYPOINT ["tini", "--"]
CMD ["/app/trail", "--data-dir", "/app/traildepot", "run", "--address", "0.0.0.0:4000", "--dev"]

HEALTHCHECK CMD curl --fail http://localhost:4000/api/healthcheck || exit 1