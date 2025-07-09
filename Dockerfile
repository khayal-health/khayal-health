# ===============================================
# Stage 1: Build the frontend
# ===============================================
FROM node:18-alpine AS frontend-builder

WORKDIR /app/frontend

# Configure npm for better network handling (remove invalid timeout option)
RUN npm config set fetch-retry-mintimeout 20000 && \
    npm config set fetch-retry-maxtimeout 120000 && \
    npm config set fetch-retries 3 && \
    npm config set network-timeout 600000

# Only copy package files first for better caching
COPY KhayalHealthcare-Frontend/package*.json ./
RUN npm install --legacy-peer-deps --max-old-space-size=4096

# Now copy the rest of the frontend src
COPY KhayalHealthcare-Frontend/ ./

ENV NODE_OPTIONS="--max-old-space-size=4096"
RUN npm run build

# ===============================================
# Stage 2: Build the backend & final image
# ===============================================
FROM python:3.12-slim AS backend

# Avoid interactive frontend debconf warnings
ENV DEBIAN_FRONTEND=noninteractive

# Install required system packages (minimal)
RUN apt-get update && \
    apt-get install -y --no-install-recommends \
        gcc \
        g++ \
        python3-dev \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Install Python dependencies
COPY KhayalHealthcare-Backend/requirements.txt ./
RUN pip install --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt

# Copy backend code
COPY KhayalHealthcare-Backend/app ./app

# Prepare static folder for frontend build output
RUN mkdir -p static

# Copy frontend build from previous stage
COPY --from=frontend-builder /app/frontend/dist/. ./static/

# ========================
# Entrypoint script
# ========================
COPY --chown=root:root <<EOF /app/start.sh
#!/bin/sh
export MONGODB_URL="\${MONGODB_URL:-mongodb://localhost:27017}"
export DATABASE_NAME="\${DATABASE_NAME:-khayal_app}"
export SECRET_KEY="\${SECRET_KEY:-your-secret-key-here-make-it-long-and-secure}"
export ALGORITHM="\${ALGORITHM:-HS256}"
export ACCESS_TOKEN_EXPIRE_MINUTES="\${ACCESS_TOKEN_EXPIRE_MINUTES:-1440}"
export PORT="\${PORT:-7860}"

echo "Starting KhayalHealthcare application..."
echo "MongoDB URL: \$MONGODB_URL"
echo "Database: \$DATABASE_NAME"
echo "Port: \$PORT"
echo "Checking static files:"
ls -la /app/static/ | head -10
echo "Checking for favicon:"
ls -la /app/static/favicon.svg || echo "favicon.svg not found"
exec python -m uvicorn app.main:app --host 0.0.0.0 --port \$PORT --log-level info
EOF

RUN chmod +x /app/start.sh

# ========================
# Expose port and set entrypoint
# ========================
EXPOSE 7860

CMD ["/app/start.sh"]
