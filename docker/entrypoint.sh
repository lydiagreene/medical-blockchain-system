#!/bin/sh
set -e

# Wait for PostgreSQL to be ready
echo "Waiting for database..."
until python -c "
import sys, os
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'verifydoc.settings')
import django; django.setup()
from django.db import connection
connection.ensure_connection()
print('Database ready.')
" 2>/dev/null; do
  sleep 2
done

# Apply migrations
echo "Running migrations..."
python manage.py migrate --noinput

# Collect static files (WhiteNoise needs them even though Dockerfile already ran this;
# covers the case where the image is used with a mounted volume)
echo "Collecting static files..."
python manage.py collectstatic --noinput --clear

echo "Starting Gunicorn..."
exec gunicorn verifydoc.wsgi:application \
  --bind 0.0.0.0:8000 \
  --workers 3 \
  --timeout 120 \
  --access-logfile - \
  --error-logfile -
