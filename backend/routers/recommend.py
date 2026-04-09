from fastapi import APIRouter, HTTPException, Query
from typing import Optional
from backend.services.firebase_client import firebase_client
from backend.services.gemini_client import gemini_client
from backend.prompt_builder import build_gemini_prompts
from backend.models import Recommendation, VenueConfig, EventConfig, EntryPoint

router = APIRouter()

@router.get("/", response_model=Recommendation)
async def get_recommendation(
    ref: str, 
    event_id: Optional[str] = Query(None)
):
    if not event_id:
        event_id = firebase_client.get_active_event_id()
    
    if not event_id:
        raise HTTPException(status_code=404, detail="No active event found")

    # 1. Fetch Context
    event_data = firebase_client.get_event(event_id)
    venue_data = firebase_client.get_venue(event_data['venue_id'])
    entry_points_data = firebase_client.get_entry_points(event_id)

    venue = VenueConfig(id=event_data['venue_id'], **venue_data)
    event = EventConfig(id=event_id, **event_data)
    entry_points = [EntryPoint(id=eid, **data) for eid, data in entry_points_data.items()]

    # 2. Build Prompts
    system_prompt, user_message = build_gemini_prompts(venue, event, entry_points, ref)

    # 3. Call Gemini
    recommendation_data = await gemini_client.generate_recommendation(system_prompt, user_message)

    # 4. Fallback Logic
    if not recommendation_data:
        # Simple rule-based fallback: lowest density entry point
        best_entry = min(entry_points, key=lambda x: x.density)
        recommendation_data = {
            "recommended_entry": best_entry.id,
            "wait_minutes": best_entry.wait_minutes,
            "crowd_level": best_entry.status,
            "reason": f"Heading to {best_entry.label} as it currently has the lowest congestion.",
            "alt_entry": "entry_A" if best_entry.id != "entry_A" else "entry_B",
            "tip": "AI recommendation is currently unavailable, using real-time sensor data."
        }

    return Recommendation(**recommendation_data)
