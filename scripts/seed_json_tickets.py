"""
JSON Ticket Seeding Script.
Imports specific example tickets from docs/test_tickets.json into Firebase
to ensure the documentation's examples are live and usable.
"""
import sys
import os
import json

# Add parent directory to sys.path to enable absolute imports of the backend package
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from backend.services.firebase_client import firebase_client
from firebase_admin import db

def parse_and_seed():
    """
    Parses docs/test_tickets.json and seeds the data into Firebase.
    """
    json_path = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "docs", "test_tickets.json")
    
    if not os.path.exists(json_path):
        print(f"Error: {json_path} not found.")
        return

    with open(json_path, 'r') as f:
        data = json.load(f)

    tickets_to_seed = {}
    current_event_id = None

    print(f"Reading tickets from {json_path}...")

    for entry in data:
        # Check for context updates (active_event_id)
        if "active_event_id" in entry:
            current_event_id = entry["active_event_id"]
            print(f"  → Switching context to Event ID: {current_event_id}")
            continue
        
        # Check for notes or reset commands (skip these for actual seeding)
        if "notes" in entry or "reset_command" in entry:
            continue

        # Extract ticket data
        ticket_id = entry.get("ticket_id")
        if not ticket_id:
            continue

        # Map to database schema
        # JSON: seat, event, venue -> DB: location_ref, event_name, venue_name
        ticket_payload = {
            "event_id": current_event_id,
            "event_name": entry.get("event"),
            "date": entry.get("date"),
            "persons": entry.get("persons"),
            "location_ref": entry.get("seat"),
            "venue_address": entry.get("venue_address"),
            "status": "valid"
        }

        tickets_to_seed[ticket_id] = ticket_payload
        print(f"    Mapped Ticket: {ticket_id} for {current_event_id}")

    if not tickets_to_seed:
        print("No tickets found to seed.")
        return

    # Perform the bulk update
    print(f"\nFinalizing: Seeding {len(tickets_to_seed)} tickets to Firebase...")
    db.reference("/tickets").update(tickets_to_seed)
    print("✓ Seeding complete.")

if __name__ == "__main__":
    parse_and_seed()
