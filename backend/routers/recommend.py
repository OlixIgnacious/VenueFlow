import logging
import time
from fastapi import APIRouter, HTTPException, Query, Request
from typing import Optional
from slowapi import Limiter
from slowapi.util import get_remote_address
from backend.services.firebase_client import firebase_client
from backend.services.gemini_client import gemini_client
from backend.prompt_builder import build_gemini_prompts
from backend.models import Recommendation, VenueConfig, EventConfig, EntryPoint

logger = logging.getLogger(__name__)

router = APIRouter()
limiter = Limiter(key_func=get_remote_address)

# Simple in-memory cache: (event_id, ref) -> (timestamp, recommendation_data)
_recommendation_cache = {}
CACHE_TTL = 300  # 5 minutes — reduces repeated Gemini calls on free-tier key


@router.get("/", response_model=Recommendation)
@limiter.limit("30/minute")
async def get_recommendation(
    request: Request,
    ref: str,
    event_id: Optional[str] = Query(None)
):
    logger.info(f"[RECOMMEND] Request for ref='{ref}' event_id='{event_id}'")

    # ── 1. Resolve active event ───────────────────────────────────────────────
    if not event_id:
        event_id = firebase_client.get_active_event_id()
        logger.info(f"[RECOMMEND] Resolved active event_id='{event_id}' from Firebase")

    if not event_id:
        logger.error("[RECOMMEND] No active event found in Firebase — returning 404")
        raise HTTPException(status_code=404, detail="No active event found")

    # ── 2. Cache check ────────────────────────────────────────────────────────
    cache_key = (event_id, ref)
    if cache_key in _recommendation_cache:
        timestamp, cached_data = _recommendation_cache[cache_key]
        age = time.time() - timestamp
        if age < CACHE_TTL:
            logger.info(f"[RECOMMEND] Cache HIT (age={age:.1f}s) — returning cached result")
            return Recommendation(**cached_data)
        else:
            logger.debug(f"[RECOMMEND] Cache EXPIRED (age={age:.1f}s)")

    # ── 3. Fetch context from Firebase ────────────────────────────────────────
    logger.info(f"[RECOMMEND] Fetching event data for event_id='{event_id}'")
    event_data = firebase_client.get_event(event_id)
    if not event_data:
        logger.error(f"[RECOMMEND] Event '{event_id}' not found in Firebase")
        raise HTTPException(status_code=404, detail=f"Event {event_id} not found")

    venue_id = event_data.get('venue_id')
    logger.info(f"[RECOMMEND] Fetching venue data for venue_id='{venue_id}'")
    venue_data = firebase_client.get_venue(venue_id)
    if not venue_data:
        logger.error(f"[RECOMMEND] Venue '{venue_id}' not found in Firebase")
        raise HTTPException(status_code=404, detail=f"Venue {venue_id} not found")

    logger.info(f"[RECOMMEND] Fetching entry points for event_id='{event_id}'")
    entry_points_data = firebase_client.get_entry_points(event_id)
    if not entry_points_data:
        logger.error(f"[RECOMMEND] No entry points found for event '{event_id}'")
        raise HTTPException(status_code=404, detail="No entry points found")

    logger.info(f"[RECOMMEND] Found {len(entry_points_data)} entry point(s)")

    event_data_copy = event_data.copy()
    event_data_copy.pop('id', None)
    venue_data_copy = venue_data.copy()
    venue_data_copy.pop('id', None)

    venue = VenueConfig(id=venue_id, **venue_data_copy)
    event = EventConfig(id=event_id, **event_data_copy)
    entry_points = [EntryPoint(id=eid, **data) for eid, data in entry_points_data.items()]

    # ── 4. Call Gemini AI ─────────────────────────────────────────────────────
    system_prompt, user_message = build_gemini_prompts(venue, event, entry_points, ref)
    recommendation_data = await gemini_client.generate_recommendation(system_prompt, user_message)

    # ── 5. Fallback if Gemini unavailable ─────────────────────────────────────
    if not recommendation_data:
        best_entry = min(entry_points, key=lambda x: x.density)
        logger.warning(
            f"[RECOMMEND] Gemini unavailable — rule-based fallback: best_entry='{best_entry.id}' "
            f"(density={best_entry.density:.2f}, wait={best_entry.wait_minutes}min)"
        )
        recommendation_data = {
            "recommended_entry": best_entry.id,
            "wait_minutes": best_entry.wait_minutes,
            "crowd_level": best_entry.status,
            "reason": f"Heading to {best_entry.label} as it currently has the lowest congestion.",
            "alt_entry": "entry_A" if best_entry.id != "entry_A" else "entry_B",
            "tip": "AI recommendation is currently unavailable, using real-time sensor data.",
        }
    else:
        _recommendation_cache[cache_key] = (time.time(), recommendation_data)
        logger.info(
            f"[RECOMMEND] AI success — recommended_entry='{recommendation_data.get('recommended_entry')}'"
        )

    return Recommendation(**recommendation_data)
