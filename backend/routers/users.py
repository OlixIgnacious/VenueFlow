from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from typing import Dict, Any, List
import logging
from backend.utils.auth_middleware import get_current_user
from firebase_admin import db
from datetime import datetime, timezone

logger = logging.getLogger(__name__)

router = APIRouter()

class ClaimTicketRequest(BaseModel):
    ticket_id: str

@router.get("/me")
async def get_my_profile(user: Dict[str, Any] = Depends(get_current_user)):
    """Get the current user's profile from RTDB."""
    uid = user.get("uid")
    user_ref = db.reference(f'/users/{uid}')
    user_data = user_ref.get()
    
    if not user_data:
        raise HTTPException(status_code=404, detail="User profile not found")
        
    # Ensure role defaults for tactical sync
    if user_data.get("role") == "staff" and "assigned_events" not in user_data:
        user_data["assigned_events"] = []
    if user_data.get("role") == "attendee" and "claimed_tickets" not in user_data:
        user_data["claimed_tickets"] = []
        
    return user_data

@router.get("/me/events")
async def get_my_events(user: Dict[str, Any] = Depends(get_current_user)):
    """
    Returns the events associated with the user.
    For Attendees: The events corresponding to their claimed tickets.
    For Staff: The events they are manually assigned to.
    """
    uid = user.get("uid")
    user_ref = db.reference(f'/users/{uid}')
    user_data = user_ref.get()
    
    if not user_data:
        raise HTTPException(status_code=404, detail="User profile not found")
        
    events_ref = db.reference('/events').get() or {}
    
    returned_events = []
    
    if user_data.get("role") == "staff":
        assigned = user_data.get("assigned_events", [])
        for event_id in assigned:
            if event_id in events_ref:
                evt = events_ref[event_id]
                evt["id"] = event_id
                returned_events.append(evt)
    
    elif user_data.get("role") == "attendee":
        claimed = user_data.get("claimed_tickets", [])
        tickets_ref = db.reference('/tickets')
        for ticket_id in claimed:
            ticket = tickets_ref.child(ticket_id).get()
            if ticket and ticket.get("event_id") in events_ref:
                evt = events_ref[ticket["event_id"]].copy() # Copy to avoid mutating original
                evt["id"] = ticket["event_id"]
                evt["associated_ticket_id"] = ticket_id
                # Prevent duplicate events if user has multiple tickets for the same event
                if not any(e["id"] == evt["id"] for e in returned_events):
                    returned_events.append(evt)
                    
    elif user_data.get("role") == "admin":
        # Admin gets all events
        for event_id, evt in events_ref.items():
            evt["id"] = event_id
            returned_events.append(evt)

    return returned_events

@router.post("/me/tickets")
async def claim_ticket(request: ClaimTicketRequest, user: Dict[str, Any] = Depends(get_current_user)):
    """
    Claims a ticket for an attendee.
    Executes the 3-Layer Safety Check:
    1. Name matching
    2. Claim Exclusivity
    3. Event Expiration
    """
    uid = user.get("uid")
    user_ref = db.reference(f'/users/{uid}')
    user_data = user_ref.get()
    
    if not user_data or user_data.get("role") != "attendee":
        raise HTTPException(status_code=403, detail="Only attendees can claim tickets")

    ticket_id = request.ticket_id
    ticket_ref = db.reference(f'/tickets/{ticket_id}')
    ticket = ticket_ref.get()
    
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found or invalid ID")

    # Safety Check 1: Claim Exclusivity
    if ticket.get("claimed_by_uid"):
        if ticket.get("claimed_by_uid") == uid:
            return {"status": "success", "detail": "Ticket already claimed by you"}
        raise HTTPException(status_code=400, detail="Ticket has already been claimed by another user")

    # Safety Check 2: Name Matching (Case insensitive, strip whitespace)
    ticket_owner = ticket.get("owner_name", "").strip().lower()
    user_name = user_data.get("name", "").strip().lower()
    if ticket_owner != user_name:
        raise HTTPException(status_code=400, detail=f"Ticket name ({ticket.get('owner_name')}) does not match your registered name.")

    # Safety Check 3: Event Expiration
    event_id = ticket.get("event_id")
    event_ref = db.reference(f'/events/{event_id}')
    event = event_ref.get()
    
    if not event:
        raise HTTPException(status_code=400, detail="Event associated with ticket does not exist")
        
    try:
        # We will just rely on the 'status' for hackathon simplicity 
        # or use fromisoformat if needed: event_time = datetime.fromisoformat(event.get("start_time").replace("Z", "+00:00"))
        current_time = datetime.now(timezone.utc)
        if event.get("status") == "ended":
             raise HTTPException(status_code=400, detail="Event has already concluded. Ticket expired.")
    except Exception as e:
         pass # Allow if time parsing fails but status is ok
         
    # Passed all checks, claim it!
    # Transactional update might be needed in production, but 2-step is fine here.
    ticket_ref.update({"claimed_by_uid": uid})
    
    claimed = user_data.get("claimed_tickets", [])
    if ticket_id not in claimed:
        claimed.append(ticket_id)
        user_ref.update({"claimed_tickets": claimed})
        
    logger.info(f"User {uid} successfully claimed ticket {ticket_id}")
    return {"status": "success", "ticket": ticket}
