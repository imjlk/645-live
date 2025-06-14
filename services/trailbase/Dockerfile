FROM trailbase/trailbase:0.14.0 AS base
USER root
RUN apk add --no-cache sqlite \
    && addgroup trailbase \
    && adduser -S -G trailbase trailbase

WORKDIR /app

# Copy traildepot to temporary location
COPY --chown=trailbase traildepot /tmp/traildepot-init

# Copy initialization script
COPY --chown=trailbase init-traildepot.sh /app/init-traildepot.sh

# Create directory structure for volume mounting
RUN mkdir -p /app/traildepot && chown trailbase:trailbase /app/traildepot

# Declare volume mount point
VOLUME ["/app/traildepot"]

# Make script executable
RUN chmod +x /app/init-traildepot.sh

USER trailbase

EXPOSE 4000
ENTRYPOINT ["tini", "--"]
CMD ["/app/init-traildepot.sh"]