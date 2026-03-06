#!/bin/sh
set -e

# Fix permissions for Railway volume if it exists
if [ -d "/app/data" ] && [ "$(id -u)" = "0" ]; then
    chown -R appuser:appgroup /app/data
fi

# Always run as non-root user
if [ "$(id -u)" = "0" ]; then
    exec su-exec appuser ./server
fi

exec ./server
