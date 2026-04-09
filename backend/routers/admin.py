import logging
from fastapi import APIRouter, HTTPException, Depends, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from slowapi import Limiter
from slowapi.util import get_remote_address
from pydantic import BaseModel
from backend.services.firebase_client import firebase_client
from backend.services.simulator import simulator
from backend.config import settings

logger = logging.getLogger(__name__)

router = APIRouter()
security = HTTPBearer()
limiter = Limiter(key_func=get_remote_address)


def verify_admin_key(credentials: HTTPAuthorizationCredentials = Depends(security)):
    if credentials.credentials != settings.ADMIN_API_KEY:
        logger.warning("[ADMIN] Rejected request — invalid API key")
        raise HTTPException(status_code=403, detail="Invalid admin API key")
    return credentials.credentials


class ActivateEventRequest(BaseModel):
    event_id: str


@router.post("/activate")
@limiter.limit("5/minute")
async def activate_event(request: Request, event_req: ActivateEventRequest, admin_key: str = Depends(verify_admin_key)):
    event_id = event_req.event_id
    logger.info(f"[ADMIN] Activating event_id='{event_id}'")
    event_data = firebase_client.get_event(event_id)
    if not event_data:
        raise HTTPException(status_code=404, detail=f"Event {event_id} not found")
    firebase_client.set_active_event(event_id)
    logger.info(f"[ADMIN] Event '{event_id}' is now active")
    return {"message": f"Event {event_id} is now active", "event": event_data}


@router.post("/simulate/tick")
@limiter.limit("5/minute")
async def manual_tick(request: Request, admin_key: str = Depends(verify_admin_key)):
    simulator.update_once()
    logger.info("[ADMIN] Manual simulator tick executed")
    return {"message": "Simulator tick executed manually"}


@router.post("/reset-ticket/{ticket_id}")
@limiter.limit("5/minute")
async def reset_ticket(request: Request, ticket_id: str, admin_key: str = Depends(verify_admin_key)):
    """Reset a ticket's status back to 'valid' for re-testing."""
    ticket_data = firebase_client.get_ticket(ticket_id)
    if not ticket_data:
        raise HTTPException(status_code=404, detail=f"Ticket {ticket_id} not found")
    firebase_client.update_ticket_status(ticket_id, "valid")
    logger.info(f"[ADMIN] Ticket '{ticket_id}' reset to 'valid'")
    return {"message": f"Ticket {ticket_id} reset to valid", "ticket_id": ticket_id}
