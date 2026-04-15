from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from typing import Dict, Any
import logging
from backend.utils.auth_middleware import get_current_user
from firebase_admin import db
from slowapi import Limiter
from slowapi.util import get_remote_address
from fastapi import Request

logger = logging.getLogger(__name__)

router = APIRouter()
limiter = Limiter(key_func=get_remote_address)

class SyncUserRequest(BaseModel):
    name: str
    email: str
    role: str

@router.post("/sync")
@limiter.limit("5/minute")
async def sync_user(request_obj: Request, request: SyncUserRequest, user: Dict[str, Any] = Depends(get_current_user)):
    """
    Called by the frontend immediately after a user registers with Firebase Auth.
    Syncs the authenticated user to the Realtime Database to store role and metadata.
    """
    uid = user.get("uid")
    if not uid:
        raise HTTPException(status_code=401, detail="Invalid token")

    # Enforce allowed roles for public registration
    allowed_roles = ["attendee", "staff"]
    requested_role = request.role if request.role in allowed_roles else "attendee"

    user_ref = db.reference(f'/users/{uid}')
    existing_user = user_ref.get()

    if not existing_user:
        # Create new user profile
        new_user = {
            "name": request.name,
            "email": request.email,
            "role": requested_role
        }
        if requested_role == "staff":
            new_user["assigned_events"] = []
        if requested_role == "attendee":
            new_user["claimed_tickets"] = []
            
        user_ref.set(new_user)
        logger.info(f"Registered new user {uid} with role {requested_role}")
        return {"status": "created", "user": new_user}
    else:
        # User already exists
        return {"status": "exists", "user": existing_user}
