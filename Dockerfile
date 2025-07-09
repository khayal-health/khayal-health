# Multi-stage Dockerfile for KhayalHealthcare

# Stage 1: Build the frontend
FROM node:18-alpine AS frontend-builder

WORKDIR /app/frontend

# Copy frontend package files
COPY KhayalHealthcare-Frontend/package*.json ./

# Install dependencies with increased memory limit
RUN npm ci --max-old-space-size=4096

# Copy frontend source code AND public folder
COPY KhayalHealthcare-Frontend/ ./

# Build the frontend with increased memory limit
ENV NODE_OPTIONS="--max-old-space-size=8096"
RUN npm run build

# Debug: List built files
RUN echo "=== Listing dist directory ===" && \
    ls -la dist/ && \
    echo "=== Listing dist root files ===" && \
    ls -la dist/*.* || true && \
    echo "=== Checking for favicon ===" && \
    ls -la dist/favicon.svg || echo "favicon.svg not found" && \
    echo "=== Listing all dist contents ===" && \
    find dist -type f -name "*" | head -20

# Stage 2: Setup the backend and serve everything
FROM python:3.12-slim

# Install system dependencies
RUN apt-get update && apt-get install -y \
    gcc \
    g++ \
    python3-dev \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy backend requirements
COPY KhayalHealthcare-Backend/requirements.txt ./

# Upgrade pip and install Python dependencies
RUN pip install --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt

# Copy the backend application
COPY KhayalHealthcare-Backend/app ./app

# Create static directory for frontend files
RUN mkdir -p static

# Copy built frontend from the previous stage - IMPORTANT: preserve structure
COPY --from=frontend-builder /app/frontend/dist/. ./static/

# Debug: Verify static files were copied correctly
RUN echo "=== Verifying static files ===" && \
    ls -la static/ && \
    echo "=== Checking for favicon in static ===" && \
    ls -la static/favicon.svg || echo "favicon.svg not found in static" && \
    echo "=== Checking for index.html ===" && \
    ls -la static/index.html || echo "index.html not found" && \
    echo "=== Listing all static files ===" && \
    find static -type f | head -20

# Set environment variables
ENV PYTHONPATH=/app
ENV PYTHONUNBUFFERED=1
ENV MONGODB_URL=mongodb+srv://noman:2xTLMDSy@cluster0.akzsxic.mongodb.net
ENV DATABASE_NAME=khayal_app
ENV SECRET_KEY=your-secret-key-here-make-it-long-and-secure
ENV ALGORITHM=HS256
ENV ACCESS_TOKEN_EXPIRE_MINUTES=1440

# Create a startup script
RUN echo '#!/bin/sh\n\
# Set default environment variables if not provided\n\
export MONGODB_URL=${MONGODB_URL:-mongodb://localhost:27017}\n\
export DATABASE_NAME=${DATABASE_NAME:-khayal_app}\n\
export SECRET_KEY=${SECRET_KEY:-your-secret-key-here-make-it-long-and-secure}\n\
export ALGORITHM=${ALGORITHM:-HS256}\n\
export ACCESS_TOKEN_EXPIRE_MINUTES=${ACCESS_TOKEN_EXPIRE_MINUTES:-1440}\n\
export PORT=${PORT:-7860}\n\
\n\
# Log startup information\n\
echo "Starting KhayalHealthcare application..."\n\
echo "MongoDB URL: $MONGODB_URL"\n\
echo "Database: $DATABASE_NAME"\n\
echo "Port: $PORT"\n\
echo "Checking static files:"\n\
ls -la /app/static/ | head -10\n\
echo "Checking for favicon:"\n\
ls -la /app/static/favicon.svg || echo "favicon.svg not found"\n\
\n\
# Start the application\n\
exec python -m uvicorn app.main:app --host 0.0.0.0 --port $PORT --log-level info' > /app/start.sh && \
chmod +x /app/start.sh

# Expose the port
EXPOSE 7860

# Use the startup script as the entry point
CMD ["/app/start.sh"]
