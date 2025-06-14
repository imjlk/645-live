#!/bin/sh
if [ ! -f /app/traildepot/.initialized ]; then
    echo "Initializing traildepot..."
    cp -r /tmp/traildepot-init/* /app/traildepot/
    touch /app/traildepot/.initialized
    echo "Traildepot initialization completed."
else
    echo "Traildepot already initialized, skipping..."
fi

# Start the application
exec /app/trail --data-dir /app/traildepot run --address trail.645.live --cors-allowed-origins "https://www.645.live --js-runtime-threads 0 --disable-auth-ui --dev"