import os
import json
from pydantic_settings import BaseSettings
from dotenv import load_dotenv

load_dotenv()

class Settings(BaseSettings):
    GEMINI_API_KEY: str = ""
    MAPS_API_KEY: str = ""
    FIREBASE_DATABASE_URL: str = ""
    FIREBASE_CREDENTIALS: str = ""
    ALLOWED_ORIGIN: str = "http://localhost:5173"
    ADMIN_API_KEY: str = ""

    @property
    def firebase_creds_dict(self):
        try:
            return json.loads(self.FIREBASE_CREDENTIALS)
        except Exception:
            return None

settings = Settings()
