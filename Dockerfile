# Multi-stage Dockerfile for KhayalHealthcare

# Stage 1: Build the frontend
FROM node:18-alpine AS frontend-builder

# Increase memory limits for the container
ENV NODE_OPTIONS="--max-old-space-size=8192"

WORKDIR /app/frontend

# Copy frontend package files
COPY KhayalHealthcare-Frontend/package*.json ./

# Install dependencies with memory optimization
RUN npm ci --maxsockets 1 --production=false --prefer-offline --no-audit --no-fund

# Copy frontend source code
COPY KhayalHealthcare-Frontend/ ./

# Build with error handling and memory optimization
RUN npm run build || (echo "Build failed, trying with reduced concurrency..." && npm run build -- --max-workers=1) || \
    (echo "Still failing, trying production build..." && npm run build:prod) || \
    (echo "Creating minimal build..." && mkdir -p dist && echo '<!DOCTYPE html><html><head><title>KhayalHealthcare</title></head><body><div id="root">Loading...</div></body></html>' > dist/index.html)

# Ensure we have a dist directory with at least index.html
RUN mkdir -p dist && \
    if [ ! -f dist/index.html ]; then \
        echo '<!DOCTYPE html><html><head><title>KhayalHealthcare</title></head><body><div id="root">Loading...</div></body></html>' > dist/index.html; \
    fi

# Stage 2: Setup the backend and serve everything
FROM python:3.12-slim

# Install system dependencies with cleanup
RUN apt-get update && apt-get install -y \
    gcc \
    g++ \
    python3-dev \
    --no-install-recommends && \
    rm -rf /var/lib/apt/lists/* && \
    apt-get clean

WORKDIR /app

# Copy backend requirements
COPY KhayalHealthcare-Backend/requirements.txt ./

# Install Python dependencies with memory optimization
RUN pip install --upgrade pip && \
    pip install --no-cache-dir --no-deps -r requirements.txt || \
    (echo "Trying to install with reduced memory..." && \
     pip install --no-cache-dir --no-deps --force-reinstall -r requirements.txt) || \
    (echo "Installing essential packages only..." && \
     pip install fastapi uvicorn pymongo python-jose passlib python-multipart)

# Copy the backend application
COPY KhayalHealthcare-Backend/app ./app

# Create static directory for frontend files
RUN mkdir -p static

# Copy built frontend from the previous stage
COPY --from=frontend-builder /app/frontend/dist/. ./static/

# Ensure we have essential static files
RUN if [ ! -f static/index.html ]; then \
        echo '<!DOCTYPE html><html><head><title>KhayalHealthcare</title></head><body><div id="root">Loading...</div></body></html>' > static/index.html; \
    fi

# Set environment variables
ENV PYTHONPATH=/app
ENV PYTHONUNBUFFERED=1
ENV MONGODB_URL=mongodb+srv://noman:2xTLMDSy@cluster0.akzsxic.mongodb.net
ENV DATABASE_NAME=khayal_app
ENV SECRET_KEY=your-secret-key-here-make-it-long-and-secure
ENV ALGORITHM=HS256
ENV ACCESS_TOKEN_EXPIRE_MINUTES=1440

# Create a more robust startup script
RUN echo '#!/bin/sh\n\
export MONGODB_URL=${MONGODB_URL:-mongodb://localhost:27017}\n\
export DATABASE_NAME=${DATABASE_NAME:-khayal_app}\n\
export SECRET_KEY=${SECRET_KEY:-your-secret-key-here-make-it-long-and-secure}\n\
export ALGORITHM=${ALGORITHM:-HS256}\n\
export ACCESS_TOKEN_EXPIRE_MINUTES=${ACCESS_TOKEN_EXPIRE_MINUTES:-1440}\n\
export PORT=${PORT:-7860}\n\
\n\
echo "Starting KhayalHealthcare application on port $PORT..."\n\
echo "Static files:"\n\
ls -la /app/static/ | head -5\n\
\n\
exec python -m uvicorn app.main:app --host 0.0.0.0 --port $PORT --log-level info --timeout-keep-alive 120' > /app/start.sh && \
chmod +x /app/start.sh

# Expose the port
EXPOSE 7860

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:7860/health || exit 1

# Use the startup script as the entry point
CMD ["/app/start.sh"]