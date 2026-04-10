"""
VenueFlow Backend API - FastAPI Entry Point.

This module orchestrates the backend services, including:
- FastAPI application initialization.
- Lifecycle management (startup/shutdown of background tasks).
- CORS and Rate Limiting middleware.
- Custom request/response logging.
- API route aggregation.
- Static file serving for the React frontend.
"""
import logging
import time
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import Response, FileResponse
from backend.routers import venue, entry_points, recommend, admin, events, tickets
from backend.config import settings
from contextlib import asynccontextmanager
import os

from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
from backend.services.simulator import simulator

# ─── Logging Configuration ────────────────────────────────────────────────────
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s — %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)
logger = logging.getLogger("venueflow")

# ─── App Lifecycle ────────────────────────────────────────────────────────────
@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Manages the application lifecycle.
    
    Performs startup checks for configuration and external dependencies,
    and starts/stops the background crowd simulator.
    """
    if not settings.ADMIN_API_KEY:
        logger.error("[CRITICAL] ADMIN_API_KEY is not set. Admin endpoints will be unusable.")
        raise RuntimeError("ADMIN_API_KEY environment variable is required.")
        
    logger.info("VenueFlow API starting up")
    
    # Check if Firebase is initialized
    import firebase_admin
    if not firebase_admin._apps:
        logger.error("[CRITICAL] Firebase was not initialized. Startup aborted.")
        raise RuntimeError("Firebase initialization failed. Check FIREBASE_SERVICE_CREDENTIALS.")
        
    # Start the background crowd simulator
    simulator.start()
    
    yield
    
    logger.info("VenueFlow API shutting down")
    simulator.stop()

# ─── App Setup ────────────────────────────────────────────────────────────────
# Initialize rate limiter
limiter = Limiter(key_func=get_remote_address)
# Initialize the FastAPI app with our custom lifecycle manager
app = FastAPI(
    title="VenueFlow API", 
    description="AI-powered venue crowd management and entry recommendation system.",
    version="1.0.0", 
    lifespan=lifespan
)
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# ─── CORS configuration ───────────────────────────────────────────────────────
# Explicitly allow the configured origin and standard local origins
ALLOWED_ORIGINS = [settings.ALLOWED_ORIGIN] if settings.ALLOWED_ORIGIN else ["http://localhost:5173"]
logger.info(f"CORS allow_origins: {ALLOWED_ORIGINS}")
app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ─── Request/Response Logging Middleware ──────────────────────────────────────
@app.middleware("http")
async def log_requests(request: Request, call_next) -> Response:
    """
    Middleware to log every incoming request and its corresponding response time.
    """
    start = time.perf_counter()
    origin = request.headers.get("origin", "-")
    logger.info(f"→ {request.method} {request.url.path}  origin={origin}")

    response = await call_next(request)

    elapsed_ms = (time.perf_counter() - start) * 1000
    status = response.status_code
    level = logging.WARNING if status >= 400 else logging.INFO
    logger.log(level, f"← {status} {request.url.path}  [{elapsed_ms:.1f}ms]")
    return response

# ─── Routers ──────────────────────────────────────────────────────────────────
app.include_router(events.router,       prefix="/api/events",    tags=["Events"])
app.include_router(tickets.router,      prefix="/api/tickets",   tags=["Tickets"])
app.include_router(venue.router,        prefix="/api/venue",     tags=["Venue"])
app.include_router(entry_points.router, prefix="/api",           tags=["Entry Points"])
app.include_router(recommend.router,    prefix="/api/recommend", tags=["Recommendation"])
app.include_router(admin.router,        prefix="/api/admin",     tags=["Admin"])

@app.get("/api/health")
async def health_check():
    """
    Service health check endpoint.
    Returns:
        dict: Status and version information.
    """
    return {"status": "ok", "version": "1.0.0"}

# ─── Static files for React (only if built) ───────────────────────────────────
# If the frontend has been built into the 'static' directory, serve it as the root.
static_dir = os.path.join(os.path.dirname(__file__), "static")
if os.path.exists(static_dir):
    @app.get("/{full_path:path}")
    async def serve_spa_frontend(full_path: str):
        """
        Catch-all route to serve static assets or fallback to index.html for SPA routing.
        """
        # 1. Check if the requested path corresponds to a real file in static_dir
        # This handles favicon.ico, assets/..., etc.
        file_path = os.path.join(static_dir, *full_path.split("/"))
        if os.path.isfile(file_path):
            return FileResponse(file_path)
        
        # 2. Prevent API routes from being swallowed by the catch-all.
        # This allows FastAPI's native router (and its redirect_slashes logic) 
        # to handle these appropriately.
        if full_path.startswith("api"):
            return Response(content='{"detail":"Not Found"}', status_code=404, media_type="application/json")
        
        # 3. Fallback to index.html for SPA routing (e.g., /staff, /entry)
        index_file = os.path.join(static_dir, "index.html")
        return FileResponse(index_file)

if __name__ == "__main__":
    """Run the application using Uvicorn when executed directly."""
    # ...
    import uvicorn
    # In production, use a high-performance ASGI server like Gunicorn with Uvicorn workers.
    # For local development and hackathons, uvicorn.run is sufficient.
    uvicorn.run(app, host="0.0.0.0", port=8000)
