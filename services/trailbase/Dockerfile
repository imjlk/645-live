FROM trailbase/trailbase:0.14.0 AS base

WORKDIR /app

COPY --chown=trailbase traildepot /app/traildepot

USER root

EXPOSE 4000
ENTRYPOINT ["tini", "--"]
CMD ["/app/trail", "--data-dir", "/app/traildepot", "run", "--address", "0.0.0.0:4000", "--dev", "--js-runtime-threads", "0", "--disable-auth-ui"]