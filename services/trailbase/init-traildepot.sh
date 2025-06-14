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
exec trail --data-dir /app/traildepot run --dev --address 0.0.0.0:4000 --js-runtime-threads 0 --disable-auth-ui