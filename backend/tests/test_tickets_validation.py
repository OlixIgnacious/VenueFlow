import pytest
from unittest.mock import MagicMock, patch
from fastapi.testclient import TestClient
from backend.main import app

client = TestClient(app)

@pytest.mark.asyncio
async def test_get_ticket_success():
    mock_ticket = {
        "event_id": "event_001",
        "event_name": "India vs Australia",
        "date": "April 11, 2026",
        "persons": 2,
        "location_ref": "Block B, Row 12",
        "venue_address": "Cubbon Park, Bengaluru"
    }
    
    with patch("backend.services.firebase_client.firebase_client.get_ticket", return_value=mock_ticket):
        response = client.get("/api/tickets/IND-AUS-101")
        assert response.status_code == 200
        data = response.json()
        assert data["id"] == "IND-AUS-101"
        assert data["location_ref"] == "Block B, Row 12"

@pytest.mark.asyncio
async def test_duplicate_scan_rejected():
    mock_ticket = {
        "event_id": "event_001",
        "event_name": "India vs Australia",
        "date": "April 11, 2026",
        "persons": 2,
        "location_ref": "Block B, Row 12",
        "venue_address": "Bengaluru",
        "status": "inside"
    }
    with patch("backend.services.firebase_client.firebase_client.get_ticket", return_value=mock_ticket), \
         patch("backend.services.firebase_client.firebase_client.get_active_event_id", return_value="event_001"):
        response = client.get("/api/tickets/IND-AUS-101")
        assert response.status_code == 403
        assert "already been scanned" in response.json()["detail"]

@pytest.mark.asyncio
async def test_event_mismatch_rejected():
    mock_ticket = {
        "event_id": "WRONG_EVENT",
        "event_name": "India vs Australia",
        "date": "April 11, 2026",
        "persons": 2,
        "location_ref": "Block B, Row 12",
        "venue_address": "Bengaluru",
        "status": "valid"
    }
    with patch("backend.services.firebase_client.firebase_client.get_ticket", return_value=mock_ticket), \
         patch("backend.services.firebase_client.firebase_client.get_active_event_id", return_value="event_001"):
        response = client.get("/api/tickets/IND-AUS-101")
        assert response.status_code == 403
        assert "not for the currently active event" in response.json()["detail"]
