#!/bin/sh
set -e

echo "🚀 Starting habsify backend..."

# === ONLY run migrations + collectstatic in the WEB (Gunicorn) container ===
if [ "$1" = "uv" ] && [ "$2" = "run" ] && [ "$3" = "gunicorn" ]; then
    echo "→ Running migrations (web only)..."
    uv run python manage.py migrate --noinput

    echo "→ Collecting static files..."
    uv run python manage.py collectstatic --noinput --clear
fi

echo "→ Starting: $@"
exec "$@"