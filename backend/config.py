"""
Configuration management for VenueFlow backend.
Loads environment variables from .env and defines the global settings object.
"""
import os
import json
from pydantic_settings import BaseSettings
from dotenv import load_dotenv

# Load local environment variables
load_dotenv()

class Settings(BaseSettings):
    """
    Application-wide settings managed via environment variables.

    Attributes:
        GEMINI_API_KEY (str): API key for Google Gemini AI.
        MAPS_API_KEY (str): API key for Google Maps Services (Backend).
        FIREBASE_DATABASE_URL (str): URL for the Firebase Realtime Database.
        FIREBASE_SERVICE_CREDENTIALS (str): raw JSON string of the Firebase Service Account key.
        ALLOWED_ORIGIN (str): CORS allowed origin (defaults to localhost:5173).
        ADMIN_API_KEY (str): Secret key for administrative simulator endpoints.
    """
    GEMINI_API_KEY: str = ""
    MAPS_API_KEY: str = ""
    FIREBASE_DATABASE_URL: str = ""
    FIREBASE_SERVICE_CREDENTIALS: str = ""
    ALLOWED_ORIGIN: str = "http://localhost:5173"
    ADMIN_API_KEY: str = ""

    @property
    def firebase_creds_dict(self):
        """
        Parses the FIREBASE_SERVICE_CREDENTIALS string into a dictionary.

        This handles the raw JSON string provided via environment variables, 
        making it accessible for the firebase-admin SDK.

        Returns:
            dict: The parsed service account dictionary or None if parsing fails.
        """
        try:
            return json.loads(self.FIREBASE_SERVICE_CREDENTIALS)
        except (TypeError, ValueError, json.JSONDecodeError):
            # We log this at the start of the app (in main.py) if initialization fails.
            return None

# Global settings instance
settings = Settings()
