# =========================================================================
# Stage 1: Build the React/Vue/Angular Frontend
# =========================================================================
FROM node:18-alpine AS frontend-builder

WORKDIR /app

# A .dockerignore file is crucial to prevent local node_modules, .env, etc.,
# from being copied into the image.
# Copy only package.json and lock files first to leverage Docker cache.
COPY KhayalHealthcare-Frontend/package*.json ./

# Use npm ci for faster, more reliable builds in CI/CD environments.
# The memory flag helps prevent crashes on large projects.
RUN npm ci --max-old-space-size=4096

# Copy the rest of the frontend source code
COPY KhayalHealthcare-Frontend/ ./

# Set environment variables for the build process.
# CI=true is the default in many environments and can cause warnings to fail the build.
# Setting it to false can prevent this.
# Disabling source maps reduces memory usage and build time significantly.
ENV CI=false
ENV GENERATE_SOURCEMAP=false
ENV NODE_OPTIONS="--max-old-space-size=4096"

# Run the build command
RUN npm run build

# =========================================================================
# Stage 2: Build the Python Backend and Serve the Application
# =========================================================================
FROM python:3.12-slim

WORKDIR /app

# Set environment variables to prevent Python from writing .pyc files
ENV PYTHONDONTWRITEBYTECODE 1
ENV PYTHONUNBUFFERED 1

# Install build dependencies, install Python packages, then remove the build
# dependencies in the same layer to reduce final image size.
COPY KhayalHealthcare-Backend/requirements.txt ./
RUN apt-get update && \
    apt-get install -y --no-install-recommends gcc g++ python3-dev && \
    pip install --no-cache-dir -r requirements.txt && \
    apt-get purge -y --auto-remove gcc g++ python3-dev && \
    rm -rf /var/lib/apt/lists/*

# Copy the backend application code.
# Assuming your main.py is inside KhayalHealthcare-Backend/app/
# This copies the contents of that directory to /app in the container.
COPY KhayalHealthcare-Backend/app/ ./

# Copy the built frontend assets from the 'frontend-builder' stage
# The source path is /app/dist because that's the output of `npm run build`
# inside the `frontend-builder` stage's WORKDIR.
COPY --from=frontend-builder /app/dist ./static

# --- SECURITY WARNING ---
# Avoid hardcoding secrets. These are set as defaults in start.sh
# and should be overridden at runtime.
# Example: docker run -e SECRET_KEY='my_new_super_secret_key' ...
ENV MONGODB_URL=mongodb+srv://noman:2xTLMDSy@cluster0.akzsxic.mongodb.net
ENV DATABASE_NAME=khayal_app
ENV SECRET_KEY=your-secret-key-here-make-it-long-and-secure
ENV ALGORITHM=HS256
ENV ACCESS_TOKEN_EXPIRE_MINUTES=1440

# Create a startup script for better flexibility
# This allows setting a default PORT and overriding it via environment variables.
RUN echo '#!/bin/sh' > /app/start.sh && \
    echo 'set -e' >> /app/start.sh && \
    echo 'PORT=${PORT:-7860}' >> /app/start.sh && \
    echo '' >> /app/start.sh && \
    echo 'echo "--- Starting KhayalHealthcare Application on port $PORT ---"' >> /app/start.sh && \
    echo 'echo "Verifying static files:"' >> /app/start.sh && \
    echo 'ls -lA /app/static' >> /app/start.sh && \
    echo '' >> /app/start.sh && \
    echo 'exec uvicorn main:app --host 0.0.0.0 --port $PORT --log-level info' >> /app/start.sh && \
    chmod +x /app/start.sh

# Expose the default port
EXPOSE 7860

# Run the application
CMD ["/app/start.sh"]
