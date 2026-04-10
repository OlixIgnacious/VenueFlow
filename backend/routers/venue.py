"""
Venue and Event Metadata API Router.
Handles retrieval of specific venue and event configurations by ID or active status.
"""
from fastapi import APIRouter, HTTPException, Query
from backend.services.firebase_client import firebase_client
from backend.models import VenueConfig, EventConfig
from typing import Dict, Any, Optional

router = APIRouter()

@router.get("/current",
    summary="Get current venue and event",
    description="Returns the configuration data for both the venue and the associated event. Defaults to the active event if no ID is specified.")
async def get_current_venue_and_event(event_id: Optional[str] = Query(None)) -> Dict[str, Any]:
    """
    Retrieves the venue and event objects based on the active state or a specific ID.

    Args:
        event_id (Optional[str], optional): The specific event ID to fetch. Defaults to the active one.

    Returns:
        Dict[str, Any]: A dictionary containing 'venue' and 'event' configuration models.

    Raises:
        HTTPException: 404 if the active event, specific event, or venue metadata is missing.
    """
    # Resolve the target event ID
    active_event_id = event_id or firebase_client.get_active_event_id()
    if not active_event_id:
        raise HTTPException(status_code=404, detail="No active event found")

    # Fetch event details
    event_data = firebase_client.get_event(active_event_id)
    if not event_data:
        raise HTTPException(status_code=404, detail=f"Event {active_event_id} not found")

    # Fetch associated venue details
    venue_id = event_data.get('venue_id')
    venue_data = firebase_client.get_venue(venue_id)
    if not venue_data:
        raise HTTPException(status_code=404, detail=f"Venue {venue_id} not found")

    # Inject IDs back into the data for model reconciliation
    venue_data['id'] = venue_id
    event_data['id'] = active_event_id

    return {
        "venue": VenueConfig(**venue_data),
        "event": EventConfig(**event_data)
    }
