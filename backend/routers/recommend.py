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

    # ── 1. Resolve active event context ──────────────────────────────────────
    # Try fetching as a Ticket ID first
    ticket_data = firebase_client.get_ticket(ref)
    
    if not ticket_data:
        # Reference is not a ticket ID. Treat as raw location info (e.g. manual entry "Block B")
        logger.info(f"[RECOMMEND] Reference '{ref}' is not a ticket ID. Treating as raw location.")
        
        # If no event_id provided, fallback to the system's active event
        if not event_id:
            event_id = firebase_client.get_active_event_id()
            logger.info(f"[RECOMMEND] Using system-wide active event_id='{event_id}' for raw reference")
        
        if not event_id:
             raise HTTPException(
                status_code=400,
                detail="Event context missing. Please provide an event_id for raw location routing."
            )

        # Create a synthetic ticket context for the rest of the flow
        ticket_data = {
            'event_id': event_id,
            'location_ref': ref,
            'status': 'valid' # Assume valid for general routing
        }
    else:
        # Automatically switch context if event_id is unspecified but ticket is valid
        if not event_id:
            event_id = ticket_data.get('event_id')
            logger.info(f"[RECOMMEND] Derived event_id='{event_id}' from ticket metadata")

    # ── 1b. Security Check: Is the event active? ─────────────────────────────
    event_data = firebase_client.get_event(event_id)
    if not event_data or event_data.get('status') not in ['active', 'live', 'upcoming']:
        logger.warning(f"[RECOMMEND] Attempted access to non-active event='{event_id}'")
        raise HTTPException(
            status_code=403,
            detail="This event is not currently active for entry routing."
        )
    
    # Ensure ticket matches the event (even if we just derived it)
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
    ref_value = ticket_data.get('location_ref', ref)
    system_prompt, user_message = build_gemini_prompts(venue, event, entry_points, ref_value)
    
    # DEBUG: Print exact prompt context for verification
    logger.info(f"[PROMPT_DEBUG] Target: {ref_value}")
    logger.info(f"[PROMPT_DEBUG] Context:\n{user_message}")
    
    recommendation_data = await gemini_client.generate_recommendation(system_prompt, user_message)

    # ── 5. Fallback if Gemini unavailable ─────────────────────────────────────
    if not recommendation_data:
        # RE-FETCH Fresh Data for Fallback (Avoid Stale AI-wait data)
        fresh_entry_data = firebase_client.get_entry_points(event_id)
        if not fresh_entry_data:
             fresh_entry_data = entry_points_data # Safety fallback
        
        # Re-map to model objects
        fresh_entries = [EntryPoint(id=eid, **data) for eid, data in fresh_entry_data.items()]
        
        from backend.utils.spatial import calculate_distance
        
        # Calculate fresh distances
        gate_distances = []
        for ep in fresh_entries:
            dist = calculate_distance(venue.coordinates, ep.coordinates)
            gate_distances.append((dist, ep))
        
        search_ref = ticket_data.get('location_ref', ref).lower()
        
        # 1. Filter for safe gates (density < 0.9)
        safe_gates = [(d, eg) for d, eg in gate_distances if eg.density < 0.9]
        
        # 2. Try to find a tag match within safe gates
        matching_safe_gates = [eg for d, eg in safe_gates if any(tag.lower() in search_ref for tag in eg.proximity_tags)]
        
        if matching_safe_gates:
            # Pick the lowest density match among safe options
            matching_safe_gates.sort(key=lambda x: x.density)
            best_entry = matching_safe_gates[0]
            reason_prefix = f"Found a safe path for '{search_ref}'."
        else:
            # 3. No safe match found, pivot to closest safe gate regardless of tags
            if safe_gates:
                # Get the mathematically closest safe gate
                safe_gates.sort(key=lambda x: x[0])
                best_entry = safe_gates[0][1]
                reason_prefix = f"Direct entry for {search_ref} is busy. Redirecting to closest safe gate."
            else:
                # 4. Crisis mode: All gates are >90% dense, pick the absolute minimum
                best_entry = min(fresh_entries, key=lambda x: x.density)
                reason_prefix = "All entries are critically congested. Routing to the least busy gate."

        logger.warning(f"[RECOMMEND] AI unavailable — smart spatial fallback: {best_entry.id}")
        
        recommendation_data = {
            "recommended_entry": best_entry.id,
            "wait_minutes": best_entry.wait_minutes,
            "crowd_level": best_entry.status,
            "reason": f"{reason_prefix} Recommending {best_entry.label}.",
            "alt_entry": "entry_A" if best_entry.id != "entry_A" else "entry_B",
            "tip": "AI reasoning unavailable - using spatial routing fallback.",
        }
    else:
        # Cache successful AI responses
        _recommendation_cache[cache_key] = recommendation_data
        logger.info(f"[RECOMMEND] AI success — recommended_entry='{recommendation_data.get('recommended_entry')}'")

    return Recommendation(**recommendation_data)
