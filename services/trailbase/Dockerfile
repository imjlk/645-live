FROM trailbase/trailbase:0.14.1 AS base

WORKDIR /app

COPY --chown=trailbase traildepot /app/traildepot

USER root

EXPOSE 4000
ENTRYPOINT ["tini", "--"]
CMD ["/app/trail", "--data-dir", "/app/traildepot", "run", "--address", "0.0.0.0:4000", "--cors-allowed-origins", "www.645.live", "--js-runtime-threads", "0", "--disable-auth-ui"]