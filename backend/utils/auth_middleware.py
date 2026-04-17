import logging
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from firebase_admin import auth
from backend.services.firebase_client import firebase_client # Ensure initialized

logger = logging.getLogger(__name__)

security = HTTPBearer()

def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    """
    FastAPI dependency that validates a Firebase Auth ID Token.
    Returns the parsed user dictionary {uid, email, ...}.
    """
    token = credentials.credentials
    from backend.config import settings
    # E2E Testing Bypass: Support role-specific fake tokens ONLY in testing mode.
    # This prevents the 40-minute 'ghosting' hangs in CI.
    if settings.TESTING and token.startswith("fake-id-token"):
        role = token.split("-")[-1]  # fake-id-token-admin -> admin
        return {
            "uid": f"test_{role}_uid",
            "email": f"{role}@test.com",
            "name": f"Test {role.capitalize()}",
            "role": role,
            "picture": "https://api.dicebear.com/7.x/avataaars/svg?seed=test"
        }

    try:
        decoded_token = auth.verify_id_token(token)
        return decoded_token
    except Exception as e:
        logger.error(f"Error verifying Firebase ID token: {e}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )
