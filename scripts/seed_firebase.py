
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
from firebase_admin import db, auth

def seed():
    """
    Populates the Firebase Realtime Database with a standard set of test data.
    
    This includes:
    1. Multiple venue configurations.
    2. Scheduled events linked to those venues.
    3. Real-time entry point states (gates).
    4. Valid attendee tickets for testing flows.
    """
    print("🚀 Seeding Firebase with Noice Production Data...")

    # 1. Venues: Diverse physical locations with unique taxonomies
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
            "name": "Bangalore Exhibition Centre",
            "type": "exhibition_hall",
            "entry_label": "Pavilion Entry",
            "location_ref_label": "Zone",
            "coordinates": {"lat": 13.0695, "lng": 77.5786},
            "entry_point_count": 8
        },
        "venue_003": {
            "name": "Royal Albert Hall",
            "type": "auditorium",
            "entry_label": "Door",
            "location_ref_label": "Box / Tier",
            "coordinates": {"lat": 51.5009, "lng": -0.1774},
            "entry_point_count": 12
        },
        "venue_004": {
            "name": "Coachella Valley Fest",
            "type": "festival",
            "entry_label": "Portal",
            "location_ref_label": "Camping Zone",
            "coordinates": {"lat": 33.6784, "lng": -116.2372},
            "entry_point_count": 12
        },
        "venue_005": {
            "name": "Grand Convention Center",
            "type": "convention_center",
            "entry_label": "Plaza Entry",
            "location_ref_label": "Hall / Booth",
            "coordinates": {"lat": 37.7842, "lng": -122.4019},
            "entry_point_count": 8
        },
        "venue_006": {
            "name": "Starlight Theme Park",
            "type": "theme_park",
            "entry_label": "Turnstile",
            "location_ref_label": "Land / Ride",
            "coordinates": {"lat": 28.3852, "lng": -81.5639},
            "entry_point_count": 15
        }
    }
    db.reference('/venues').set(venues)

    # 2. Events: Global scheduled events
    events = {
        "event_001": {
            "name": "India vs Australia — T20",
            "type": "sports_match",
            "venue_id": "venue_001",
            "venue_name": "M. Chinnaswamy Stadium",
            "start_time": (datetime.now(timezone.utc) + timedelta(hours=2)).isoformat(),
            "status": "live"
        },
        "event_003": {
            "name": "Classic Night: Beethoven's 9th",
            "type": "concert",
            "venue_id": "venue_003",
            "venue_name": "Royal Albert Hall",
            "start_time": (datetime.now(timezone.utc) + timedelta(days=2)).isoformat(),
            "status": "upcoming"
        },
        "event_004": {
            "name": "Summer Solstice Fest 2026",
            "type": "festival",
            "venue_id": "venue_004",
            "venue_name": "Coachella Valley Fest",
            "start_time": (datetime.now(timezone.utc) + timedelta(hours=1)).isoformat(),
            "status": "live"
        },
        "event_005": {
            "name": "Global Tech Expo 2026",
            "type": "business_expo",
            "venue_id": "venue_005",
            "venue_name": "Grand Convention Center",
            "start_time": (datetime.now(timezone.utc) + timedelta(hours=5)).isoformat(),
            "status": "upcoming"
        },
        "event_006": {
            "name": "New Year Countdown Splash",
            "type": "holiday_celebration",
            "venue_id": "venue_006",
            "venue_name": "Starlight Theme Park",
            "start_time": (datetime.now(timezone.utc) + timedelta(hours=1)).isoformat(),
            "status": "live"
        }
    }
    db.reference('/events').set(events)

    # 3. Entry Points for Venue 001 (Stadium)
    entry_points_001 = {}
    gate_labels = ["A", "B", "C", "D", "E", "F"]
    for i, label in enumerate(gate_labels):
        entry_points_001[f"entry_{label}"] = {
            "label": f"Gate {label}",
            "proximity_tags": [f"Block {label}", f"Zone {i+1}"],
            "coordinates": {"lat": 12.9720 + (i * 0.0005), "lng": 77.5940 + (i * 0.0005)},
            "density": 0.1 if label != "B" else 0.85, 
            "wait_minutes": 2 if label != "B" else 25,
            "status": "low" if label != "B" else "high",
            "capacity": 500,
            "current_count": 50 if label != "B" else 425
        }
    db.reference('/entry_points/event_001').set(entry_points_001)

    # 4. Entry Points for Venue 003 (Royal Albert Hall - NO MORE TECH SUMMIT HALLUCINATIONS)
    entry_points_003 = {}
    for i in range(12):
        label = str(i + 1)
        # Doors 1-4 are congested near the Stalls
        is_bottleneck = i < 4
        entry_points_003[f"door_{label}"] = {
            "label": f"Door {label}",
            "proximity_tags": [f"Box {label}", f"Tier {label}"],
            "coordinates": {"lat": 51.5005 + (i * 0.0001), "lng": -0.1770 + (i * 0.0001)},
            "density": 0.8 if is_bottleneck else 0.15,
            "wait_minutes": 15 if is_bottleneck else 3,
            "status": "high" if is_bottleneck else "low",
            "capacity": 200,
            "current_count": 160 if is_bottleneck else 30
        }
    db.reference('/entry_points/event_003').set(entry_points_003)

    # 5. Entry Points for Venue 004 (Festival - PURE COACHELLA CONTEXT)
    entry_points_004 = {}
    for i in range(12):
        label = chr(65 + i)
        is_bottleneck = label in ["A", "B", "C"]
        entry_points_004[f"entry_{label}"] = {
            "label": f"Portal {label}",
            "proximity_tags": [f"Zone {label}", f"Meadow {label}"],
            "coordinates": {"lat": 33.6780 + (i * 0.001), "lng": -116.2370 + (i * 0.001)},
            "density": 0.95 if is_bottleneck else 0.05, 
            "wait_minutes": 60 if is_bottleneck else 2,
            "status": "high" if is_bottleneck else "low",
            "capacity": 2000,
            "current_count": 1900 if is_bottleneck else 100
        }
    db.reference('/entry_points/event_004').set(entry_points_004)
    
    # 6. Entry Points for Venue 005 (Grand Convention Center)
    entry_points_005 = {}
    for i in range(8):
        label = str(i + 1)
        entry_points_005[f"entry_{label}"] = {
            "label": f"Plaza Entry {label}",
            "proximity_tags": [f"Hall {chr(65+i)}", f"Booth {100*(i+1)}"],
            "coordinates": {"lat": 37.7840 + (i * 0.0002), "lng": -122.4015 + (i * 0.0002)},
            "density": 0.3, 
            "wait_minutes": 5,
            "status": "low",
            "capacity": 800,
            "current_count": 240
        }
    db.reference('/entry_points/event_005').set(entry_points_005)

    # 7. Entry Points for Venue 006 (Theme Park - MANY GATES)
    entry_points_006 = {}
    for i in range(15):
        label = str(i + 1)
        # Afternoon peak simulation
        is_peak = i % 3 == 0
        entry_points_006[f"gate_{label}"] = {
            "label": f"Turnstile {label}",
            "proximity_tags": [f"Land {chr(65+i)}", "Main Street"],
            "coordinates": {"lat": 28.3850 + (i * 0.0003), "lng": -81.5630 + (i * 0.0003)},
            "density": 0.88 if is_peak else 0.1,
            "wait_minutes": 45 if is_peak else 2,
            "status": "high" if is_peak else "low",
            "capacity": 1500,
            "current_count": 1320 if is_peak else 150
        }
    db.reference('/entry_points/event_006').set(entry_points_006)

    # 6. Global Sample Tickets
    tickets = {
        "IND-AUS-101": {
            "event_id": "event_001",
            "event_name": "India vs Australia — T20",
            "date": "April 11, 2026",
            "persons": 2,
            "location_ref": "Block B, Row 12",
            "venue_address": "Cubbon Park, Bengaluru, Karnataka 560001",
            "status": "valid",
            "owner_name": "Tony Stark",
            "claimed_by_uid": "tony_stark_uid"
        },
        "FEST-VIP-01": {
            "event_id": "event_004",
            "event_name": "Summer Solstice Fest 2026",
            "date": "June 21, 2026",
            "persons": 1,
            "location_ref": "Zone A", 
            "venue_address": "81-800 Avenue 51, Indio, CA 92201",
            "status": "valid",
            "owner_name": "Bruce Banner",
            "claimed_by_uid": None
        },
        "RAH-BOX-12": {
            "event_id": "event_003",
            "event_name": "Classic Night",
            "date": "April 13, 2026",
            "persons": 2,
            "location_ref": "Box 12, West Tier",
            "venue_address": "Kensington Gore, London SW7 2AP, UK",
            "status": "valid",
            "owner_name": "Steve Rogers",
            "claimed_by_uid": None
        },
        "TECH-EXPO-2026": {
            "event_id": "event_005",
            "event_name": "Global Tech Expo 2026",
            "date": "May 15, 2026",
            "persons": 1,
            "location_ref": "Hall C, Booth 402",
            "venue_address": "747 Howard St, San Francisco, CA 94103",
            "status": "valid",
            "owner_name": "Peter Parker",
            "claimed_by_uid": "peter_parker_uid"
        },
        "THEME-PARK-NYE": {
            "event_id": "event_006",
            "event_name": "New Year Countdown Splash",
            "date": "Dec 31, 2025",
            "persons": 4,
            "location_ref": "Tomorrowland Entry",
            "venue_address": "Lake Buena Vista, FL 32830",
            "status": "valid",
            "owner_name": "Peter Parker",
            "claimed_by_uid": "peter_parker_uid"
        },
        "EXPIRED-STADIUM": {
            "event_id": "event_001",
            "event_name": "India vs Australia (Legacy)",
            "date": "Jan 01, 2024",
            "persons": 1,
            "location_ref": "Block A",
            "venue_address": "Bengalaru",
            "status": "expired",
            "owner_name": "Tony Stark",
            "claimed_by_uid": "tony_stark_uid"
        }
    }
    db.reference('/tickets').set(tickets)

    # 7. Mock Users Data
    users = {
        "admin_mock_uid": {
            "name": "Admin User",
            "email": "admin@venueflow.com",
            "password": "password123",
            "role": "admin"
        },
        "staff_mock_uid": {
            "name": "Staff Guard",
            "email": "staff_gate@venueflow.com",
            "password": "password123",
            "role": "staff",
            "assigned_events": ["event_001"]
        },
        "tony_stark_uid": {
            "name": "Tony Stark",
            "email": "tony@stark.com",
            "password": "password123",
            "role": "attendee",
            "claimed_tickets": ["IND-AUS-101", "EXPIRED-STADIUM"]
        },
        "staff_two_uid": {
            "name": "Staff Mary",
            "email": "staff_two@venueflow.com",
            "password": "password123",
            "role": "staff",
            "assigned_events": ["event_006", "event_005"]
        },
        "peter_parker_uid": {
            "name": "Peter Parker",
            "email": "peter@parker.com",
            "password": "password123",
            "role": "attendee",
            "claimed_tickets": ["TECH-EXPO-2026", "THEME-PARK-NYE"]
        }
    }
    
    # Clean up and seed Auth + DB
    rtdb_users = {}
    print("Creating mock Firebase Auth users...")
    for uid, user_data in users.items():
        try:
            auth.create_user(
                uid=uid,
                email=user_data["email"],
                password=user_data["password"],
                display_name=user_data["name"]
            )
            print(f"  Created auth user: {user_data['email']}")
        except auth.EmailAlreadyExistsError:
            # Update password if it already exists to guarantee it works
            auth.update_user(uid=uid, password=user_data["password"])
            print(f"  Auth user existed, updated password: {user_data['email']}")
        except Exception as e:
            print(f"  Skipped auth creation for {user_data['email']}: {e}")

        # Strip password before saving to RTDB
        db_user = user_data.copy()
        del db_user["password"]
        rtdb_users[uid] = db_user

    db.reference('/users').set(rtdb_users)

    # 8. Command & Control: Staff Presence
    # Initialize initial presence for active staff
    presence = {
        "event_001": {
            "staff_mock_uid": {
                "name": "Staff Guardhub",
                "current_gate_id": "entry_A",
                "status": "active",
                "last_reported": datetime.now(timezone.utc).isoformat()
            }
        },
        "event_006": {
            "staff_two_uid": {
                "name": "Staff Mary",
                "current_gate_id": None,
                "status": "inactive",
                "last_reported": (datetime.now(timezone.utc) - timedelta(hours=1)).isoformat()
            }
        }
    }
    db.reference('/staff_presence').set(presence)

    # 9. Initial Notifications (Logs)
    notifications = {
        "staff_two_uid": {
            "notif_001": {
                "message": "Welcome to the New Year shift. Report to your assigned gate.",
                "target_gate_id": "gate_1",
                "sender_name": "System",
                "timestamp": datetime.now(timezone.utc).isoformat(),
                "status": "unread",
                "acknowledged_at": None
            }
        }
    }
    db.reference('/staff_notifications').set(notifications)

    # 10. Emergency Alerts (Empty initially)
    db.reference('/emergency_alerts').set({})

    db.reference('/active_event').set({"event_id": "event_001"})
    print("✅ Full Expansion Context Seeding complete.")

if __name__ == "__main__":
    seed()
