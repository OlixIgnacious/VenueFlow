import pytest
from fastapi.testclient import TestClient
from unittest.mock import patch, MagicMock
from backend.main import app

client = TestClient(app)

@pytest.fixture(autouse=True)
def reset_limiter():
    from backend.main import limiter
    limiter.reset()
    yield

@pytest.fixture
def mock_firebase():
    # Patch the singleton instance methods directly to be safe
    from backend.services.firebase_client import firebase_client
    
    # We use mocker from pytest-mock if available, otherwise manual patch
    with patch('backend.services.firebase_client.firebase_client.get_active_event_id', return_value="event_001"), \
         patch('backend.services.firebase_client.firebase_client.get_event', return_value={
             "id": "event_001",
             "name": "India vs Australia — T20",
             "type": "sports_match",
             "venue_id": "venue_001",
             "venue_name": "M. Chinnaswamy Stadium",
             "start_time": "2026-04-11T19:00:00+00:00",
             "status": "upcoming"
         }), \
         patch('backend.services.firebase_client.firebase_client.get_venue', return_value={
             "name": "M. Chinnaswamy Stadium",
             "type": "stadium",
             "entry_label": "Gate",
             "location_ref_label": "Seat section",
             "coordinates": {"lat": 12.9716, "lng": 77.5946},
             "entry_point_count": 6
         }), \
         patch('backend.services.firebase_client.firebase_client.get_entry_points', return_value={
             "entry_A": {"label": "Gate A", "density": 0.8, "wait_minutes": 10, "status": "high", "capacity": 500, "coordinates": {"lat": 12, "lng": 77}},
             "entry_B": {"label": "Gate B", "density": 0.2, "wait_minutes": 2, "status": "low", "capacity": 500, "coordinates": {"lat": 12, "lng": 77}}
         }), \
         patch('backend.services.firebase_client.firebase_client.get_ticket', return_value={
             "event_id": "event_001",
             "event_name": "India vs Australia — T20",
             "date": "2026-04-11",
             "persons": 2,
             "location_ref": "Block B, Row 12",
             "venue_address": "M. Chinnaswamy Stadium, MG Road",
             "status": "valid"
         }), \
         patch('backend.services.firebase_client.firebase_client.update_ticket_status', return_value=None), \
         patch('backend.services.firebase_client.firebase_client.set_entry_points', return_value=None):
        yield firebase_client


def test_full_attendee_flow(mock_firebase):
    # 1. Check health
    response = client.get("/api/health")
    assert response.status_code == 200
    
    # 2. Get active event
    response = client.get("/api/venue/current")
    assert response.status_code == 200
    assert response.json()["event"]["id"] == "event_001"
    
    # 3. Scan ticket (Validate ticket endpoint)
    response = client.get("/api/tickets/IND-AUS-101?event_id=event_001")
    if response.status_code != 200:
        print(f"DEBUG: Ticket Scan Response: {response.json()}")
    assert response.status_code == 200
    assert response.json()["status"] == "inside" # It gets marked as inside on scan
    
    # 4. Get recommendation using ticket ref
    response = client.get("/api/recommend/?ref=Block%20B%2C%20Row%2012&event_id=event_001")
    assert response.status_code == 200
    data = response.json()
    assert data["recommended_entry"] == "entry_B"
    assert "Gate B" in data["reason"]

def test_admin_rate_limiting(mock_firebase):
    # This test assumes the limiter is keyed by IP and we are using TestClient
    # Since TestClient shares state, we might hit the limit if we call it 6 times.
    with patch('backend.config.settings.ADMIN_API_KEY', "testkey"):
        headers = {"Authorization": "Bearer testkey"}
        
        # Call 5 times - should be OK
        for _ in range(5):
            response = client.post("/api/admin/simulate/tick", headers=headers)
            assert response.status_code == 200
            
        # 6th call - should be rate limited
        response = client.post("/api/admin/simulate/tick", headers=headers)
        assert response.status_code == 429
