FROM trailbase/trailbase:latest AS base
USER root
RUN apk add --no-cache sqlite curl rsync

WORKDIR /app

# Copy to template directory (won't be overwritten by volume mount)
COPY --chown=trailbase:trailbase traildepot/ /app/traildepot-template/

# Create initialization script
RUN cat > /app/init-traildepot.sh << 'EOF' && \
    chmod +x /app/init-traildepot.sh && \
    chown trailbase:trailbase /app/init-traildepot.sh
#!/bin/sh
# Sync all template content to mounted volume, preserving existing files
cp -r /app/traildepot-template/* /app/traildepot/ 2>/dev/null || true
# Handle hidden files separately
cp -r /app/traildepot-template/.[^.]* /app/traildepot/ 2>/dev/null || true
exec "$@"
EOF

USER trailbase

EXPOSE 4000
ENTRYPOINT ["tini", "--", "/app/init-traildepot.sh"]
CMD ["/app/trail", "--data-dir", "/app/traildepot", "run", "--address", "0.0.0.0:4000", "--dev"]

HEALTHCHECK CMD curl --fail http://localhost:4000/api/healthcheck || exit 1