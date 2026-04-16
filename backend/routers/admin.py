"""
Administrative API Router.
Handles protected operations such as event activation, manual simulator control,
and ticket status resets for testing and management.
"""
import logging
from fastapi import APIRouter, HTTPException, Depends, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from slowapi import Limiter
from slowapi.util import get_remote_address
from pydantic import BaseModel
from backend.services.firebase_client import firebase_client
from backend.services.gemini_client import gemini_client
from backend.services.simulator import simulator
from backend.config import settings

logger = logging.getLogger(__name__)

router = APIRouter()
security = HTTPBearer()
limiter = Limiter(key_func=get_remote_address)


def verify_admin_key(credentials: HTTPAuthorizationCredentials = Depends(security)) -> str:
    """
    Security dependency to verify the administrative API key.

    Args:
        credentials (HTTPAuthorizationCredentials): The bearer token from the request header.

    Returns:
        str: The validated API key string.

    Raises:
        HTTPException: 403 if the provided key does not match the configured ADMIN_API_KEY.
    """
    if credentials.credentials != settings.ADMIN_API_KEY:
        logger.warning("[ADMIN] Rejected request — invalid API key")
        raise HTTPException(status_code=403, detail="Invalid admin API key")
    return credentials.credentials


class ActivateEventRequest(BaseModel):
    """Schema for the event activation request."""
    event_id: str


@router.post("/activate",
    summary="Activate event",
    description="Changes the system-wide 'active_event' pointer in Firebase. This dictates which event tickets are validated against.")
@limiter.limit("5/minute")
async def activate_event(request: Request, event_req: ActivateEventRequest, admin_key: str = Depends(verify_admin_key)):
    """
    Sets a specific event as the active one in the system.

    Args:
        request (Request): The incoming FastAPI request.
        event_req (ActivateEventRequest): Validated request body containing the event_id.
        admin_key (str): Validated admin key from dependency.

    Returns:
        dict: Confirmation message and the activated event's metadata.

    Raises:
        HTTPException: 404 if the event_id does not exist in Firebase.
    """
    event_id = event_req.event_id
    logger.info(f"[ADMIN] Activating event_id='{event_id}'")
    event_data = firebase_client.get_event(event_id)
    if not event_data:
        raise HTTPException(status_code=404, detail=f"Event {event_id} not found")
    firebase_client.set_active_event(event_id)
    logger.info(f"[ADMIN] Event '{event_id}' is now active")
    return {"message": f"Event {event_id} is now active", "event": event_data}


@router.post("/simulate/tick",
    summary="Manual simulator tick",
    description="Forces the Crowd Simulator to update entry point metrics immediately. Used for debugging or demonstrating live updates.")
@limiter.limit("5/minute")
async def manual_tick(request: Request, admin_key: str = Depends(verify_admin_key)):
    """
    Triggers a manual update of the crowd density simulator.

    Args:
        request (Request): The incoming FastAPI request.
        admin_key (str): Validated admin key from dependency.

    Returns:
        dict: Confirmation message.
    """
    simulator.update_once()
    logger.info("[ADMIN] Manual simulator tick executed")
    return {"message": "Simulator tick executed manually"}


@router.post("/reset-ticket/{ticket_id}",
    summary="Reset ticket status",
    description="Administrative tool to reset a ticket's status back to 'valid' for re-testing end-to-end flows.")
@limiter.limit("5/minute")
async def reset_ticket(request: Request, ticket_id: str, admin_key: str = Depends(verify_admin_key)):
    """
    Resets a ticket's status to 'valid' in Firebase.
    """
    ticket_data = firebase_client.get_ticket(ticket_id)
    if not ticket_data:
        raise HTTPException(status_code=404, detail=f"Ticket {ticket_id} not found")
    firebase_client.update_ticket_status(ticket_id, "valid")
    logger.info(f"[ADMIN] Ticket '{ticket_id}' reset to 'valid'")
    return {"message": f"Ticket {ticket_id} reset to valid", "ticket_id": ticket_id}


@router.get("/dispatch-advice/{event_id}",
    summary="AI Dispatcher Advice",
    description="Consults Gemini 2.5 Flash to analyze current gate loads and staff presence to suggest optimal re-assignments.")
async def get_dispatch_advice(event_id: str, admin_key: str = Depends(verify_admin_key)):
    """
    Analyzes crowd dynamics and staff distribution to provide relocation advice.
    """
    # 1. Gather Context
    entry_points = firebase_client.get_entry_points(event_id)
    presence_ref = firebase_client.db.reference(f'/staff_presence/{event_id}')
    presence_data = presence_ref.get() or {}
    
    if not entry_points:
        return {"recommendations": [], "analysis": "Insufficient data (no entry points)."}

    # 2. Build AI Prompt
    system_prompt = (
        "You are the VenueFlow AI Command Controller. Your goal is to minimize wait times "
        "by optimally distributing staff across venue gates. You will be provided with "
        "gate loads and current staff positions. Suggest re-assignments only if there is a "
        "clear imbalance (e.g., a 'high' load gate with 0-1 staff, while a 'low' gate has 2+)."
    )
    
    gate_context = []
    for eid, ep in entry_points.items():
        staff_count = sum(1 for p in presence_data.values() if p.get('current_gate_id') == eid)
        gate_context.append(f"- Gate {ep.get('label')}: {ep.get('status')} load, Status: {ep.get('status_label')}, Wait: {ep.get('wait_minutes')}m, Staff Count: {staff_count}")

    staff_context = []
    for uid, p in presence_data.items():
        staff_context.append(f"- {p.get('name')} ({uid}): At {p.get('current_gate_id') or 'Unassigned'}, Status: {p.get('status')}")

    user_msg = (
        f"CONTEXT:\n"
        f"Gates:\n{chr(10).join(gate_context)}\n"
        f"Staff:\n{chr(10).join(staff_context)}\n\n"
        "TASK: Provide optimal re-assignments. Return JSON list: "
        "`[{'staff_uid': '...', 'staff_name': '...', 'target_gate_id': '...', 'reason': '...'}]`. "
        "Limit to max 2 high-impact suggestions."
    )

    # 3. Call Gemini
    advice = await gemini_client.generate_recommendation(system_prompt, user_msg)
    
    return {
        "event_id": event_id,
        "recommendations": advice if isinstance(advice, list) else [],
        "timestamp": firebase_client.get_timestamp()
    }

