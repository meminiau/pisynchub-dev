# ==============================================================================
# Stage 1: Build the Modern React / TypeScript UI
# ==============================================================================
FROM node:20-slim AS frontend-builder
WORKDIR /build

# Install dependencies
COPY package*.json ./
RUN npm install

# Copy source and build static distribution
COPY . .
RUN npm run build

# ==============================================================================
# Stage 2: Lean Production Runtime (FastAPI Backend + Static UI)
# ==============================================================================
FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    CONFIG_DIR=/config \
    PORT=8085

# Install system utilities & clean up package cache
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Install Python backend dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy FastAPI backend code
COPY app.py .

# Copy compiled frontend from Stage 1 directly into FastAPI's static directory
COPY --from=frontend-builder /build/dist ./static

# Ensure persistent backup and config directories exist
RUN mkdir -p /config/backups

EXPOSE 8085

HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:8085/api/health || exit 1

CMD ["uvicorn", "app:app", "--host", "0.0.0.0", "--port", "8085"]
