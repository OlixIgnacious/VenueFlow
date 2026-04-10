# Stage 1: Build the React frontend
FROM node:20-slim AS frontend-builder
WORKDIR /frontend
COPY frontend/package.json frontend/package-lock.json ./
RUN npm install
COPY frontend/ ./
# Inject dummy env vars for build time (actual ones from Secret Manager)
RUN VITE_MAPS_API_KEY=placeholder npm run build

# Stage 2: Serve with FastAPI
FROM python:3.11-slim
WORKDIR /app

# Install dependencies
COPY backend/requirements.txt .
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    python3-dev \
    libffi-dev \
    libssl-dev \
    && rm -rf /var/lib/apt/lists/*
RUN pip install --no-cache-dir -r requirements.txt

# Copy backend code
COPY backend/ ./backend

# Copy static files from Stage 1
COPY --from=frontend-builder /frontend/dist ./backend/static

# Environment variables
ENV PORT=8080
ENV PYTHONPATH=/app

EXPOSE 8080

CMD ["uvicorn", "backend.main:app", "--host", "0.0.0.0", "--port", "8080"]
