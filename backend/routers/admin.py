from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from backend.services.firebase_client import firebase_client
from backend.services.simulator import simulator

router = APIRouter()

class ActivateEventRequest(BaseModel):
    event_id: str

@router.post("/activate")
async def activate_event(request: ActivateEventRequest):
    event_id = request.event_id
    event_data = firebase_client.get_event(event_id)
    if not event_data:
        raise HTTPException(status_code=404, detail=f"Event {event_id} not found")
        
    firebase_client.set_active_event(event_id)
    # Simulator will pick up the new event_id on its next tick
    return {"message": f"Event {event_id} is now active", "event": event_data}

@router.post("/simulate/tick")
async def manual_tick():
    simulator.update_once()
    return {"message": "Simulator tick executed manually"}
