from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from backend.routers import venue, entry_points, recommend, admin, events, tickets
from backend.config import settings
from contextlib import asynccontextmanager
import os

from backend.services.simulator import simulator

@asynccontextmanager
async def lifespan(app: FastAPI):
    simulator.start()
    yield
    simulator.stop()

app = FastAPI(title="VenueFlow API", version="1.0.0", lifespan=lifespan)

print("Starting VenueFlow API with CORS allow_origins=['*']")
# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(events.router, prefix="/api/events", tags=["Events"])
app.include_router(tickets.router, prefix="/api/tickets", tags=["Tickets"])
app.include_router(venue.router, prefix="/api/venue", tags=["Venue"])
app.include_router(entry_points.router, prefix="/api", tags=["Entry Points"])
app.include_router(recommend.router, prefix="/api/recommend", tags=["Recommendation"])
app.include_router(admin.router, prefix="/api/admin", tags=["Admin"])

@app.get("/api/health")
async def health_check():
    return {"status": "ok", "version": "1.0.0"}

# Static files for React (only if directory exists)
static_dir = os.path.join(os.path.dirname(__file__), "static")
if os.path.exists(static_dir):
    app.mount("/", StaticFiles(directory=static_dir, html=True), name="static")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
