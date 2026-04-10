"""
Dynamic Ticket Seeding Script.
Generates and seeds additional test tickets with unique UUIDs into Firebase 
to facilitate large-scale manual QA and end-to-end testing.
"""
import sys
import os
import uuid

# Add parent directory to sys.path to enable absolute imports of the backend package
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from backend.services.firebase_client import firebase_client
from firebase_admin import db

def get_cricket_tickets() -> dict:
    """
    Generates a batch of sample tickets for the Cricket event.

    Returns:
        dict: A mapping of UUIDs to ticket metadata for the Cricket event.
    """
    return {
        str(uuid.uuid4()): {
            "event_id": "event_001",
            "event_name": "India vs Australia — T20",
            "date": "April 11, 2026",
            "persons": 2,
            "location_ref": "Block B, Row 12",
            "venue_address": "Cubbon Park, Bengaluru, Karnataka 560001",
            "status": "valid",
        },
        str(uuid.uuid4()): {
            "event_id": "event_001",
            "event_name": "India vs Australia — T20",
            "date": "April 11, 2026",
            "persons": 1,
            "location_ref": "Block A, Row 1",
            "venue_address": "Cubbon Park, Bengaluru, Karnataka 560001",
            "status": "valid",
        },
        str(uuid.uuid4()): {
            "event_id": "event_001",
            "event_name": "India vs Australia — T20",
            "date": "April 11, 2026",
            "persons": 4,
            "location_ref": "Block C, Row 7",
            "venue_address": "Cubbon Park, Bengaluru, Karnataka 560001",
            "status": "valid",
        }
    }

def get_tech_tickets() -> dict:
    """
    Generates a batch of sample tickets for the Tech Summit event.

    Returns:
        dict: A mapping of UUIDs to ticket metadata for the Tech Summit.
    """
    return {
        str(uuid.uuid4()): {
            "event_id": "event_002",
            "event_name": "Bengaluru Tech Summit 2026",
            "date": "April 14, 2026",
            "persons": 1,
            "location_ref": "Zone C",
            "venue_address": "10th Mile, Tumkur Main Road, Madavara, Bengaluru 560073",
            "status": "valid",
        },
        str(uuid.uuid4()): {
            "event_id": "event_002",
            "event_name": "Bengaluru Tech Summit 2026",
            "date": "April 14, 2026",
            "persons": 2,
            "location_ref": "Zone A",
            "venue_address": "10th Mile, Tumkur Main Road, Madavara, Bengaluru 560073",
            "status": "valid",
        }
    }

def seed_tickets():
    """
    Aggregates all ticket batches and performs a bulk update to the Firebase 
    '/tickets' node.
    """
    print("Seeding test tickets with UUIDs...")
    all_tickets = {**get_cricket_tickets(), **get_tech_tickets()}
    db.reference("/tickets").update(all_tickets)
    print(f"✓ Seeded {len(all_tickets)} tickets:")
    for tid, t in all_tickets.items():
        print(f"  {tid} -> {t['location_ref']}")

if __name__ == "__main__":
    seed_tickets()
