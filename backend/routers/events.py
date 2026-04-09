from fastapi import APIRouter, HTTPException
from backend.services.firebase_client import firebase_client
from backend.models import EventConfig
from typing import Dict

router = APIRouter()

@router.get("/list", response_model=Dict[str, EventConfig])
async def list_events():
    events_data = firebase_client.get_active_events()
    if not events_data:
        return {}
    
    # Cache venues to avoid redundant lookups
    venues_cache = {}

    result = {}
    for eid, data in events_data.items():
        data['id'] = eid
        
        # Populate venue_name
        venue_id = data.get('venue_id')
        if venue_id:
            if venue_id not in venues_cache:
                v_data = firebase_client.get_venue(venue_id)
                venues_cache[venue_id] = v_data.get('name') if v_data else "Unknown Venue"
            data['venue_name'] = venues_cache[venue_id]
            
        result[eid] = EventConfig(**data)
        
    return result
