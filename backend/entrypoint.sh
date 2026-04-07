#!/bin/sh
set -e

echo "🚀 Starting habsify backend..."

# Render.com dynamic port support (replaces hardcoded 0.0.0.0:8000)
if [ -n "${PORT}" ] && echo "$@" | grep -q "gunicorn"; then
  echo "→ Detected Render PORT=${PORT}, updating gunicorn bind address..."
  new_args=""
  for arg in "$@"; do
    if [ "$arg" = "0.0.0.0:8000" ]; then
      new_args="$new_args 0.0.0.0:${PORT}"
    else
      new_args="$new_args $arg"
    fi
  done
  eval "set -- $new_args"
fi

# Run migrations for web OR worker
if echo "$@" | grep -q -E "gunicorn|celery"; then
    echo "→ Running migrations..."
    uv run python manage.py migrate --noinput
fi

if [ -n "$DJANGO_SUPERUSER_USERNAME" ]; then
  echo "→ Creating superuser (if not exists)..."
  uv run python manage.py createsuperuser --noinput || true
fi

echo "→ Starting: $@"
exec "$@"
