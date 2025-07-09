# =========================================================================
# Stage 1: Build the React/Vue/Angular Frontend
# =========================================================================
FROM node:18-alpine AS frontend-builder

WORKDIR /app

# A .dockerignore file is crucial.
COPY KhayalHealthcare-Frontend/package*.json ./

# Use npm ci for faster, more reliable builds.
RUN npm ci --max-old-space-size=4096

# Copy the rest of the frontend source code
COPY KhayalHealthcare-Frontend/ ./

# Set environment variables to prevent warnings from failing the build
# and to reduce memory usage by not generating source maps.
ENV CI=false
ENV GENERATE_SOURCEMAP=false
ENV NODE_OPTIONS="--max-old-space-size=4096"

# Run the build command
RUN npm run build

# =========================================================================
# Stage 2: Build Python Dependencies
# Use a full image with build tools to compile packages into wheels.
# =========================================================================
FROM python:3.12-bookworm AS backend-builder

WORKDIR /app

# Install pip wheel tool
RUN pip install --upgrade pip wheel

# Copy requirements and build wheels. This compiles any C extensions.
COPY KhayalHealthcare-Backend/requirements.txt ./
RUN pip wheel -r requirements.txt -w /wheels

# =========================================================================
# Stage 3: Create the Final Production Image
# Use a lightweight slim image and install pre-built packages.
# =========================================================================
FROM python:3.12-slim

WORKDIR /app

# Set environment variables to prevent Python from writing .pyc files
ENV PYTHONDONTWRITEBYTECODE 1
ENV PYTHONUNBUFFERED 1

# Copy requirements file and the pre-compiled wheels from the backend-builder stage
COPY KhayalHealthcare-Backend/requirements.txt ./
COPY --from=backend-builder /wheels /wheels

# Install the Python dependencies from the local wheels.
# This does NOT require gcc/g++ and is very fast and memory-efficient.
# --no-index prevents pip from going to the internet (PyPI).
# --find-links tells pip to look in the /wheels directory for packages.
RUN pip install --no-cache-dir --no-index --find-links=/wheels -r requirements.txt

# Copy the backend application code
COPY KhayalHealthcare-Backend/app/ ./

# Copy the built frontend assets from the 'frontend-builder' stage
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

# Run the application using the startup script
# Assumes your FastAPI app instance is named 'app' in '/app/main.py'
CMD ["/app/start.sh"]
