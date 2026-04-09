import httpx
import json
import logging
from backend.config import settings

logger = logging.getLogger(__name__)

class GeminiClient:
    def __init__(self):
        self.api_key = settings.GEMINI_API_KEY
        self.model = "gemini-2.0-flash"
        self.base_url = "https://generativelanguage.googleapis.com/v1beta/models"

    async def generate_recommendation(self, system_prompt: str, user_message: str) -> dict:
        if not self.api_key:
            logger.warning("No GEMINI_API_KEY found. Falling back.")
            return None

        url = f"{self.base_url}/{self.model}:generateContent?key={self.api_key}"
        
        payload = {
            "contents": [
                {
                    "role": "user",
                    "parts": [{"text": f"{system_prompt}\n\n{user_message}"}]
                }
            ],
            "generationConfig": {
                "response_mime_type": "application/json"
            }
        }

        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                response = await client.post(url, json=payload)
                response.raise_for_status()
                
                result = response.json()
                text_content = result['candidates'][0]['content']['parts'][0]['text']
                
                # Cleanup potential whitespace or markdown formatting
                text_content = text_content.strip()
                if text_content.startswith("```json"):
                    text_content = text_content[7:-3].strip()
                
                return json.loads(text_content)
        except Exception as e:
            logger.error(f"Gemini API error: {e}")
            return None

gemini_client = GeminiClient()
