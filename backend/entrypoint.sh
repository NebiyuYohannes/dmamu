#!/bin/sh
set -e

if [ -n "${PORT}" ] && echo "$@" | grep -q "gunicorn"; then
  echo "→ Detected Render PORT=${PORT}, updating gunicorn bind address..."
  i=1
  while [ $i -le $# ]; do
    eval "arg=\${$i}"
    if [ "$arg" = "0.0.0.0:8000" ]; then
      set -- "${@:1:$((i-1))}" "0.0.0.0:${PORT}" "${@:$((i+1))}"
      break
    fi
    i=$((i + 1))
  done
fi

echo "🚀 Starting habsify backend..."

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