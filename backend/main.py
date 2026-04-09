import logging
import time
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import Response
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
    logger.info("VenueFlow API starting up")
    simulator.start()
    yield
    logger.info("VenueFlow API shutting down")
    simulator.stop()

# ─── App Setup ────────────────────────────────────────────────────────────────
limiter = Limiter(key_func=get_remote_address)
app = FastAPI(title="VenueFlow API", version="1.0.0", lifespan=lifespan)
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# ─── CORS — allow both localhost & 127.0.0.1 ──────────────────────────────────
ALLOWED_ORIGINS = [
    settings.ALLOWED_ORIGIN,          # from .env  (e.g. http://localhost:5173)
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:3000",
]
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
    return {"status": "ok", "version": "1.0.0"}

# ─── Static files for React (only if built) ───────────────────────────────────
static_dir = os.path.join(os.path.dirname(__file__), "static")
if os.path.exists(static_dir):
    app.mount("/", StaticFiles(directory=static_dir, html=True), name="static")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
