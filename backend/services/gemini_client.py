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

# Constants for retry logic
RETRY_STATUSES = {429, 500, 502, 503, 504}
MAX_RETRIES = 3
BASE_BACKOFF = 2.0


class GeminiClient:
    """
    Client for interacting with Gemini 2.0 Flash via REST API.
    
    Now using a project-native API key for high-throughput (360 RPM).
    """
    def __init__(self):
        """Initializes the client with the API key and model configuration."""
        self.api_key = settings.GEMINI_API_KEY
        self.model = "gemini-2.0-flash"
        self.base_url = "https://generativelanguage.googleapis.com/v1beta/models"

    async def generate_recommendation(
        self, 
        system_prompt: str, 
        user_message: str
    ) -> Optional[dict[str, Any]]:
        """
        Sends a request to Gemini to generate a structured entry recommendation.
        """
        if not self.api_key:
            logger.warning("[GEMINI] No GEMINI_API_KEY set — skipping AI call")
            return None

        url = f"{self.base_url}/{self.model}:generateContent?key={self.api_key}"
        
        # Native structured output schema
        recommendation_schema = {
            "type": "object",
            "properties": {
                "recommended_entry": {"type": "string"},
                "wait_minutes": {"type": "integer"},
                "crowd_level": {"type": "string", "enum": ["low", "medium", "high"]},
                "reason": {"type": "string"},
                "alt_entry": {"type": "string"},
                "tip": {"type": "string"}
            },
            "required": ["recommended_entry", "wait_minutes", "crowd_level", "reason"]
        }

        payload = {
            "contents": [
                {
                    "role": "user",
                    "parts": [{"text": f"{system_prompt}\n\n{user_message}"}],
                }
            ],
            "generationConfig": {
                "response_mime_type": "application/json",
                "response_schema": recommendation_schema,
                "temperature": 0.2
            },
        }

        for attempt in range(1, MAX_RETRIES + 1):
            try:
                logger.info(f"[GEMINI] Calling {self.model} via REST (attempt {attempt}/{MAX_RETRIES})")
                async with httpx.AsyncClient(timeout=20.0) as client:
                    response = await client.post(url, json=payload)

                if response.status_code == 200:
                    result = response.json()
                    text_content = result["candidates"][0]["content"]["parts"][0]["text"].strip()
                    parsed = json.loads(text_content)
                    logger.info(f"[GEMINI] ✓ Success: {list(parsed.keys())}")
                    return parsed

                if response.status_code in RETRY_STATUSES:
                    wait = BASE_BACKOFF * (2 ** (attempt - 1))
                    logger.warning(f"[GEMINI] {response.status_code} on attempt {attempt} — retrying in {wait}s")
                    if attempt < MAX_RETRIES:
                        await asyncio.sleep(wait)
                        continue
                
                logger.error(f"[GEMINI] HTTP {response.status_code}: {response.text[:200]}")
                return None

            except Exception as e:
                logger.error(f"[GEMINI] Unexpected error: {e}")
                return None

        return None

# Global singleton instance
gemini_client = GeminiClient()
