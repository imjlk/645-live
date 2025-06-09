#!/bin/sh

# Initialize traildepot if it doesn't exist
if [ ! -d "/app/traildepot" ]; then
    cp -r /app/traildepot-init /app/traildepot
fi

# Execute the original command
exec "$@"
