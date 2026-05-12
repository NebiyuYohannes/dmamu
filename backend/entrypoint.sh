#!/bin/sh
set -e

echo "🚀 Starting habsify backend..."

# ======================
# Detect Python Runner
# ======================
if command -v uv >/dev/null 2>&1; then
  RUN="uv run"
  echo "→ Using uv"
else
  RUN=""
  echo "→ Using system python"
fi

# ======================
# Wait for Database
# ======================
echo "→ Waiting for database..."
MAX_RETRIES=30
RETRIES=0

until $RUN python -c "
import django
django.setup()
from django.db import connection
connection.ensure_connection()
" >/dev/null 2>&1; do
  RETRIES=$((RETRIES + 1))
  if [ $RETRIES -ge $MAX_RETRIES ]; then
    echo "❌ Database connection failed after $MAX_RETRIES attempts."
    exit 1
  fi
  echo "⏳ DB not ready (attempt $RETRIES/$MAX_RETRIES)..."
  sleep 2
done
echo "✅ Database is ready!"

# ======================
# Run Migrations
# ======================
echo "→ Running migrations..."
$RUN python manage.py migrate --noinput

# ======================
# Collect Static Files (Production only)
# ======================
if [ "$DEBUG" != "True" ]; then
  echo "→ Collecting static files..."
  $RUN python manage.py collectstatic --noinput --clear
fi

# ======================
# Create Superuser if Environment Variables are Set
# ======================
if [ -n "$DJANGO_SUPERUSER_USERNAME" ] && [ -n "$DJANGO_SUPERUSER_EMAIL" ] && [ -n "$DJANGO_SUPERUSER_PASSWORD" ]; then
  echo "→ Creating superuser if not exists..."
  $RUN python manage.py createsuperuser --noinput 2>/dev/null \
    || echo "ℹ️  Superuser already exists, skipping."
fi

# ======================
# Start Application
# ======================
echo "✅ Initialization complete. Starting: $*"
exec "$@"