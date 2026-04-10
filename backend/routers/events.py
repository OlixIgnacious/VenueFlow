"""
Events Discovery API Router.
Handles identifying and listing events available for attendees and staff.
"""
from fastapi import APIRouter, HTTPException
from backend.services.firebase_client import firebase_client
from backend.models import EventConfig
from typing import Dict

router = APIRouter()

@router.get("/list", response_model=Dict[str, EventConfig],
    summary="List all events",
    description="Returns a map of all available events, including resolved venue names, for use in the discovery and entry dashboard.")
async def list_events() -> Dict[str, EventConfig]:
    """
    Retrieves all available events and enriches them with venue metadata.

    Returns:
        Dict[str, EventConfig]: A mapping of event IDs to their full configurations,
                               including resolved venue names.
    """
    events_data = firebase_client.get_active_events()
    if not events_data:
        return {}
    
    # Cache venues to avoid redundant lookups within the same request
    venues_cache = {}

    result = {}
    for eid, data in events_data.items():
        # Only include active events in the general listing
        if data.get('status') != 'active':
            continue
            
        data['id'] = eid
        
        # Populate venue_name for display in list views
        venue_id = data.get('venue_id')
        if venue_id:
            if venue_id not in venues_cache:
                v_data = firebase_client.get_venue(venue_id)
                venues_cache[venue_id] = v_data.get('name') if v_data else "Unknown Venue"
            data['venue_name'] = venues_cache[venue_id]
            
        result[eid] = EventConfig(**data)
        
    return result
