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

import os

class SyncUserRequest(BaseModel):
    name: str
    email: str
    role: str
    service_key: str = None

@router.post("/sync")
@limiter.limit("100/minute")
async def sync_user(request: Request, sync_data: SyncUserRequest, user: Dict[str, Any] = Depends(get_current_user)):
    """
    Called by the frontend immediately after a user registers with Firebase Auth.
    Syncs the authenticated user to the Realtime Database to store role and metadata.
    """
    uid = user.get("uid")
    if not uid:
        raise HTTPException(status_code=401, detail="Invalid token")

    # Enforce allowed roles for public registration
    master_key = os.getenv("ADMIN_MASTER_KEY", "TACTICAL_2026")
    requested_role = sync_data.role
    
    # 1. Admin Master Key Bypass (Highest Priority)
    if sync_data.service_key == master_key:
        requested_role = "admin"
        logger.warning(f"CRITICAL: User {uid} promoted to ADMIN via Master Key")
    # 2. Test Email Bypass
    elif sync_data.email == "admin@venueflow.com":
        requested_role = "admin"
    # 3. Company Staff Auto-Enrollment
    elif sync_data.email.endswith("@venueflow.com"):
        requested_role = "staff"
    # 4. Standard Role Validation
    elif requested_role not in ["attendee", "staff"]:
        requested_role = "attendee"

    user_ref = db.reference(f'/users/{uid}')
    existing_user = user_ref.get()

    if not existing_user:
        # Create new user profile
        new_user = {
            "name": sync_data.name,
            "email": sync_data.email,
            "role": requested_role
        }
        if requested_role == "staff":
            # Auto-assign to the first 'live' event to enable Zero-Tap entry in demo
            events_ref = db.reference('/events').get() or {}
            live_event_ids = [eid for eid, e in events_ref.items() if e.get('status') == 'live']
            new_user["assigned_events"] = [live_event_ids[0]] if live_event_ids else []
        if requested_role == "attendee":
            new_user["claimed_tickets"] = []
            
        user_ref.set(new_user)
        logger.info(f"Registered new user {uid} with role {requested_role}")
        return {"status": "created", "user": new_user}
    else:
        # User already exists
        return {"status": "exists", "user": existing_user}
