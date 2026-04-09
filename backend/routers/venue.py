from fastapi import APIRouter, HTTPException, Query
from backend.services.firebase_client import firebase_client
from backend.models import VenueConfig, EventConfig
from typing import Dict, Any, Optional

router = APIRouter()

@router.get("/current")
async def get_current_venue_and_event(event_id: Optional[str] = Query(None)):
    active_event_id = event_id or firebase_client.get_active_event_id()
    if not active_event_id:
        raise HTTPException(status_code=404, detail="No active event found")

    event_data = firebase_client.get_event(active_event_id)
    if not event_data:
        raise HTTPException(status_code=404, detail=f"Event {active_event_id} not found")

    venue_id = event_data.get('venue_id')
    venue_data = firebase_client.get_venue(venue_id)
    if not venue_data:
        raise HTTPException(status_code=404, detail=f"Venue {venue_id} not found")

    # Add IDs back to data for Pydantic validation if missing
    venue_data['id'] = venue_id
    event_data['id'] = active_event_id

    return {
        "venue": VenueConfig(**venue_data),
        "event": EventConfig(**event_data)
    }
