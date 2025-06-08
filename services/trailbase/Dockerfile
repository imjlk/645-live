FROM trailbase/trailbase:latest AS base
USER root
RUN apk add --no-cache sqlite

WORKDIR /app

COPY --chown=trailbase:trailbase traildepot/ /app/traildepot/

USER trailbase

EXPOSE 4000
ENTRYPOINT ["tini", "--"]
CMD ["/app/trail", "--data-dir", "/app/traildepot", "run", "--address", "0.0.0.0:4000", "--dev"]

HEALTHCHECK CMD curl --fail http://localhost:4000/api/healthcheck || exit 1