import pytest
from fastapi.testclient import TestClient
from unittest.mock import MagicMock, patch
from backend.main import app
from backend.config import settings

client = TestClient(app)

@pytest.fixture
def mock_admin_user():
    return {"uid": "admin_123", "email": "admin@venueflow.com"}

@pytest.fixture
def mock_db_ref():
    with patch("firebase_admin.db.reference") as mock:
        yield mock

def test_verify_admin_key_success(mock_db_ref):
    # Test an endpoint that uses verify_admin_key (e.g., /activate)
    with patch("backend.services.firebase_client.firebase_client.get_event", return_value={"id": "evt1"}), \
         patch("backend.services.firebase_client.firebase_client.set_active_event"):
        
        headers = {"Authorization": f"Bearer {settings.ADMIN_API_KEY}"}
        response = client.post("/api/admin/activate", json={"event_id": "evt1"}, headers=headers)
        
        assert response.status_code == 200
        assert "active" in response.json()["message"]

def test_verify_admin_key_failure():
    headers = {"Authorization": "Bearer WRONG_KEY"}
    response = client.post("/api/admin/activate", json={"event_id": "evt1"}, headers=headers)
    assert response.status_code == 403

def test_dispatch_personnel_success(mock_db_ref):
    # Mocking verify_admin_user dependency via app.dependency_overrides
    from backend.utils.auth_middleware import get_current_user
    app.dependency_overrides[get_current_user] = lambda: {"uid": "admin_123"}
    
    mock_db_ref.return_value.get.return_value = {"role": "admin", "name": "Super Admin"}
    
    try:
        payload = {
            "event_id": "evt1",
            "staff_uid": "staff_123",
            "target_gate_id": "gate_A",
            "message": "Go to Gate A"
        }
        response = client.post("/api/admin/dispatch", json=payload)
        assert response.status_code == 200
    finally:
        app.dependency_overrides.clear()

def test_get_event_personnel_merger(mock_db_ref):
    mock_all_users = {
        "staff_123": {"role": "staff", "name": "Steve", "assigned_events": ["evt1"], "email": "steve@test.com"}
    }
    mock_presence = {"staff_123": {"status": "active", "last_reported": "2026-04-18T00:00:00Z"}}
    
    def side_effect(path):
        m = MagicMock()
        if path == "/users/admin_123": m.get.return_value = {"role": "admin"}
        elif path == "/users": m.get.return_value = mock_all_users
        elif path == "/staff_presence/evt1": m.get.return_value = mock_presence
        return m
    mock_db_ref.side_effect = side_effect
    
    from backend.utils.auth_middleware import get_current_user
    app.dependency_overrides[get_current_user] = lambda: {"uid": "admin_123"}
    
    try:
        response = client.get("/api/admin/personnel/evt1")
        assert response.status_code == 200
        assert len(response.json()) == 1
    finally:
        app.dependency_overrides.clear()

