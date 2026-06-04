# ─────────────────────────────────────────────────────────────
# Stage 1: Build the React frontend
# ─────────────────────────────────────────────────────────────
FROM node:20-alpine AS frontend-builder

WORKDIR /build/frontend

# Install dependencies first (cached layer unless package files change)
COPY frontend/package.json frontend/package-lock.json* ./
RUN npm ci --silent

# Copy source and build
COPY frontend/ .
RUN npm run build
# Output lands in /build/static/react (Vite outDir: '../static/react')


# ─────────────────────────────────────────────────────────────
# Stage 2: Django application
# ─────────────────────────────────────────────────────────────
FROM python:3.12-slim AS app

# System deps needed by deepface / opencv / psycopg2
RUN apt-get update && apt-get install -y --no-install-recommends \
    libpq-dev \
    libgl1 \
    libglib2.0-0 \
    libsm6 \
    libxrender1 \
    libxext6 \
    gcc \
    && rm -rf /var/lib/apt/lists/*

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1

WORKDIR /app

# Install Python dependencies
COPY requirements.txt .
RUN pip install -r requirements.txt

# Copy project source
COPY . .

# Copy the built React assets from Stage 1
COPY --from=frontend-builder /build/static/react ./static/react

# collectstatic runs at container start (entrypoint.sh) when env vars are available

# Ensure the logs directory exists
RUN mkdir -p logs

# Ensure entrypoint is executable
RUN chmod +x docker/entrypoint.sh

EXPOSE 8000

ENTRYPOINT ["docker/entrypoint.sh"]
