import pytest
from fastapi.testclient import TestClient
from backend.main import app
from backend.utils.auth_middleware import get_current_user
from firebase_admin import db
import json

# Setup the TestClient
client = TestClient(app)

# --- MOCKS ---

def mock_get_current_user_admin():
    return {"uid": "admin_test_uid", "email": "admin@test.com"}

def mock_get_current_user_staff():
    return {"uid": "staff_test_uid", "email": "staff@test.com"}

def mock_get_current_user_attendee():
    return {"uid": "attendee_test_uid", "email": "attendee@test.com"}

class MockDBReference:
    def __init__(self, data):
        self.data = data
    def get(self):
        return self.data
    def child(self, path):
        # Very minimal child implementation for ticket lookup
        if path == "TICKET-123":
            return MockDBReference({"event_id": "event_001"})
        return MockDBReference(None)

# --- TESTS ---

def test_get_profile_admin(mocker):
    # Mock the RTDB response for the admin user
    mock_user_data = {
        "name": "Admin Tester",
        "role": "admin",
        "email": "admin@test.com"
    }
    
    # Patch the get_current_user dependency
    app.dependency_overrides[get_current_user] = mock_get_current_user_admin
    
    # Patch firebase_admin.db.reference
    mocker.patch("firebase_admin.db.reference", return_value=MockDBReference(mock_user_data))
    
    response = client.get("/api/users/me")
    
    assert response.status_code == 200
    assert response.json()["role"] == "admin"
    assert response.json()["name"] == "Admin Tester"
    
    # Cleanup overrides
    app.dependency_overrides = {}

def test_get_events_staff_restricted(mocker):
    # Staff should only see their assigned events
    mock_staff_data = {
        "name": "Staff Guard",
        "role": "staff",
        "assigned_events": ["event_001"]
    }
    
    mock_all_events = {
        "event_001": {"name": "India vs Australia", "status": "live"},
        "event_002": {"name": "Tech Summit", "status": "upcoming"}
    }
    
    app.dependency_overrides[get_current_user] = mock_get_current_user_staff
    
    # Logic in users.py calls reference('/users/{uid}') then reference('/events')
    def mock_ref_selector(path):
        if path.startswith("/users/"):
            return MockDBReference(mock_staff_data)
        if path == "/events":
            return MockDBReference(mock_all_events)
        return MockDBReference(None)
        
    mocker.patch("firebase_admin.db.reference", side_effect=mock_ref_selector)
    
    response = client.get("/api/users/me/events")
    
    assert response.status_code == 200
    data = response.json()
    assert len(data) == 1
    assert data[0]["id"] == "event_001"
    assert data[0]["name"] == "India vs Australia"
    
    app.dependency_overrides = {}

def test_get_events_attendee_restricted(mocker):
    # Attendee should only see events for claimed tickets
    mock_attendee_data = {
        "name": "Tony Stark",
        "role": "attendee",
        "claimed_tickets": ["TICKET-123"]
    }
    
    mock_all_events = {
        "event_001": {"name": "India vs Australia", "status": "live"}
    }
    
    app.dependency_overrides[get_current_user] = mock_get_current_user_attendee
    
    def mock_ref_selector(path):
        if path.startswith("/users/"):
            return MockDBReference(mock_attendee_data)
        if path == "/events":
            return MockDBReference(mock_all_events)
        if path == "/tickets":
            return MockDBReference(None) # Not used directly in simple flow
        return MockDBReference(None)
        
    mocker.patch("firebase_admin.db.reference", side_effect=mock_ref_selector)
    
    response = client.get("/api/users/me/events")
    
    assert response.status_code == 200
    data = response.json()
    assert len(data) == 1
    assert data[0]["id"] == "event_001"
    
    app.dependency_overrides = {}

def test_admin_api_key_required():
    # Admin endpoints use a static API key, not Firebase roles
    # Test failure without key
    response = client.post("/api/admin/activate", json={"event_id": "event_001"})
    assert response.status_code == 403
    
    # Test success with mock key (from config)
    from backend.config import settings
    response = client.post(
        "/api/admin/activate", 
        json={"event_id": "event_001"},
        headers={"Authorization": f"Bearer {settings.ADMIN_API_KEY}"}
    )
    # 404 is actually "success" for auth because it means it passed verify_admin_key 
    # and failed at finding the event in the mock db.
    assert response.status_code in [200, 404] 
