"""
Unit tests for the Recommendation Fallback mechanism.
Ensures that the system correctly falls back to a rule-based pathfinding 
algorithm if the AI service (Gemini) is unavailable.
"""
import pytest
from unittest.mock import MagicMock, patch
from fastapi.testclient import TestClient
from backend.main import app
from backend.models import Recommendation

client = TestClient(app)

@pytest.fixture
def mock_firebase_data():
    with patch("backend.routers.recommend.firebase_client") as mock:
        mock.get_active_event_id.return_value = "event_001"
        mock.get_event.return_value = {
            "id": "event_001",
            "name": "Test Match",
            "venue_id": "venue_001",
            "type": "sports_match",
            "start_time": "2026-04-09T20:00:00Z",
            "status": "active"
        }
        mock.get_venue.return_value = {
            "name": "Test Stadium",
            "type": "stadium",
            "entry_point_count": 2,
            "coordinates": {"lat": 12.97, "lng": 77.59},
            "entry_label": "Gate",
            "location_ref_label": "Seat"
        }
        mock.get_entry_points.return_value = {
            "entry_A": {
                "label": "Gate A",
                "coordinates": {"lat": 12.971, "lng": 77.591},
                "density": 0.8,
                "wait_minutes": 15,
                "status": "high"
            },
            "entry_B": {
                "label": "Gate B",
                "coordinates": {"lat": 12.972, "lng": 77.592},
                "density": 0.2,
                "wait_minutes": 4,
                "status": "low"
            }
        }
        mock.get_ticket.return_value = {
            "event_id": "event_001",
            "status": "valid",
            "location_ref": "Seat-101"
        }
        yield mock

def test_recommendation_fallback(mock_gemini_client, mock_firebase_data):
    # Simulate Gemini failure
    mock_gemini_client.return_value = None
    
    response = client.get("/api/recommend?ref=Seat-101")
    assert response.status_code == 200
    
    data = response.json()
    # Should pick Gate B (density 0.2) over Gate A (0.8)
    assert data["recommended_entry"] == "entry_B"
    assert data["crowd_level"] == "low"
    assert "Gate B" in data["reason"]
    assert "AI reasoning unavailable" in data["tips"]
    assert data["alt_entry_id"] == "entry_A"
