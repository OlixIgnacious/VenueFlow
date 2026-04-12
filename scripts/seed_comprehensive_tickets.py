
"""
Comprehensive Ticket Seeding script.
Fills the database with realistic tickets for scanning and routing tests.
"""
import sys
import os
import uuid

# Add parent directory to sys.path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from backend.services.firebase_client import firebase_client
from firebase_admin import db

def generate_tickets():
    tickets = {}
    
    # event_001: India vs Australia (Cricket)
    event_001_id = "event_001"
    event_001_name = "India vs Australia — T20"
    for i in range(1, 11):
        ticket_id = f"TICKET-CRIC-{str(uuid.uuid4())[:8].upper()}"
        tickets[ticket_id] = {
            "event_id": event_001_id,
            "event_name": event_001_name,
            "date": "April 11, 2026",
            "persons": i % 4 + 1,
            "location_ref": f"Block {chr(65 + i % 6)}, Row {i * 2}, Seat {i * 10}",
            "venue_address": "Cubbon Park, Bengaluru, Karnataka 560001",
            "status": "valid"
        }
    
    # event_003: Beethoven's 9th (Royal Albert Hall)
    event_003_id = "event_003"
    event_003_name = "Classic Night: Beethoven's 9th"
    for i in range(1, 11):
        ticket_id = f"TICKET-CLASSIC-{str(uuid.uuid4())[:8].upper()}"
        tickets[ticket_id] = {
            "event_id": event_003_id,
            "event_name": event_003_name,
            "date": "April 20, 2026",
            "persons": 1 if i % 2 == 0 else 2,
            "location_ref": f"Grand Tier Box {i}, Seat {i * 3}",
            "venue_address": "Kensington Gore, South Kensington, London SW7 2AP, UK",
            "status": "valid"
        }

    # event_004: Summer Solstice Fest 2026 (Coachella / Empire Polo Club)
    event_004_id = "event_004"
    event_004_name = "Summer Solstice Fest 2026"
    for i in range(1, 16):
        ticket_id = f"TICKET-FEST-{str(uuid.uuid4())[:8].upper()}"
        sector = "VIP" if i <= 5 else "General Admission"
        tickets[ticket_id] = {
            "event_id": event_004_id,
            "event_name": event_004_name,
            "date": "April 15, 2026",
            "persons": i % 3 + 1,
            "location_ref": f"{sector} - Meadow {i}",
            "venue_address": "81-800 51st Ave, Indio, CA 92201, USA",
            "status": "valid"
        }

    return tickets

def seed():
    print("🚀 Seeding comprehensive ticket data...")
    all_new_tickets = generate_tickets()
    
    # Bulk update the /tickets node
    db.reference("/tickets").update(all_new_tickets)
    
    print(f"✅ Successfully seeded {len(all_new_tickets)} new tickets across 3 global events.")
    print("\nSample Ticket IDs for your test flow:")
    for eid in set(t['event_id'] for t in all_new_tickets.values()):
        samples = [tid for tid, t in all_new_tickets.items() if t['event_id'] == eid][:2]
        print(f"  {eid}: {', '.join(samples)}")

if __name__ == "__main__":
    seed()
