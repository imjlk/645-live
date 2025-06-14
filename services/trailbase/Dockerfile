FROM trailbase/trailbase:0.14.0 AS base
USER root
RUN apk add --no-cache sqlite tini \
    && addgroup trailbase \
    && adduser -S -G trailbase trailbase

WORKDIR /app

# Prepare host-mounted volume directory
RUN mkdir -p /app/traildepot

# Declare volume mount point (provided via docker-compose)
VOLUME ["/app/traildepot"]

USER trailbase

EXPOSE 4000
ENTRYPOINT ["tini", "--", "sh", "-c"]
CMD ["trail --data-dir /app/traildepot run --dev --address 0.0.0.0:4000 --js-runtime-threads 0 --disable-auth-ui"]