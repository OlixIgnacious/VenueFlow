"""
Firebase Service Client.
Handles all interactions with the Firebase Realtime Database using the Admin SDK.
"""
import firebase_admin
from firebase_admin import credentials, db
from backend.config import settings
import logging

logger = logging.getLogger(__name__)

class FirebaseClient:
    """
    Singleton client to manage Firebase database operations.
    
    This class ensures that the Firebase Admin SDK is initialized exactly once
    and provides high-level methods for data access across the backend.
    """
    _instance = None

    def __new__(cls):
        """
        Ensures a single instance of FirebaseClient exists.
        """
        if cls._instance is None:
            cls._instance = super(FirebaseClient, cls).__new__(cls)
            cls._instance._initialize()
        return cls._instance

    def _initialize(self):
        """
        Initializes the Firebase Admin SDK using service account credentials.
        
        Reads credentials from settings.FIREBASE_SERVICE_CREDENTIALS.
        """
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
                    logger.error(f"Failed to parse FIREBASE_SERVICE_CREDENTIALS JSON: {json_err}. Raw length: {len(creds_json)}")
                    return
        except Exception as e:
            logger.error(f"Failed to initialize Firebase: {e}")

    def get_venue(self, venue_id: str):
        """
        Fetches the configuration and metadata for a specific venue.

        Args:
            venue_id (str): The unique identifier for the venue.

        Returns:
            dict: A dictionary containing venue metadata (name, type, etc.) or None if not found.
        """
        return db.reference(f'/venues/{venue_id}').get()

    def get_event(self, event_id: str):
        """
        Fetches the configuration and status for a specific event.

        Args:
            event_id (str): The unique identifier for the event.

        Returns:
            dict: A dictionary containing event metadata (name, status, venue_id, etc.) or None if not found.
        """
        return db.reference(f'/events/{event_id}').get()

    def get_active_event_id(self) -> str:
        """
        Retrieves the ID of the currently active event from the global pointer.

        The system uses a single active event to determine which tickets can be validated.

        Returns:
            str: The active event ID or None if no event is currently active.
        """
        data = db.reference('/active_event').get()
        return data.get('event_id') if data else None

    def get_entry_points(self, event_id: str):
        """
        Fetches the real-time status of all entry points for a given event.

        Args:
            event_id (str): The event ID for which to retrieve entry point data.

        Returns:
            dict: A mapping of entry point IDs to their current density, wait times, and status.
        """
        return db.reference(f'/entry_points/{event_id}').get()

    def set_entry_points(self, event_id: str, data: dict):
        """
        Updates the real-time density and occupancy data for an event's entry points.

        This is primarily called by the background simulator.

        Args:
            event_id (str): The event to update.
            data (dict): The complete entry point status map.
        """
        db.reference(f'/entry_points/{event_id}').set(data)

    def set_active_event(self, event_id: str):
        """
        Sets the system-wide active event pointer.

        Args:
            event_id (str): The event ID to set as active.
        """
        db.reference('/active_event').set({'event_id': event_id})

    def get_active_events(self):
        """
        Retrieves a list of all events currently stored in the system.

        Returns:
            dict: A mapping of event IDs to their full event configurations.
        """
        return db.reference('/events').get()

    def get_ticket(self, ticket_id: str):
        """
        Retrieves ticket metadata for validation and recommendation.

        Args:
            ticket_id (str): The unique ticket/barcode reference to look up.

        Returns:
            dict: Ticket metadata (event_id, location_ref, status) or None if not found.
        """
        return db.reference(f'/tickets/{ticket_id}').get()

    def update_ticket_status(self, ticket_id: str, status: str):
        """
        Updates the lifecycle status of a ticket in the database.

        Common statuses include 'valid', 'inside', and 'void'.

        Args:
            ticket_id (str): The ticket to update.
            status (str): The new status code.
        """
        db.reference(f'/tickets/{ticket_id}').update({'status': status})

# Global singleton instance
firebase_client = FirebaseClient()
