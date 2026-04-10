import firebase_admin
from firebase_admin import credentials, db
from backend.config import settings
import logging

logger = logging.getLogger(__name__)

class FirebaseClient:
    _instance = None

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super(FirebaseClient, cls).__new__(cls)
            cls._instance._initialize()
        return cls._instance

    def _initialize(self):
        try:
            if not firebase_admin._apps:
                creds_json = settings.FIREBASE_SERVICE_CREDENTIALS
                if not creds_json:
                    logger.warning("FIREBASE_SERVICE_CREDENTIALS environment variable is empty. Firebase will not be initialized.")
                    return

                try:
                    creds_dict = settings.firebase_creds_dict
                    if not creds_dict:
                        raise ValueError("Settings.firebase_creds_dict returned None - JSON parsing likely failed.")
                        
                    cred = credentials.Certificate(creds_dict)
                    firebase_admin.initialize_app(cred, {
                        'databaseURL': settings.FIREBASE_DATABASE_URL
                    })
                    logger.info("Firebase initialized successfully.")
                except Exception as json_err:
                    logger.error(f"Failed to parse FIREBASE_CREDENTIALS JSON: {json_err}. Raw length: {len(creds_json)}")
                    raise
        except Exception as e:
            logger.error(f"Failed to initialize Firebase: {e}")

    def get_venue(self, venue_id: str):
        return db.reference(f'/venues/{venue_id}').get()

    def get_event(self, event_id: str):
        return db.reference(f'/events/{event_id}').get()

    def get_active_event_id(self):
        data = db.reference('/active_event').get()
        return data.get('event_id') if data else None

    def get_entry_points(self, event_id: str):
        return db.reference(f'/entry_points/{event_id}').get()

    def set_entry_points(self, event_id: str, data: dict):
        db.reference(f'/entry_points/{event_id}').set(data)

    def set_active_event(self, event_id: str):
        db.reference('/active_event').set({'event_id': event_id})

    def get_active_events(self):
        return db.reference('/events').get()

    def get_ticket(self, ticket_id: str):
        return db.reference(f'/tickets/{ticket_id}').get()

    def update_ticket_status(self, ticket_id: str, status: str):
        db.reference(f'/tickets/{ticket_id}').update({'status': status})

firebase_client = FirebaseClient()
