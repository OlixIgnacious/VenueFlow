import sys
import os
from dotenv import load_dotenv

# Load env before imports
load_dotenv()

# Add root to sys.path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from backend.services.firebase_client import firebase_client
from backend.prompt_builder import build_gemini_prompts
from backend.models import VenueConfig, EventConfig, EntryPoint
from firebase_admin import db

async def audit():
    print("--- PROMPT AUDIT START ---")
    
    # Ensure Test Data State
    event_id = "event_001"
    ticket_id = "IND-AUS-101"
    
    # 1. Fetch current DB state (what the router sees)
    print(f"Fetching Gate B state for {event_id}...")
    gate_b = db.reference(f'/entry_points/{event_id}/entry_B').get()
    print(f"Gate B Live Stats: {gate_b}")
    
    # 2. Replicate Router Logic
    event_data = firebase_client.get_event(event_id)
    venue_id = event_data['venue_id']
    venue_data = firebase_client.get_venue(venue_id)
    entry_points_data = firebase_client.get_entry_points(event_id)
    ticket_data = firebase_client.get_ticket(ticket_id)
    
    venue = VenueConfig(id=venue_id, **venue_data)
    event = EventConfig(id=event_id, **event_data)
    entry_points = [EntryPoint(id=eid, **data) for eid, data in entry_points_data.items()]
    ref_value = ticket_data.get('location_ref')
    
    # 3. Build Prompt
    system_prompt, user_message = build_gemini_prompts(venue, event, entry_points, ref_value)
    
    print("\n--- GENERATED USER MESSAGE ---")
    print(user_message)
    print("--- END ---")

if __name__ == "__main__":
    import asyncio
    asyncio.run(audit())
