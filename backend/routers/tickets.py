from fastapi import APIRouter, HTTPException
from backend.services.firebase_client import firebase_client
from backend.models import Ticket

router = APIRouter()

@router.get("/{ticket_id}", response_model=Ticket)
async def get_ticket(ticket_id: str):
    ticket_data = firebase_client.get_ticket(ticket_id)
    if not ticket_data:
        raise HTTPException(status_code=404, detail=f"Ticket {ticket_id} not found")
    
    ticket_data['id'] = ticket_id
    return Ticket(**ticket_data)
