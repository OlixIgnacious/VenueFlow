import sys
import os
import json
import asyncio

# Add root to sys.path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from backend.routers.recommend import get_recommendation
from firebase_admin import db
from starlette.requests import Request

# Create a minimal valid Request object
mock_scope = {
    "type": "http",
    "http_version": "1.1",
    "method": "GET",
    "path": "/api/recommend",
    "headers": [],
    "client": ("127.0.0.1", 80),
}
mock_request = Request(scope=mock_scope)

async def test_stadium_proximity():
    print("Testing Stadium Proximity (Ticket: Block B)...")
    result = await get_recommendation(mock_request, "IND-AUS-101", "event_001")
    print(f"Recommended: {result.recommended_entry}")
    print(f"Reason: {result.reason}")
    print(f"Tip: {result.tip}")
    
    # SUCCESS = Either AI reasoning OR Correct Mathematical Fallback
    assert "entry_B" in result.recommended_entry
    print("✅ Stadium proximity match passed.")

async def test_convention_cardinal():
    print("\nTesting Convention Cardinal Logic (Ticket: Zone C)...")
    result = await get_recommendation(mock_request, "TECH-SUMMIT-01", "event_002")
    print(f"Recommended: {result.recommended_entry}")
    print(f"Reason: {result.reason}")
    print(f"Tip: {result.tip}")
    
    # SUCCESS = Either AI reasoning OR Correct Mathematical Fallback
    assert "entry_C" in result.recommended_entry
    print("✅ Convention cardinal match passed.")

async def test_congestion_avoidance():
    print("\nTesting Congestion Avoidance...")
    # 1. Set Gate B to very high density
    db.reference('/entry_points/event_001/entry_B').update({
        "density": 0.98,
        "wait_minutes": 45,
        "status": "high"
    })
    
    print("Requested Block B while Gate B is 98% dense...")
    result = await get_recommendation(mock_request, "IND-AUS-101", "event_001")
    print(f"New Recommended: {result.recommended_entry}")
    print(f"Reason: {result.reason}")
    print(f"Tip: {result.tip}")
    
    # Avoid entry_B (AI or Fallback)
    assert "entry_B" not in result.recommended_entry
    
    # Reset Gate B
    db.reference('/entry_points/event_001/entry_B').update({
        "density": 0.1,
        "wait_minutes": 2,
        "status": "low"
    })
    print("✅ Congestion avoidance logic passed.")

async def main():
    try:
        # Final Verification: Smart Routing Resilience
        # We now use 2s delays as the fallback handles rate-limiting gracefully.
        await test_stadium_proximity()
        await asyncio.sleep(2)
        
        await test_convention_cardinal()
        await asyncio.sleep(2)
        
        await test_congestion_avoidance()
        
        print("\nALL E2E LOGIC TESTS PASSED (SYSTEM IS 100% RESILIENT)!")
    except Exception as e:
        print(f"\n❌ E2E TEST FAILED: {str(e)}")
        # Reset Gate B just in case
        db.reference('/entry_points/event_001/entry_B').update({
            "density": 0.1,
            "wait_minutes": 2,
            "status": "low"
        })
        sys.exit(1)

if __name__ == "__main__":
    asyncio.run(main())
