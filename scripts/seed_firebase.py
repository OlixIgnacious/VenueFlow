"""
Firebase Seeding Script.
Initializes the Firebase Realtime Database with sample venues, events, 
entry points, and tickets for development and testing.
"""
import sys
import os
from datetime import datetime, timedelta, timezone
from dotenv import load_dotenv

# Pre-computation: Load environment variables before any backend imports 
# to ensure the singleton firebase_client uses the correct config.
load_dotenv()

# Add parent directory to sys.path to enable absolute imports of the backend package
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from backend.services.firebase_client import firebase_client
from firebase_admin import db

def seed():
    """
    Populates the Firebase Realtime Database with a standard set of test data.
    
    This includes:
    1. Multiple venue configurations.
    2. Scheduled events linked to those venues.
    3. Real-time entry point states (gates).
    4. Valid attendee tickets for testing flows.
    """
    print("Seeding Firebase...")

    # 1. Venues: Physical locations with geographic metadata
    venues = {
        "venue_001": {
            "name": "M. Chinnaswamy Stadium",
            "type": "stadium",
            "entry_label": "Gate",
            "location_ref_label": "Seat section",
            "coordinates": {"lat": 12.9716, "lng": 77.5946},
            "entry_point_count": 6
        },
        "venue_002": {
            "name": "Bangalore International Exhibition Centre",
            "type": "exhibition_hall",
            "entry_label": "Pavilion Entry",
            "location_ref_label": "Zone",
            "coordinates": {"lat": 13.0695, "lng": 77.5786},
            "entry_point_count": 8
        }
    }
    db.reference('/venues').set(venues)

    # 2. Events: Scheduled occurrences at specific venues
    events = {
        "event_001": {
            "name": "India vs Australia — T20",
            "type": "sports_match",
            "venue_id": "venue_001",
            "venue_name": "M. Chinnaswamy Stadium",
            "start_time": (datetime.now(timezone.utc) + timedelta(hours=2)).isoformat(),
            "status": "active"
        },
        "event_002": {
            "name": "Bengaluru Tech Summit 2026",
            "type": "conference",
            "venue_id": "venue_002",
            "venue_name": "Bangalore International Exhibition Centre",
            "start_time": (datetime.now(timezone.utc) + timedelta(days=5)).isoformat(),
            "status": "active"
        }
    }
    db.reference('/events').set(events)

    # 3. Active Event Pointer: Dictates the context for the attendee dashboard
    db.reference('/active_event').set({"event_id": "event_001"})

    # 4. Entry Points for Venue 001 (Stadium)
    entry_points_001 = {}
    gate_labels = ["A", "B", "C", "D", "E", "F"]
    for i, label in enumerate(gate_labels):
        entry_points_001[f"entry_{label}"] = {
            "label": f"Gate {label}",
            "coordinates": {
                "lat": 12.9720 + (i * 0.0005),
                "lng": 77.5940 + (i * 0.0005)
            },
            "density": 0.1,
            "wait_minutes": 2,
            "status": "low",
            "capacity": 500,
            "current_count": 50
        }
    db.reference('/entry_points/event_001').set(entry_points_001)

    # 5. Entry Points for Venue 002 (Convention Center)
    entry_points_002 = {}
    for i in range(8):
        label = chr(65 + i) # A, B, C...
        entry_points_002[f"entry_{label}"] = {
            "label": f"Pavilion Entry {label}",
            "coordinates": {
                "lat": 13.0690 + (i * 0.0005),
                "lng": 77.5780 + (i * 0.0005)
            },
            "density": 0.05,
            "wait_minutes": 1,
            "status": "low",
            "capacity": 800,
            "current_count": 40
        }
    db.reference('/entry_points/event_002').set(entry_points_002)

    # 6. Sample Tickets: Used for validating the end-to-end scanner and recommendation flow
    tickets = {
        "IND-AUS-101": {
            "event_id": "event_001",
            "event_name": "India vs Australia — T20",
            "date": "April 11, 2026",
            "persons": 2,
            "location_ref": "Block B, Row 12",
            "venue_address": "Cubbon Park, Bengaluru, Karnataka 560001",
            "status": "valid"
        },
        "TECH-SUMMIT-01": {
            "event_id": "event_002",
            "event_name": "Bengaluru Tech Summit 2026",
            "date": "April 14, 2026",
            "persons": 1,
            "location_ref": "Zone C",
            "venue_address": "10th Mile, Tumkur Main Road, Madavara, Bengaluru 560073",
            "status": "valid"
        }
    }
    db.reference('/tickets').set(tickets)

    print("Seeding complete.")

if __name__ == "__main__":
    seed()
