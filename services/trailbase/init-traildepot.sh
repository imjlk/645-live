#!/bin/sh
if [ ! -f /app/traildepot/.initialized ]; then
    echo "Initializing traildepot..."
    cp -r /tmp/traildepot-init/* /app/traildepot/
    touch /app/traildepot/.initialized
    echo "Traildepot initialization completed."
else
    echo "Traildepot already initialized, skipping..."
fi