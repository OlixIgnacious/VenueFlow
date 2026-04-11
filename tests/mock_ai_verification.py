import sys
import os
import asyncio
from unittest.mock import patch

# Add root to sys.path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from backend.routers.recommend import get_recommendation
from starlette.requests import Request

# Mock Request
mock_scope = {"type": "http", "http_version": "1.1", "method": "GET", "path": "/api/recommend", "headers": [], "client": ("127.0.0.1", 80)}
mock_request = Request(scope=mock_scope)

# We mock the generate_recommendation method specifically
async def mock_recommendation(*args, **kwargs):
    return {
        "recommended_entry": "entry_B",
        "wait_minutes": 5,
        "crowd_level": "low",
        "reason": "AI verified: Gate B is the closest entry for Block B and has minimal congestion.",
        "alt_entry": "entry_C",
        "tip": "Verified via Mock AI reasoning logic."
    }

@patch('backend.services.gemini_client.gemini_client.generate_recommendation', side_effect=mock_recommendation)
async def verify_mock_flow(mock_gen):
    print("Verifying Recommendation Flow with Mock AI Response...")
    # Ticket IND-AUS-101 is "Block B"
    result = await get_recommendation(mock_request, "IND-AUS-101", "event_001")
    
    print(f"Recommended: {result.recommended_entry}")
    print(f"Reason: {result.reason}")
    print(f"Tip: {result.tip}")
    
    assert result.recommended_entry == "entry_B"
    assert "AI verified" in result.reason
    print("\n✅ MOCK FLOW VERIFIED: The system correctly handles and surfaces AI-generated spatial data.")

if __name__ == "__main__":
    asyncio.run(verify_mock_flow())
