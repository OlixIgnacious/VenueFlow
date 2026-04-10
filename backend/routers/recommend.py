"""
Recommendation API Router.
Handles personalized venue entry guidance using AI and real-time crowd data.
"""
import logging
import time
from fastapi import APIRouter, HTTPException, Query, Request
from typing import Optional, Any
from slowapi import Limiter
from cachetools import TTLCache
from slowapi.util import get_remote_address
from backend.services.firebase_client import firebase_client
from backend.services.gemini_client import gemini_client
from backend.prompt_builder import build_gemini_prompts
from backend.models import Recommendation, VenueConfig, EventConfig, EntryPoint

logger = logging.getLogger(__name__)

router = APIRouter()
limiter = Limiter(key_func=get_remote_address)

# Memory-safe in-memory cache: (event_id, ref) -> recommendation_data
CACHE_TTL = 300  # 5 minutes
_recommendation_cache = TTLCache(maxsize=500, ttl=CACHE_TTL)


@router.get("", response_model=Recommendation,
    summary="Get AI entry recommendation",
    description="Returns the optimal venue entry point based on real-time crowd density and seat location. Results cached 5 min per (event_id, ref) pair.")
@limiter.limit("30/minute")
async def get_recommendation(
    request: Request,
    ref: str,
    event_id: Optional[str] = Query(None)
) -> Recommendation:
    """
    Orchestrates the AI recommendation flow for an attendee.

    Args:
        request (Request): FastAPI request object for rate limiting.
        ref (str): The seat or zone reference from the attendee's ticket.
        event_id (Optional[str]): Explicit event ID, defaults to the active event.

    Returns:
        Recommendation: Structured guidance including entry gate, wait time, and reasoning.

    Raises:
        HTTPException: 404 if no active event/venue found, 403 if ticket is invalid.
    """
    logger.info(f"[RECOMMEND] Request for ref='{ref}' event_id='{event_id}'")

    # ── 1. Resolve active event ───────────────────────────────────────────────
    if not event_id:
        event_id = firebase_client.get_active_event_id()
        logger.info(f"[RECOMMEND] Resolved active event_id='{event_id}' from Firebase")

    if not event_id:
        logger.error("[RECOMMEND] No active event found in Firebase — returning 404")
        raise HTTPException(status_code=404, detail="No active event found")

    # ── 1b. Validate Ticket ID (ref) ──────────────────────────────────────────
    ticket_data = firebase_client.get_ticket(ref)
    if not ticket_data:
        logger.warning(f"[RECOMMEND] Invalid ticket ID ref='{ref}'")
        raise HTTPException(
            status_code=403, 
            detail="Invalid ticket ID: The provided reference does not match any known ticket."
        )
    
    # Cross-check event_id
    if ticket_data.get('event_id') != event_id:
        logger.warning(f"[RECOMMEND] Ticket {ref} belongs to {ticket_data.get('event_id')}, not {event_id}")
        raise HTTPException(
            status_code=403,
            detail="Ticket mismatch: This ticket is not valid for the selected event."
        )

    # ── 2. Cache check ────────────────────────────────────────────────────────
    cache_key = (event_id, ref)
    if cache_key in _recommendation_cache:
        cached_data = _recommendation_cache[cache_key]
        logger.info("[RECOMMEND] Cache HIT — returning cached result")
        return Recommendation(**cached_data)

    # ── 3. Fetch context from Firebase ────────────────────────────────────────
    logger.info(f"[RECOMMEND] Fetching context for event_id='{event_id}'")
    event_data = firebase_client.get_event(event_id)
    if not event_data:
        raise HTTPException(status_code=404, detail=f"Event {event_id} not found")

    venue_id = event_data.get('venue_id')
    venue_data = firebase_client.get_venue(venue_id)
    if not venue_data:
        raise HTTPException(status_code=404, detail=f"Venue {venue_id} not found")

    entry_points_data = firebase_client.get_entry_points(event_id)
    if not entry_points_data:
        raise HTTPException(status_code=404, detail="No entry points found")

    # Prepare model instances for prompt builder
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
        # Simple distance-independent logic: pick the gate with the lowest density
        best_entry = min(entry_points, key=lambda x: x.density)
        logger.warning(f"[RECOMMEND] AI unavailable — rule-based fallback: {best_entry.id}")
        recommendation_data = {
            "recommended_entry": best_entry.id,
            "wait_minutes": best_entry.wait_minutes,
            "crowd_level": best_entry.status,
            "reason": f"Heading to {best_entry.label} as it currently has the lowest congestion.",
            "alt_entry": "entry_A" if best_entry.id != "entry_A" else "entry_B",
            "tip": "AI recommendation is currently unavailable, using real-time sensor data.",
        }
    else:
        # Cache successful AI responses
        _recommendation_cache[cache_key] = recommendation_data
        logger.info(f"[RECOMMEND] AI success — recommended_entry='{recommendation_data.get('recommended_entry')}'")

    return Recommendation(**recommendation_data)
