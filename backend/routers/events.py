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
    
    # Ensure ID is included in the response
    result = {}
    for eid, data in events_data.items():
        data['id'] = eid
        result[eid] = EventConfig(**data)
        
    return result
