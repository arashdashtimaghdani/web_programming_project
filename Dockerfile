# --- Stage 1: build dependencies ---
FROM python:3.12-slim AS builder

WORKDIR /app

# Install system dependencies needed for psycopg (PostgreSQL driver)
RUN apt-get update && apt-get install -y --no-install-recommends \
    libpq-dev gcc \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --upgrade pip && \
    pip install --prefix=/install -r requirements.txt

# --- Stage 2: runtime image ---
FROM python:3.12-slim

WORKDIR /app

# Runtime system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    libpq5 \
    && rm -rf /var/lib/apt/lists/*

# Copy installed packages from builder
COPY --from=builder /install /usr/local

# Copy project source
COPY . .

# Create non-root user for security
RUN addgroup --system django && adduser --system --ingroup django django
RUN chown -R django:django /app
USER django

# Collect static files
RUN python manage.py collectstatic --noinput

EXPOSE 8000

CMD ["python", "-m", "gunicorn", "backend.wsgi:application", "--bind", "0.0.0.0:8000", "--workers", "2"]
