"""
Ticket Validation API Router.
Handles scanning, verifying, and updating the entry status of attendee tickets.
"""
import logging
from fastapi import APIRouter, HTTPException, Request
from slowapi import Limiter
from slowapi.util import get_remote_address
from backend.services.firebase_client import firebase_client
from backend.models import Ticket

logger = logging.getLogger(__name__)

router = APIRouter()
limiter = Limiter(key_func=get_remote_address)


@router.get("/{ticket_id}", response_model=Ticket,
    summary="Scan and validate ticket",
    description="Validates a ticket ID against the active event. If valid and not already used, marks the ticket as 'inside'. Returns 403 for event mismatch or duplicate scans.")
@limiter.limit("10/minute")
async def get_ticket(request: Request, ticket_id: str) -> Ticket:
    """
    Validates a ticket ID and marks it as used for the active event.

    Args:
        request (Request): The incoming FastAPI request.
        ticket_id (str): The unique identifier for the ticket.

    Returns:
        Ticket: The validated ticket data with updated status.

    Raises:
        HTTPException: 404 if ticket not found.
        HTTPException: 403 if ticket is for a different event or already scanned.
    """
    logger.info(f"[TICKET] Scan request for ticket_id='{ticket_id}'")

    # Fetch ticket data from Firebase
    ticket_data = firebase_client.get_ticket(ticket_id)
    if not ticket_data:
        logger.warning(f"[TICKET] ticket_id='{ticket_id}' NOT FOUND in Firebase")
        raise HTTPException(status_code=404, detail=f"Ticket {ticket_id} not found")

    logger.info(f"[TICKET] Found ticket — event_id='{ticket_data.get('event_id')}' status='{ticket_data.get('status', 'valid')}'")

    # Security check: Does this ticket belong to the active event?
    active_event_id = firebase_client.get_active_event_id()
    if ticket_data.get('event_id') != active_event_id:
        logger.warning(
            f"[TICKET] Event mismatch — ticket.event_id='{ticket_data.get('event_id')}' "
            f"active_event_id='{active_event_id}'"
        )
        raise HTTPException(
            status_code=403,
            detail=f"Ticket {ticket_id} is not for the currently active event."
        )

    # Prevent reuse of tickets
    if ticket_data.get('status') == 'inside':
        logger.warning(f"[TICKET] Duplicate scan attempt — ticket_id='{ticket_id}' is already 'inside'")
        raise HTTPException(
            status_code=403,
            detail=f"Ticket {ticket_id} has already been scanned. Duplicate entry is not permitted."
        )

    # Atomically mark as used in Firebase
    firebase_client.update_ticket_status(ticket_id, 'inside')
    logger.info(f"[TICKET] ✓ ticket_id='{ticket_id}' marked as 'inside'")

    # Return enriched ticket data
    ticket_data['id'] = ticket_id
    ticket_data['status'] = 'inside'
    return Ticket(**ticket_data)
