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
async def test_get_ticket_not_found():
    with patch("backend.services.firebase_client.firebase_client.get_ticket", return_value=None):
        response = client.get("/api/tickets/INVALID-ID")
        assert response.status_code == 404
        assert "not found" in response.json()["detail"]
