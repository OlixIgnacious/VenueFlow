"""
Unit tests for the Entry Points and Venue routers.
Verifies the retrieval of gate density data and venue/event metadata.
"""
import pytest
from fastapi.testclient import TestClient
from unittest.mock import MagicMock, patch
from backend.main import app

client = TestClient(app)

@pytest.fixture
def mock_firebase():
    with patch("backend.routers.venue.firebase_client") as mock_venue, \
         patch("backend.routers.entry_points.firebase_client") as mock_ep:
        yield mock_venue, mock_ep

def test_health_check():
    response = client.get("/api/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok", "version": "1.0.0"}

def test_get_current_venue_success(mock_firebase):
    mock_venue, mock_ep = mock_firebase
    mock_venue.get_active_event_id.return_value = "event_001"
    mock_venue.get_event.return_value = {
        "name": "Test Event",
        "type": "concert",
        "venue_id": "venue_001",
        "start_time": "2026-04-10T19:30:00",
        "status": "upcoming"
    }
    mock_venue.get_venue.return_value = {
        "name": "Test Venue",
        "type": "stadium",
        "entry_label": "Gate",
        "location_ref_label": "Seat section",
        "coordinates": {"lat": 0, "lng": 0},
        "entry_point_count": 5
    }

    response = client.get("/api/venue/current")
    assert response.status_code == 200
    data = response.json()
    assert data["venue"]["name"] == "Test Venue"
    assert data["event"]["name"] == "Test Event"

def test_get_entry_points(mock_firebase):
    mock_venue, mock_ep = mock_firebase
    mock_ep.get_active_event_id.return_value = "event_001"
    mock_ep.get_entry_points.return_value = {
        "entry_A": {
            "label": "Gate A",
            "coordinates": {"lat": 1, "lng": 1},
            "density": 0.5,
            "wait_minutes": 5,
            "status": "moderate",
            "capacity": 500,
            "current_count": 250
        }
    }

    response = client.get("/api/entry-points")
    assert response.status_code == 200
    data = response.json()
    assert "entry_A" in data
    assert data["entry_A"]["label"] == "Gate A"
