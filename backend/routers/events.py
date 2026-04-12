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
    import logging
    logger = logging.getLogger("venueflow")
    
    if not events_data:
        logger.warning("[EVENTS] firebase_client.get_active_events() returned NOTHING")
        return {}
    
    logger.info(f"[EVENTS] Successfully retrieved {len(events_data)} raw events from Firebase")
    
    # Cache venues to avoid redundant lookups within the same request
    venues_cache = {}

    result = {}
    for eid, data in events_data.items():
        status = data.get('status')
        logger.info(f"[EVENTS] Iterating: id='{eid}' status='{status}'")
        
        # Only include active/upcoming/live events in the general listing
        if status not in ['active', 'upcoming', 'live']:
            logger.info(f"[EVENTS] Skipping '{eid}' due to status filter")
            continue
            
        try:
            data['id'] = eid
            venue_id = data.get('venue_id')
            if venue_id:
                if venue_id not in venues_cache:
                    v_data = firebase_client.get_venue(venue_id)
                    venues_cache[venue_id] = v_data.get('name') if v_data else "Unknown Venue"
                data['venue_name'] = venues_cache[venue_id]
            
            event_obj = EventConfig(**data)
            result[eid] = event_obj
            logger.info(f"[EVENTS] Successfully added '{eid}' to result")
        except Exception as e:
            logger.error(f"[EVENTS] Failed to process eventID='{eid}': {e}")
            continue
            
    logger.info(f"[EVENTS] Returning {len(result)} events to frontend")
    return result
