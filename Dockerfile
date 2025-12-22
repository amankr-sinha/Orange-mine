# Multi-stage build: build frontend, then run backend (serving frontend static files)

# --- Frontend build stage ---
FROM node:20-alpine AS frontend-build
WORKDIR /app/frontend

# Install deps first (better layer caching)
COPY frontend/package.json frontend/package-lock.json* ./
RUN npm ci

# Build
COPY frontend/ ./
RUN npm run build


# --- Backend runtime stage ---
FROM python:3.12-slim AS runtime

# Some scientific Python wheels may need OpenMP at runtime
RUN apt-get update \
    && apt-get install -y --no-install-recommends libgomp1 \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Install backend deps
COPY backend/requirements.txt ./backend/requirements.txt
RUN pip install --no-cache-dir -r backend/requirements.txt

# Copy backend source
COPY backend/ ./backend/

# Copy built frontend into backend/static
COPY --from=frontend-build /app/frontend/dist ./backend/static

WORKDIR /app/backend

EXPOSE 5000

# Production server
CMD ["gunicorn", "-b", "0.0.0.0:5000", "app:app"]
