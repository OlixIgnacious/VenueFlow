import httpx
import json
import asyncio
import logging
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

    async def generate_recommendation(self, system_prompt: str, user_message: str) -> dict:
        if not self.api_key:
            logger.warning("[GEMINI] No GEMINI_API_KEY set — skipping AI call")
            return None

        url = f"{self.base_url}/{self.model}:generateContent?key={self.api_key}"
        payload = {
            "contents": [
                {
                    "role": "user",
                    "parts": [{"text": f"{system_prompt}\n\n{user_message}"}],
                }
            ],
            "generationConfig": {"response_mime_type": "application/json"},
        }

        for attempt in range(1, MAX_RETRIES + 1):
            try:
                logger.info(f"[GEMINI] Calling {self.model} (attempt {attempt}/{MAX_RETRIES})")
                async with httpx.AsyncClient(timeout=15.0) as client:
                    response = await client.post(url, json=payload)

                if response.status_code == 200:
                    result = response.json()
                    text_content = result["candidates"][0]["content"]["parts"][0]["text"].strip()
                    if text_content.startswith("```json"):
                        text_content = text_content[7:].rstrip("` \n")
                    parsed = json.loads(text_content)
                    logger.info(f"[GEMINI] ✓ Response received: {list(parsed.keys())}")
                    return parsed

                if response.status_code in RETRY_STATUSES:
                    wait = BASE_BACKOFF * (2 ** (attempt - 1))
                    # Respect Retry-After header if present
                    retry_after = response.headers.get("Retry-After")
                    if retry_after:
                        try:
                            wait = max(wait, float(retry_after))
                        except ValueError:
                            pass
                    logger.warning(
                        f"[GEMINI] HTTP {response.status_code} on attempt {attempt} — "
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
