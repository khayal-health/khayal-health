# Multi-stage Dockerfile for KhayalHealthcare

# Stage 1: Build the frontend
FROM node:18-alpine AS frontend-builder

# Install build dependencies
RUN apk add --no-cache python3 make g++

WORKDIR /app/frontend

# Copy frontend package files
COPY KhayalHealthcare-Frontend/package*.json ./

# Install dependencies with error handling
RUN npm ci --max-old-space-size=4096 || \
    (echo "npm ci failed, trying npm install" && \
     npm install --max-old-space-size=4096)

# Copy frontend source code
COPY KhayalHealthcare-Frontend/ ./

# Debug: Check environment before build
RUN echo "=== Pre-build checks ===" && \
    node --version && \
    npm --version && \
    ls -la && \
    echo "=== package.json scripts ===" && \
    cat package.json | grep -A10 '"scripts"'

# Build the frontend with error handling
ENV NODE_OPTIONS="--max-old-space-size=4096"
RUN npm run build || \
    (echo "=== Build failed, showing error details ===" && \
     ls -la && \
     npm run build --verbose && \
     exit 1)

# Verify build output
RUN echo "=== Build completed, checking output ===" && \
    ls -la dist/ && \
    find dist -type f | head -20

# Stage 2: Setup the backend and serve everything
FROM python:3.12-slim

# Install system dependencies and clean up in one layer
RUN apt-get update && \
    apt-get install -y --no-install-recommends \
    gcc \
    g++ \
    python3-dev \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy backend requirements
COPY KhayalHealthcare-Backend/requirements.txt ./

# Upgrade pip and install Python dependencies with better error handling
RUN --mount=type=cache,target=/root/.cache/pip \
    pip install --upgrade pip setuptools wheel && \
    echo "=== Installing requirements ===" && \
    pip install --no-cache-dir -r requirements.txt || \
    (echo "=== Pip install failed, showing requirements ===" && \
     cat requirements.txt && \
     pip install --no-cache-dir -r requirements.txt -v && \
     exit 1)

# Copy the backend application
COPY KhayalHealthcare-Backend/app ./app

# Create static directory for frontend files
RUN mkdir -p static

# Copy built frontend from the previous stage
COPY --from=frontend-builder /app/frontend/dist/. ./static/

# Verify static files
RUN echo "=== Verifying deployment ===" && \
    ls -la static/ | head -10 && \
    test -f static/index.html || (echo "ERROR: index.html not found!" && exit 1)

# Set environment variables
ENV PYTHONPATH=/app
ENV PYTHONUNBUFFERED=1
ENV PORT=7860

# Create a startup script
COPY <<'EOF' /app/start.sh
#!/bin/sh
# Set default environment variables if not provided
export MONGODB_URL=${MONGODB_URL:-mongodb://localhost:27017}
export DATABASE_NAME=${DATABASE_NAME:-khayal_app}
export SECRET_KEY=${SECRET_KEY:-your-secret-key-here-make-it-long-and-secure}
export ALGORITHM=${ALGORITHM:-HS256}
export ACCESS_TOKEN_EXPIRE_MINUTES=${ACCESS_TOKEN_EXPIRE_MINUTES:-1440}
export PORT=${PORT:-7860}

# Log startup information
echo "Starting KhayalHealthcare application..."
echo "MongoDB URL: ${MONGODB_URL%@*}@***" # Hide password
echo "Database: $DATABASE_NAME"
echo "Port: $PORT"

# Start the application
exec python -m uvicorn app.main:app --host 0.0.0.0 --port $PORT --log-level info
EOF

RUN chmod +x /app/start.sh

# Expose the port
EXPOSE 7860

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD python -c "import urllib.request; urllib.request.urlopen('http://localhost:7860/health')" || exit 1

# Use the startup script as the entry point
CMD ["/app/start.sh"]
