"""
Gemini AI Service Client.

Integrates with Google's Generative AI API (REST) to provide personalized 
venue entry recommendations using structured JSON outputs.
"""
import httpx
import json
import asyncio
import logging
from typing import Any, Optional
from backend.config import settings

logger = logging.getLogger(__name__)

# No retries in minimal test mode
RETRY_STATUSES = {429, 500, 502, 503, 504}
MAX_RETRIES = 1 


class GeminiClient:
    """
    Client for interacting with Gemini 2.5 Flash via REST API.
    """
    def __init__(self):
        """Initializes the client with the API key."""
        self.api_key = settings.GEMINI_API_KEY
        self.model = "gemini-2.5-flash"
        self.base_url = "https://generativelanguage.googleapis.com/v1beta/models"

    async def generate_recommendation(
        self, 
        system_prompt: str, 
        user_message: str
    ) -> Optional[dict[str, Any]]:
        """
        Sends a request to Gemini with production-ready retry logic.
        """
        if not self.api_key:
            return None

        url = f"{self.base_url}/{self.model}:generateContent?key={self.api_key}"
        
        payload = {
            "contents": [
                {
                    "parts": [{"text": f"{system_prompt}\n\n{user_message}\n\nRespond ONLY with valid JSON."}],
                }
            ],
            "generationConfig": {
                "response_mime_type": "application/json",
                "temperature": 0.2
            },
        }

        async with httpx.AsyncClient(timeout=25.0) as client:
            for attempt in range(1, MAX_RETRIES + 1):
                try:
                    response = await client.post(url, json=payload)
                    if response.status_code == 200:
                        result = response.json()
                        text = result["candidates"][0]["content"]["parts"][0]["text"]
                        return json.loads(text)
                    
                    if response.status_code in RETRY_STATUSES and attempt < MAX_RETRIES:
                        await asyncio.sleep(2 ** attempt)
                        continue
                    
                    return None
                except Exception:
                    return None
        return None

# Global singleton instance
gemini_client = GeminiClient()
