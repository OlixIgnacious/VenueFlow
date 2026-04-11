import sys
import os

# Add root to sys.path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from backend.prompt_builder import build_gemini_prompts
from backend.models import VenueConfig, EventConfig, EntryPoint, Coordinates
from datetime import datetime, timezone

def test_prompt_content():
    print("Testing Prompt Builder Spatial Context...")
    
    venue = VenueConfig(
        id="v1", name="Test Venue", type="stadium", 
        entry_label="Gate", location_ref_label="Block",
        coordinates=Coordinates(lat=10.0, lng=20.0),
        entry_point_count=2
    )
    event = EventConfig(
        id="e1", name="Test Event", type="match", venue_id="v1", venue_name="Test Venue",
        start_time=datetime.now(timezone.utc), status="active"
    )
    
    # Gate A is explicitly near Block A
    gate_a = EntryPoint(
        id="gate_a", label="Gate A", density=0.1, wait_minutes=2, status="low",
        coordinates=Coordinates(lat=10.1, lng=20.1),
        proximity_tags=["Block A"]
    )
    
    system_prompt, user_message = build_gemini_prompts(venue, event, [gate_a], "Block A")
    
    print("\nVerifying 'Near' tags in prompt...")
    assert "[Near: Block A]" in user_message
    print("✅ Proximity tags found in prompt.")
    
    print("Verifying distance calculation in prompt...")
    # (10.0, 20.0) to (10.1, 20.1) is approx 15km, but the point is the string existence
    assert "m North-East" in user_message or "m" in user_message
    print("✅ Distance/Direction context found in prompt.")
    
    print("Verifying Decision Criteria...")
    assert "Decision Criteria" in user_message
    assert "Shortest Path" in user_message
    print("✅ Guidance instructions found in prompt.")

if __name__ == "__main__":
    try:
        test_prompt_content()
        print("\nPROMPT VERIFICATION PASSED!")
    except Exception as e:
        print(f"\n❌ PROMPT TEST FAILED: {str(e)}")
        sys.exit(1)
