# Multi-stage build for the application
FROM node:18-alpine AS frontend-builder

# Set working directory for frontend build
WORKDIR /app/frontend

# Copy frontend package files
COPY KhayalHealthcare-Frontend/package*.json ./

# Install frontend dependencies
RUN npm install --force

# Copy frontend source code
COPY KhayalHealthcare-Frontend/* ./

# Build frontend
RUN npm run build

# Python dependencies stage
FROM python:3.11-slim AS python-deps

# Install system dependencies
RUN apt-get update && apt-get install -y \
    gcc \
    && rm -rf /var/lib/apt/lists/*

# Set working directory
WORKDIR /app

# Copy backend requirements
COPY KhayalHealthcare-Backend/requirements.txt ./

# Install Python dependencies with memory optimization
RUN pip install --no-cache-dir --no-compile -r requirements.txt

# Final stage - Python runtime
FROM python:3.11-slim

# Install only runtime dependencies
RUN apt-get update && apt-get install -y \
    libpq5 \
    && rm -rf /var/lib/apt/lists/*

# Set working directory
WORKDIR /app

# Copy installed packages from python-deps stage
COPY --from=python-deps /usr/local/lib/python3.11/site-packages /usr/local/lib/python3.11/site-packages
COPY --from=python-deps /usr/local/bin /usr/local/bin

# Copy backend application code
COPY KhayalHealthcare-Backend/ ./

# Copy built frontend files from the builder stage to static directory
COPY --from=frontend-builder /app/frontend/dist ./static

# Create uploads directory structure
RUN mkdir -p uploads/advertisements

# Set environment variable for port
ENV PORT=7860

# Expose the port
EXPOSE 7860

# Start the application
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "7860"]
