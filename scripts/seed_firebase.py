
"""
Firebase Seeding Script.
Initializes the Firebase Realtime Database with sample venues, events,
entry points, and tickets for development and testing.

Credentials (all accounts):
  Password: VenueFlow@1

  Admin:
    admin@venueflow.com / VenueFlow@1

  Attendees:
    tony@stark.com    / VenueFlow@1  (tickets: IND-AUS-101, EXPIRED-STADIUM)
    peter@parker.com  / VenueFlow@1  (tickets: TECH-EXPO-2026, THEME-PARK-NYE)

  Staff (staff_1@venueflow.com ... staff_30@venueflow.com):
    Password: VenueFlow@1
"""
import sys
import os
from datetime import datetime, timedelta, timezone
from dotenv import load_dotenv

load_dotenv()

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from backend.services.firebase_client import firebase_client
from firebase_admin import db, auth

# Single password that satisfies the frontend regex:
# /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[\W_]).{8,}$/
DEFAULT_PASSWORD = "VenueFlow@1"

def seed():
    print("🚀 Seeding Firebase Realtime Database...")

    now = datetime.now(timezone.utc)

    # 1. Venues
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
    print(f"  ✓ {len(venues)} venues")

    # 2. Events
    events = {
        "event_001": {
            "name": "India vs Australia — T20",
            "type": "sports_match",
            "venue_id": "venue_001",
            "venue_name": "M. Chinnaswamy Stadium",
            "start_time": (now + timedelta(hours=2)).isoformat(),
            "status": "live"
        },
        "event_003": {
            "name": "Classic Night: Beethoven's 9th",
            "type": "concert",
            "venue_id": "venue_003",
            "venue_name": "Royal Albert Hall",
            "start_time": (now + timedelta(days=2)).isoformat(),
            "status": "upcoming"
        },
        "event_004": {
            "name": "Summer Solstice Fest 2026",
            "type": "festival",
            "venue_id": "venue_004",
            "venue_name": "Coachella Valley Fest",
            "start_time": (now + timedelta(hours=1)).isoformat(),
            "status": "live"
        },
        "event_005": {
            "name": "Global Tech Expo 2026",
            "type": "business_expo",
            "venue_id": "venue_005",
            "venue_name": "Grand Convention Center",
            "start_time": (now + timedelta(hours=5)).isoformat(),
            "status": "upcoming"
        },
        "event_006": {
            "name": "New Year Countdown Splash",
            "type": "holiday_celebration",
            "venue_id": "venue_006",
            "venue_name": "Starlight Theme Park",
            "start_time": (now + timedelta(hours=1)).isoformat(),
            "status": "live"
        }
    }
    db.reference('/events').set(events)
    print(f"  ✓ {len(events)} events")

    # 3. Entry Points — venue_001 (Stadium, 6 gates)
    entry_points_001 = {}
    for i, label in enumerate(["A", "B", "C", "D", "E", "F"]):
        bottleneck = label == "B"
        entry_points_001[f"entry_{label}"] = {
            "label": f"Gate {label}",
            "proximity_tags": [f"Block {label}", f"Zone {i+1}"],
            "coordinates": {"lat": 12.9720 + (i * 0.0005), "lng": 77.5940 + (i * 0.0005)},
            "density": 0.85 if bottleneck else 0.10,
            "wait_minutes": 25 if bottleneck else 2,
            "status": "high" if bottleneck else "low",
            "capacity": 500,
            "current_count": 425 if bottleneck else 50
        }
    db.reference('/entry_points/event_001').set(entry_points_001)

    # 4. Entry Points — venue_003 (Royal Albert Hall, 12 doors)
    entry_points_003 = {}
    for i in range(12):
        bottleneck = i < 4
        entry_points_003[f"door_{i+1}"] = {
            "label": f"Door {i+1}",
            "proximity_tags": [f"Box {i+1}", f"Tier {i+1}"],
            "coordinates": {"lat": 51.5005 + (i * 0.0001), "lng": -0.1770 + (i * 0.0001)},
            "density": 0.80 if bottleneck else 0.15,
            "wait_minutes": 15 if bottleneck else 3,
            "status": "high" if bottleneck else "low",
            "capacity": 200,
            "current_count": 160 if bottleneck else 30
        }
    db.reference('/entry_points/event_003').set(entry_points_003)

    # 5. Entry Points — venue_004 (Festival, 12 portals)
    entry_points_004 = {}
    for i in range(12):
        label = chr(65 + i)
        bottleneck = label in ["A", "B", "C"]
        entry_points_004[f"entry_{label}"] = {
            "label": f"Portal {label}",
            "proximity_tags": [f"Zone {label}", f"Meadow {label}"],
            "coordinates": {"lat": 33.6780 + (i * 0.001), "lng": -116.2370 + (i * 0.001)},
            "density": 0.95 if bottleneck else 0.05,
            "wait_minutes": 60 if bottleneck else 2,
            "status": "high" if bottleneck else "low",
            "capacity": 2000,
            "current_count": 1900 if bottleneck else 100
        }
    db.reference('/entry_points/event_004').set(entry_points_004)

    # 6. Entry Points — venue_005 (Convention Center, 8 plazas)
    entry_points_005 = {}
    for i in range(8):
        entry_points_005[f"entry_{i+1}"] = {
            "label": f"Plaza Entry {i+1}",
            "proximity_tags": [f"Hall {chr(65+i)}", f"Booth {100*(i+1)}"],
            "coordinates": {"lat": 37.7840 + (i * 0.0002), "lng": -122.4015 + (i * 0.0002)},
            "density": 0.30,
            "wait_minutes": 5,
            "status": "low",
            "capacity": 800,
            "current_count": 240
        }
    db.reference('/entry_points/event_005').set(entry_points_005)

    # 7. Entry Points — venue_006 (Theme Park, 15 turnstiles)
    entry_points_006 = {}
    for i in range(15):
        peak = i % 3 == 0
        entry_points_006[f"gate_{i+1}"] = {
            "label": f"Turnstile {i+1}",
            "proximity_tags": [f"Land {chr(65+i)}", "Main Street"],
            "coordinates": {"lat": 28.3850 + (i * 0.0003), "lng": -81.5630 + (i * 0.0003)},
            "density": 0.88 if peak else 0.10,
            "wait_minutes": 45 if peak else 2,
            "status": "high" if peak else "low",
            "capacity": 1500,
            "current_count": 1320 if peak else 150
        }
    db.reference('/entry_points/event_006').set(entry_points_006)
    print("  ✓ Entry points for all events")

    # 8. Tickets
    tickets = {
        "IND-AUS-101": {
            "event_id": "event_001",
            "event_name": "India vs Australia — T20",
            "date": "April 19, 2026",
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
            "event_name": "Classic Night: Beethoven's 9th",
            "date": "April 21, 2026",
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
            "date": "Dec 31, 2026",
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
            "venue_address": "Bengaluru",
            "status": "expired",
            "owner_name": "Tony Stark",
            "claimed_by_uid": "tony_stark_uid"
        }
    }
    db.reference('/tickets').set(tickets)
    print(f"  ✓ {len(tickets)} tickets")

    # 9. Users (admin + 2 attendees + 30 staff)
    users = {
        "admin_mock_uid": {
            "name": "Admin User",
            "email": "admin@venueflow.com",
            "password": DEFAULT_PASSWORD,
            "role": "admin"
        },
        "tony_stark_uid": {
            "name": "Tony Stark",
            "email": "tony@stark.com",
            "password": DEFAULT_PASSWORD,
            "role": "attendee",
            "claimed_tickets": ["IND-AUS-101", "EXPIRED-STADIUM"]
        },
        "peter_parker_uid": {
            "name": "Peter Parker",
            "email": "peter@parker.com",
            "password": DEFAULT_PASSWORD,
            "role": "attendee",
            "claimed_tickets": ["TECH-EXPO-2026", "THEME-PARK-NYE"]
        }
    }

    staff_names = [
        "Steve Rogers", "Natasha Romanoff", "Bruce Banner", "Thor Odinson", "Clint Barton",
        "Wanda Maximoff", "Vision", "Sam Wilson", "James Rhodes", "Bucky Barnes",
        "Scott Lang", "Hope van Dyne", "T'Challa", "Carol Danvers", "Peter Quill",
        "Gamora", "Drax", "Rocket Raccoon", "Groot", "Mantis",
        "Stephen Strange", "Wong", "Arthur Curry", "Barry Allen", "Victor Stone",
        "Diana Prince", "Clark Kent", "Bruce Wayne", "Hal Jordan", "Oliver Queen"
    ]
    for i, name in enumerate(staff_names):
        uid = f"staff_uid_{i+1}"
        users[uid] = {
            "name": name,
            "email": f"staff_{i+1}@venueflow.com",
            "password": DEFAULT_PASSWORD,
            "role": "staff",
            "assigned_events": ["event_001", "event_004"] if i < 20 else ["event_006", "event_005"]
        }

    # Sync to Firebase Auth + RTDB
    rtdb_users = {}
    print(f"  Syncing {len(users)} users to Firebase Auth...")
    for uid, user_data in users.items():
        try:
            auth.create_user(
                uid=uid,
                email=user_data["email"],
                password=user_data["password"],
                display_name=user_data["name"]
            )
            print(f"    + Created  {user_data['email']}")
        except Exception:
            try:
                auth.update_user(
                    uid=uid,
                    email=user_data["email"],
                    password=user_data["password"],
                    display_name=user_data["name"]
                )
                print(f"    ~ Updated  {user_data['email']}")
            except Exception as e:
                print(f"    ! Failed   {user_data['email']}: {e}")

        db_entry = {k: v for k, v in user_data.items() if k != "password"}
        rtdb_users[uid] = db_entry

    db.reference('/users').set(rtdb_users)
    print(f"  ✓ {len(rtdb_users)} user profiles written to RTDB")

    # 10. Staff Presence (29 at Gate A to simulate bottleneck)
    presence = {"event_001": {}}
    for i in range(30):
        uid = f"staff_uid_{i+1}"
        if "event_001" in users[uid]["assigned_events"]:
            gate = "entry_A" if i < 29 else "entry_C"
            presence["event_001"][uid] = {
                "name": users[uid]["name"],
                "current_gate_id": gate,
                "status": "active",
                "last_reported": now.isoformat()
            }
    db.reference('/staff_presence').set(presence)

    # 11. Initial Notifications
    db.reference('/staff_notifications').set({
        "staff_uid_1": {
            "notif_001": {
                "message": "Welcome. Report to your assigned gate.",
                "target_gate_id": "entry_A",
                "sender_name": "System",
                "timestamp": now.isoformat(),
                "status": "unread",
                "acknowledged_at": None
            }
        }
    })

    db.reference('/emergency_alerts').set({})
    db.reference('/active_event').set({"event_id": "event_001"})

    print("\n✅ Seeding complete.")
    print("\n─────────────── CREDENTIALS ───────────────")
    print(f"  Password (all accounts): {DEFAULT_PASSWORD}")
    print()
    print("  ADMIN")
    print("    admin@venueflow.com")
    print()
    print("  ATTENDEES")
    print("    tony@stark.com    (tickets: IND-AUS-101)")
    print("    peter@parker.com  (tickets: TECH-EXPO-2026, THEME-PARK-NYE)")
    print()
    print("  STAFF  (staff_1@venueflow.com … staff_30@venueflow.com)")
    print("────────────────────────────────────────────")


if __name__ == "__main__":
    seed()
