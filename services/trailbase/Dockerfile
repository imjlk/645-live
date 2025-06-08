FROM trailbase/trailbase:0.12.0 AS base
USER root
RUN apk add --no-cache sqlite

WORKDIR /app

COPY traildepot /app/traildepot-template
RUN chown -R trailbase:trailbase /app/traildepot-template && \
    chmod -R 755 /app/traildepot-template

# Create init script to handle volume permissions
RUN echo '#!/bin/sh\n\
# Fix permissions on mounted volume\n\
if [ -d "/app/traildepot" ]; then\n\
    sudo chown -R trailbase:trailbase /app/traildepot\n\
    sudo chmod -R 755 /app/traildepot\n\
else\n\
    cp -r /app/traildepot-template /app/traildepot\n\
    chown -R trailbase:trailbase /app/traildepot\n\
fi\n\
exec "$@"' > /app/init.sh && \
    chmod +x /app/init.sh

# Allow trailbase user to use sudo for chown
RUN echo "trailbase ALL=(ALL) NOPASSWD: /bin/chown, /bin/chmod" >> /etc/sudoers

USER trailbase

EXPOSE 4000
ENTRYPOINT ["tini", "--", "/app/init.sh"]
CMD ["/app/trail", "--data-dir", "/app/traildepot", "run", "--address", "0.0.0.0:4000", "--dev"]

HEALTHCHECK CMD curl --fail http://localhost:4000/api/healthcheck || exit 1