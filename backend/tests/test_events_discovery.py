"""
Unit tests for the Events Discovery router.
Verifies the identification and listing of available events with venue metadata.
"""
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
            "status": "active"
        },
        "event_004": {
            "name": "Summer Solstice Fest 2026",
            "type": "festival",
            "venue_id": "venue_004",
            "start_time": "2026-06-21T12:00:00",
            "status": "active"
        }
    }
    
    with patch("backend.services.firebase_client.firebase_client.get_active_events", return_value=mock_events), \
         patch("backend.services.firebase_client.firebase_client.get_venue", return_value={"name": "M. Chinnaswamy Stadium"}):
        response = client.get("/api/events/list")
        assert response.status_code == 200
        data = response.json()
        assert len(data) == 2
        assert data["event_001"]["name"] == "India vs Australia — T20"
        assert data["event_004"]["id"] == "event_004"

def test_list_events_empty():
    with patch("backend.services.firebase_client.firebase_client.get_active_events", return_value=None):
        response = client.get("/api/events/list")
        assert response.status_code == 200
        assert response.json() == {}
