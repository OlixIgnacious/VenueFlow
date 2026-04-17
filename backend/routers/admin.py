"""
Administrative API Router.
Handles protected operations such as event activation, manual simulator control,
and ticket status resets for testing and management.
"""
import logging
from firebase_admin import db
from fastapi import APIRouter, HTTPException, Depends, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from slowapi import Limiter
from slowapi.util import get_remote_address
from pydantic import BaseModel
from backend.utils.auth_middleware import get_current_user
from backend.services.firebase_client import firebase_client
from backend.services.gemini_client import gemini_client
from backend.services.simulator import simulator
from backend.config import settings

logger = logging.getLogger(__name__)

router = APIRouter()
security = HTTPBearer()
limiter = Limiter(key_func=get_remote_address)


async def verify_admin_user(user: dict = Depends(get_current_user)) -> dict:
    """
    Security dependency to verify that the current user has an 'admin' role.
    """
    uid = user.get("uid")
    user_ref = db.reference(f'/users/{uid}')
    user_data = user_ref.get()
    
    if not user_data or user_data.get("role") != "admin":
        logger.warning(f"[ADMIN] Unauthorized access attempt by user {uid}")
        raise HTTPException(status_code=403, detail="Admin privileges required")
    return user_data


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
async def get_dispatch_advice(event_id: str, admin: dict = Depends(verify_admin_user)):
    """
    Analyzes crowd dynamics and staff distribution to provide relocation advice.
    """
    # 1. Gather Context
    entry_points = firebase_client.get_entry_points(event_id)
    presence_ref = db.reference(f'/staff_presence/{event_id}')
    presence_data = presence_ref.get() or {}
    
    if not entry_points:
        return {"recommendations": [], "analysis": "Insufficient data (no entry points)."}

    # 2. Build AI Prompt
    system_prompt = (
        "You are the VenueFlow AI Command Controller. Your goal is to minimize wait times "
        "by optimally distributing staff across venue gates. You will be provided with "
        "gate loads and current staff positions. Suggest re-assignments if a 'high' or 'critical' "
        "load gate is understaffed, especially if there is idle staff at 'low' load gates."
    )
    
    gate_context = []
    for eid, ep in entry_points.items():
        staff_count = sum(1 for p in presence_data.values() if p.get('current_gate_id') == eid)
        gate_context.append(f"- Gate {ep.get('label')} (ID: {eid}): Load={ep.get('status')}, Wait={ep.get('wait_minutes')}m, Current Staff={staff_count}")

    staff_context = []
    for uid, p in presence_data.items():
        staff_context.append(f"- {p.get('name')} (ID: {uid}): At {p.get('current_gate_id') or 'Unassigned'}, Status: {p.get('status')}")

    user_msg = (
        f"CRITICAL OPS DATA:\n"
        f"GATES STATUS:\n{chr(10).join(gate_context)}\n"
        f"STAFF STATUS:\n{chr(10).join(staff_context)}\n\n"
        "DIRECTIVE: You must reduce wait times at 'critical' or 'high' gates immediately. "
        "Locate gates with excess staff (more than 5 staff at a 'low' load gate) and re-assign them to unstaffed 'critical' gates. "
        "Return ONLY a JSON list of objects: "
        "`[{'staff_uid': '...', 'staff_name': '...', 'target_gate_id': '...', 'reason': '...'}]`. "
        "Provide up to 5 high-impact re-assignments."
    )

    # 3. Call Gemini
    advice = await gemini_client.generate_recommendation(system_prompt, user_msg)
    
    return {
        "event_id": event_id,
        "recommendations": advice if isinstance(advice, list) else [],
        "timestamp": firebase_client.get_timestamp()
    }


class DispatchRequest(BaseModel):
    event_id: str
    staff_uid: str
    target_gate_id: str
    message: str = ""


@router.post("/dispatch",
    summary="Dispatch Personnel",
    description="Broadcasts a tactical redirection order to a staff member.")
async def dispatch_personnel(req: DispatchRequest, admin: dict = Depends(verify_admin_user)):
    """
    Sends a notification to a staff member and updates their expected status.
    """
    event_id = req.event_id
    staff_uid = req.staff_uid
    gate_id = req.target_gate_id
    
    # 1. Update Staff Presence status to 'dispatched'
    presence_ref = db.reference(f'/staff_presence/{event_id}/{staff_uid}')
    presence_ref.update({
        "status": "dispatched"
    })
    
    # 2. Add Notification to Staff Feed
    notif_ref = db.reference(f'/staff_notifications/{staff_uid}')
    notif_ref.push({
        "message": req.message or f"Tactical Redirection: Please move to gate {gate_id} immediately.",
        "target_gate_id": gate_id,
        "sender_name": admin.get("name", "Command"),
        "timestamp": firebase_client.get_timestamp(),
        "status": "unread",
        "acknowledged_at": None
    })
    
    logger.info(f"[ADMIN] Dispatch order sent to {staff_uid} for gate {gate_id}")
    return {"message": "Dispatch order broadcasted"}


@router.get("/personnel/{event_id}",
    summary="Personnel Oversight",
    description="Returns a merged view of all staff assigned to an event and their current real-time presence status.")
async def get_event_personnel(event_id: str, admin: dict = Depends(verify_admin_user)):
    """
    Fetches staff list and merges with RTDB presence data.
    """
    users_ref = db.reference('/users')
    all_users = users_ref.get() or {}
    
    presence_ref = db.reference(f'/staff_presence/{event_id}')
    presence_data = presence_ref.get() or {}
    
    personnel = []
    for uid, u in all_users.items():
        if u.get('role') == 'staff' and event_id in u.get('assigned_events', []):
            presence = presence_data.get(uid)
            personnel.append({
                "uid": uid,
                "name": u.get("name", "Unknown Staff"),
                "email": u.get("email"),
                "is_online": presence is not None,
                "presence": presence,
                "last_reported": presence.get("last_reported") if presence else None
            })
            
    return personnel

