# Stage 1: Build the React frontend
FROM node:20-slim AS frontend-builder
WORKDIR /frontend
COPY frontend/package.json frontend/package-lock.json ./
RUN npm install
COPY frontend/ ./
ARG VITE_MAPS_API_KEY
ARG VITE_FIREBASE_API_KEY
ARG VITE_FIREBASE_PROJECT_ID
ARG VITE_FIREBASE_DATABASE_URL
RUN VITE_MAPS_API_KEY=$VITE_MAPS_API_KEY \
    VITE_FIREBASE_API_KEY=$VITE_FIREBASE_API_KEY \
    VITE_FIREBASE_PROJECT_ID=$VITE_FIREBASE_PROJECT_ID \
    VITE_FIREBASE_DATABASE_URL=$VITE_FIREBASE_DATABASE_URL \
    npm run build

# Stage 2: Serve with FastAPI
FROM python:3.11-slim
WORKDIR /app

# Install dependencies
COPY backend/requirements.txt .
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
