#!/bin/sh
set -e

# Fix permissions for Railway volume if it exists
if [ -d "/app/data" ]; then
    # Change ownership to appuser if running as root
    if [ "$(id -u)" = "0" ]; then
        chown -R appuser:appgroup /app/data
        # Switch to appuser and run the server
        exec su-exec appuser ./server
    fi
fi

# If not root or no volume, just run the server
exec ./server
