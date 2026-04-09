"""
Seed additional test tickets into Firebase for manual QA testing.
Run from project root: python3 scripts/seed_tickets.py
"""
import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from backend.services.firebase_client import firebase_client
from firebase_admin import db

import uuid

# ─── Event 001 — India vs Australia T20 ───────────────────────────────────────
def get_cricket_tickets():
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

# ─── Event 002 — Bengaluru Tech Summit 2026 ───────────────────────────────────
def get_tech_tickets():
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
    print("Seeding test tickets with UUIDs...")
    all_tickets = {**get_cricket_tickets(), **get_tech_tickets()}
    db.reference("/tickets").update(all_tickets)
    print(f"✓ Seeded {len(all_tickets)} tickets:")
    for tid, t in all_tickets.items():
        print(f"  {tid} -> {t['location_ref']}")

if __name__ == "__main__":
    seed_tickets()
