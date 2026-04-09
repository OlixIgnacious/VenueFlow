import httpx
import json
import asyncio
import logging
from typing import Any, Optional
from backend.config import settings

logger = logging.getLogger(__name__)

RETRY_STATUSES = {429, 500, 502, 503, 504}
MAX_RETRIES = 3
# Back-off: 2s, 4s, 8s  (with up to 1s jitter each)
BASE_BACKOFF = 2.0


class GeminiClient:
    def __init__(self):
        self.api_key = settings.GEMINI_API_KEY
        self.model = "gemini-2.0-flash"
        self.base_url = "https://generativelanguage.googleapis.com/v1beta/models"

    async def generate_recommendation(
        self, 
        system_prompt: str, 
        user_message: str
    ) -> Optional[dict[str, Any]]:
        """
        Sends a request to the Gemini 2.0 Flash model to generate a structured entry recommendation.
        
        Retry Mechanism: 
            Automated retries (max 3) with exponential back-off (2s, 4s, 8s) on 429/5xx errors.
        
        Failure Policy:
            Returns None if all retries fail, a timeout occurs, or the API key is missing. 
            The router should handle this by falling back to rule-based pathfinding.
        
        Schema Enforcement:
            Uses a native JSON schema to force the model to return a structured Recommendation object.
        """
        if not self.api_key:
            logger.warning("[GEMINI] No GEMINI_API_KEY set — skipping AI call")
            return None

        url = f"{self.base_url}/{self.model}:generateContent?key={self.api_key}"
        
        # Native structured output schema for Gemini 2.0
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
                "response_schema": recommendation_schema
            },
        }

        for attempt in range(1, MAX_RETRIES + 1):
            try:
                logger.info(f"[GEMINI] Calling {self.model} with native schema (attempt {attempt}/{MAX_RETRIES})")
                async with httpx.AsyncClient(timeout=15.0) as client:
                    response = await client.post(url, json=payload)

                if response.status_code == 200:
                    result = response.json()
                    text_content = result["candidates"][0]["content"]["parts"][0]["text"].strip()
                    parsed = json.loads(text_content)
                    logger.info(f"[GEMINI] ✓ Controlled response received: {list(parsed.keys())}")
                    return parsed

                if response.status_code in RETRY_STATUSES:
                    # Respect Retry-After header if present
                    retry_after = response.headers.get("Retry-After")
                    if retry_after:
                        try:
                            wait = min(float(retry_after), 30.0)
                        except ValueError:
                            wait = BASE_BACKOFF * (2 ** (attempt - 1))
                    else:
                        wait = BASE_BACKOFF * (2 ** (attempt - 1))

                    logger.warning(
                        f"[GEMINI] {response.status_code} on attempt {attempt} — "
                        f"retrying in {wait:.1f}s"
                    )
                    if attempt < MAX_RETRIES:
                        await asyncio.sleep(wait)
                        continue
                    else:
                        logger.error(
                            f"[GEMINI] All {MAX_RETRIES} attempts exhausted (HTTP {response.status_code}). "
                            "Falling back to rule-based routing."
                        )
                        return None

                # Non-retryable error
                logger.error(
                    f"[GEMINI] Non-retryable HTTP {response.status_code}: {response.text[:300]}"
                )
                return None

            except httpx.TimeoutException:
                logger.warning(f"[GEMINI] Timeout on attempt {attempt}/{MAX_RETRIES}")
                if attempt < MAX_RETRIES:
                    await asyncio.sleep(BASE_BACKOFF * attempt)
                    continue
                logger.error("[GEMINI] All attempts timed out — falling back to rule-based routing")
                return None

            except json.JSONDecodeError as e:
                logger.error(f"[GEMINI] JSON parse error: {e}")
                return None

            except Exception as e:
                logger.error(f"[GEMINI] Unexpected error ({type(e).__name__}): {e}")
                return None

        return None


gemini_client = GeminiClient()
