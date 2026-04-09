"""
Seed additional test tickets into Firebase for manual QA testing.
Run from project root: python3 scripts/seed_tickets.py
"""
import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from backend.services.firebase_client import firebase_client
from firebase_admin import db

# ─── Event 001 — India vs Australia T20 ───────────────────────────────────────
# Venue: M. Chinnaswamy Stadium | entry_label: Gate | ref_label: Seat section
CRICKET_TICKETS = {
    "IND-AUS-101": {
        "event_id": "event_001",
        "event_name": "India vs Australia — T20",
        "date": "April 11, 2026",
        "persons": 2,
        "location_ref": "Block B, Row 12",
        "venue_address": "Cubbon Park, Bengaluru, Karnataka 560001",
        "status": "valid",
    },
    "IND-AUS-102": {
        "event_id": "event_001",
        "event_name": "India vs Australia — T20",
        "date": "April 11, 2026",
        "persons": 1,
        "location_ref": "Block A, Row 1",
        "venue_address": "Cubbon Park, Bengaluru, Karnataka 560001",
        "status": "valid",
    },
    "IND-AUS-103": {
        "event_id": "event_001",
        "event_name": "India vs Australia — T20",
        "date": "April 11, 2026",
        "persons": 4,
        "location_ref": "Block C, Row 7",
        "venue_address": "Cubbon Park, Bengaluru, Karnataka 560001",
        "status": "valid",
    },
    "IND-AUS-104": {
        "event_id": "event_001",
        "event_name": "India vs Australia — T20",
        "date": "April 11, 2026",
        "persons": 3,
        "location_ref": "Block D, Row 22",
        "venue_address": "Cubbon Park, Bengaluru, Karnataka 560001",
        "status": "valid",
    },
    "IND-AUS-105": {
        "event_id": "event_001",
        "event_name": "India vs Australia — T20",
        "date": "April 11, 2026",
        "persons": 1,
        "location_ref": "Block F, Row 5",
        "venue_address": "Cubbon Park, Bengaluru, Karnataka 560001",
        "status": "valid",
    },
    "IND-AUS-VIP-01": {
        "event_id": "event_001",
        "event_name": "India vs Australia — T20",
        "date": "April 11, 2026",
        "persons": 2,
        "location_ref": "VIP Box 1",
        "venue_address": "Cubbon Park, Bengaluru, Karnataka 560001",
        "status": "valid",
    },
}

# ─── Event 002 — Bengaluru Tech Summit 2026 ───────────────────────────────────
# Venue: BIEC | entry_label: Pavilion Entry | ref_label: Zone
TECH_TICKETS = {
    "TECH-SUMMIT-01": {
        "event_id": "event_002",
        "event_name": "Bengaluru Tech Summit 2026",
        "date": "April 14, 2026",
        "persons": 1,
        "location_ref": "Zone C",
        "venue_address": "10th Mile, Tumkur Main Road, Madavara, Bengaluru 560073",
        "status": "valid",
    },
    "TECH-SUMMIT-02": {
        "event_id": "event_002",
        "event_name": "Bengaluru Tech Summit 2026",
        "date": "April 14, 2026",
        "persons": 2,
        "location_ref": "Zone A",
        "venue_address": "10th Mile, Tumkur Main Road, Madavara, Bengaluru 560073",
        "status": "valid",
    },
    "TECH-SUMMIT-03": {
        "event_id": "event_002",
        "event_name": "Bengaluru Tech Summit 2026",
        "date": "April 14, 2026",
        "persons": 1,
        "location_ref": "Zone B",
        "venue_address": "10th Mile, Tumkur Main Road, Madavara, Bengaluru 560073",
        "status": "valid",
    },
    "TECH-SUMMIT-04": {
        "event_id": "event_002",
        "event_name": "Bengaluru Tech Summit 2026",
        "date": "April 14, 2026",
        "persons": 3,
        "location_ref": "Zone E",
        "venue_address": "10th Mile, Tumkur Main Road, Madavara, Bengaluru 560073",
        "status": "valid",
    },
    "TECH-SUMMIT-05": {
        "event_id": "event_002",
        "event_name": "Bengaluru Tech Summit 2026",
        "date": "April 14, 2026",
        "persons": 1,
        "location_ref": "Zone H",
        "venue_address": "10th Mile, Tumkur Main Road, Madavara, Bengaluru 560073",
        "status": "valid",
    },
    "TECH-SUMMIT-SPEAKER-01": {
        "event_id": "event_002",
        "event_name": "Bengaluru Tech Summit 2026",
        "date": "April 14, 2026",
        "persons": 1,
        "location_ref": "Speaker Lounge",
        "venue_address": "10th Mile, Tumkur Main Road, Madavara, Bengaluru 560073",
        "status": "valid",
    },
}

def seed_tickets():
    print("Seeding test tickets...")
    all_tickets = {**CRICKET_TICKETS, **TECH_TICKETS}
    db.reference("/tickets").update(all_tickets)
    print(f"✓ Seeded {len(all_tickets)} tickets:")
    for tid, t in all_tickets.items():
        print(f"  {tid:30s}  event={t['event_id']}  persons={t['persons']}  ref='{t['location_ref']}'")

if __name__ == "__main__":
    seed_tickets()
