FROM trailbase/trailbase:0.12.0 AS base
USER root
RUN apk add --no-cache sqlite

WORKDIR /app

COPY traildepot /app/traildepot-init
COPY init.sh /app/init.sh
RUN chmod +x /app/init.sh && chown -R trailbase:trailbase /app

USER trailbase

EXPOSE 4000
ENTRYPOINT ["tini", "--", "/app/init.sh"]
CMD ["/app/trail", "--data-dir", "/app/traildepot", "run", "--address", "0.0.0.0:4000", "--dev"]

HEALTHCHECK CMD curl --fail http://localhost:4000/api/healthcheck || exit 1