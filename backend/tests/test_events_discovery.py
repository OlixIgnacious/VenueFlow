from unittest.mock import patch
from fastapi.testclient import TestClient
from backend.main import app

client = TestClient(app)

def test_list_events_success():
    mock_events = {
        "event_001": {
            "name": "India vs Australia — T20",
            "type": "sports_match",
            "venue_id": "venue_001",
            "start_time": "2026-04-09T20:31:11",
            "status": "upcoming"
        },
        "event_002": {
            "name": "Bengaluru Tech Summit",
            "type": "conference",
            "venue_id": "venue_002",
            "start_time": "2026-04-14T10:00:00",
            "status": "upcoming"
        }
    }
    
    with patch("backend.services.firebase_client.firebase_client.get_active_events", return_value=mock_events):
        response = client.get("/api/events/list")
        assert response.status_code == 200
        data = response.json()
        assert len(data) == 2
        assert data["event_001"]["name"] == "India vs Australia — T20"
        assert data["event_002"]["id"] == "event_002"

def test_list_events_empty():
    with patch("backend.services.firebase_client.firebase_client.get_active_events", return_value=None):
        response = client.get("/api/events/list")
        assert response.status_code == 200
        assert response.json() == {}
