import logging
from fastapi import APIRouter, HTTPException, Request
from slowapi import Limiter
from slowapi.util import get_remote_address
from backend.services.firebase_client import firebase_client
from backend.models import Ticket

logger = logging.getLogger(__name__)

router = APIRouter()
limiter = Limiter(key_func=get_remote_address)


@router.get("/{ticket_id}", response_model=Ticket)
@limiter.limit("10/minute")
async def get_ticket(request: Request, ticket_id: str):
    logger.info(f"[TICKET] Scan request for ticket_id='{ticket_id}'")

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

    # Check if already used
    if ticket_data.get('status') == 'inside':
        logger.warning(f"[TICKET] Duplicate scan attempt — ticket_id='{ticket_id}' is already 'inside'")
        raise HTTPException(
            status_code=403,
            detail=f"Ticket {ticket_id} has already been scanned. Duplicate entry is not permitted."
        )

    # Mark as used
    firebase_client.update_ticket_status(ticket_id, 'inside')
    logger.info(f"[TICKET] ✓ ticket_id='{ticket_id}' marked as 'inside'")

    ticket_data['id'] = ticket_id
    ticket_data['status'] = 'inside'
    return Ticket(**ticket_data)
