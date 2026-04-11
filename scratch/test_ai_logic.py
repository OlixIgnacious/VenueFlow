import asyncio
import httpx
import json
from backend.config import settings

async def test_ai():
    api_key = settings.GEMINI_API_KEY
    model = "gemini-2.0-flash"
    url = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={api_key}"
    
    payload = {
        "contents": [{"parts": [{"text": "Recommend a gate for Block B. Response in JSON."}]}],
        "generationConfig": {
            "response_mime_type": "application/json",
            "temperature": 0.2
        }
    }
    
    print(f"Testing Gemini API with Key: {api_key[:10]}...")
    async with httpx.AsyncClient() as client:
        response = await client.post(url, json=payload)
        print(f"Status: {response.status_code}")
        print(f"Body: {response.text}")

if __name__ == "__main__":
    asyncio.run(test_ai())
