import pytest
from fastapi.testclient import TestClient
from unittest.mock import MagicMock, patch
from backend.main import app

client = TestClient(app)

@pytest.fixture
def mock_current_user():
    return {"uid": "user_123", "email": "tony@stark.com"}

@pytest.fixture
def mock_db_ref():
    with patch("firebase_admin.db.reference") as mock:
        yield mock

def test_get_me_success(mock_db_ref):
    # Setup mock profile
    mock_data = {
        "uid": "user_123",
        "name": "Tony Stark",
        "role": "attendee",
        "email": "tony@stark.com"
    }
    mock_db_ref.return_value.get.return_value = mock_data
    
    # Use dependency override for FastAPI
    from backend.utils.auth_middleware import get_current_user
    app.dependency_overrides[get_current_user] = lambda: {"uid": "user_123", "email": "tony@stark.com"}
    
    try:
        response = client.get("/api/users/me")
        assert response.status_code == 200
        assert response.json()["name"] == "Tony Stark"
        assert "claimed_tickets" in response.json()
    finally:
        app.dependency_overrides.clear()

def test_get_me_not_found(mock_db_ref):
    mock_db_ref.return_value.get.return_value = None
    from backend.utils.auth_middleware import get_current_user
    app.dependency_overrides[get_current_user] = lambda: {"uid": "user_123"}
    
    try:
        response = client.get("/api/users/me")
        assert response.status_code == 404
        assert response.json()["detail"] == "User profile not found"
    finally:
        app.dependency_overrides.clear()

def test_get_my_events_staff(mock_db_ref):
    # 1. Mock user profile
    mock_user = {
        "role": "staff",
        "assigned_events": ["event_001"]
    }
    mock_events = {"event_001": {"name": "Test Event 1"}}
    
    def side_effect(path):
        m = MagicMock()
        if path == "/users/user_123":
            m.get.return_value = mock_user
        elif path == "/events":
            m.get.return_value = mock_events
        return m
    mock_db_ref.side_effect = side_effect
    
    from backend.utils.auth_middleware import get_current_user
    app.dependency_overrides[get_current_user] = lambda: {"uid": "user_123"}
    
    try:
        response = client.get("/api/users/me/events")
        assert response.status_code == 200
        assert len(response.json()) == 1
    finally:
        app.dependency_overrides.clear()

def test_claim_ticket_safety_layers(mock_db_ref):
    mock_user = {"role": "attendee", "name": "Tony Stark", "claimed_tickets": []}
    mock_ticket = {"owner_name": "Tony Stark", "event_id": "event_A", "claimed_by_uid": None}
    mock_event = {"status": "live"}
    
    def side_effect(path):
        m = MagicMock()
        if path == "/users/user_123":
            m.get.return_value = mock_user
        elif path.startswith("/tickets/"):
            m.get.return_value = mock_ticket
        elif path.startswith("/events/"):
            m.get.return_value = mock_event
        return m
    mock_db_ref.side_effect = side_effect
    
    from backend.utils.auth_middleware import get_current_user
    app.dependency_overrides[get_current_user] = lambda: {"uid": "user_123"}
    
    try:
        # Success check
        response = client.post("/api/users/me/tickets", json={"ticket_id": "ticket_999"})
        assert response.status_code == 200
        
        # Name mismatch check
        mock_user["name"] = "Steve Rogers"
        response = client.post("/api/users/me/tickets", json={"ticket_id": "ticket_999"})
        assert response.status_code == 400
    finally:
        app.dependency_overrides.clear()
