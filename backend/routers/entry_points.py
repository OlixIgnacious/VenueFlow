from fastapi import APIRouter, HTTPException, Query
from backend.services.firebase_client import firebase_client
from backend.models import EntryPoint
from typing import List, Dict

router = APIRouter()

@router.get("/entry-points", response_model=Dict[str, EntryPoint])
async def get_entry_points(event_id: str = Query(None)):
    if not event_id:
        event_id = firebase_client.get_active_event_id()
    
    if not event_id:
        raise HTTPException(status_code=404, detail="No active event found")

    entry_points_data = firebase_client.get_entry_points(event_id)
    if not entry_points_data:
        return {}

    # Ensure each entry point has its ID
    result = {}
    for eid, data in entry_points_data.items():
        data['id'] = eid
        result[eid] = EntryPoint(**data)
        
    return result
