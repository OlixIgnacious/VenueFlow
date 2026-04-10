"""
Entry Points API Router.
Handles retrieval of venue entry points (gates) and their current occupancy/status.
"""
from fastapi import APIRouter, HTTPException, Query
from backend.services.firebase_client import firebase_client
from backend.models import EntryPoint
from typing import Dict

router = APIRouter()

@router.get("/entry-points", response_model=Dict[str, EntryPoint],
    summary="Get entry points for an event",
    description="Returns a list of all entry points (gates) for a specific event, including their current crowd density and capacity.")
async def get_entry_points(event_id: str = Query(None)) -> Dict[str, EntryPoint]:
    """
    Retrieves all configured entry points for a specific event.

    If no event_id is provided, it defaults to the currently active event.

    Args:
        event_id (str, optional): The unique ID of the event. Defaults to the active event.

    Returns:
        Dict[str, EntryPoint]: A mapping of entry point IDs to their configurations and metrics.

    Raises:
        HTTPException: 404 if no active event can be determined.
    """
    # Fallback to active event if not specified
    if not event_id:
        event_id = firebase_client.get_active_event_id()
    
    if not event_id:
        raise HTTPException(status_code=404, detail="No active event found")

    # Fetch entry points from Firebase
    entry_points_data = firebase_client.get_entry_points(event_id)
    if not entry_points_data:
        return {}

    # Ensure each entry point model is correctly instantiated with its ID
    result = {}
    for eid, data in entry_points_data.items():
        data['id'] = eid
        result[eid] = EntryPoint(**data)
        
    return result
