"""
Unit tests for the Ticket Validation router.
Verifies ticket scanning logic, event matching, and prevents duplicate entries.
"""
from unittest.mock import patch
from fastapi.testclient import TestClient
from backend.main import app

client = TestClient(app)

def test_get_ticket_success():
    mock_ticket = {
        "event_id": "event_001",
        "event_name": "India vs Australia",
        "date": "April 11, 2026",
        "persons": 2,
        "location_ref": "Block B, Row 12",
        "venue_address": "Cubbon Park, Bengaluru"
    }

    with patch("backend.services.firebase_client.firebase_client.get_ticket", return_value=mock_ticket), \
         patch("backend.services.firebase_client.firebase_client.get_event", return_value={"status": "active"}), \
         patch("backend.services.firebase_client.firebase_client.update_ticket_status", return_value=None):
        response = client.get("/api/tickets/IND-AUS-101")
        assert response.status_code == 200
        data = response.json()
        assert data["id"] == "IND-AUS-101"
        assert data["location_ref"] == "Block B, Row 12"

def test_duplicate_scan_rejected():
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
         patch("backend.services.firebase_client.firebase_client.get_event", return_value={"status": "active"}):
        response = client.get("/api/tickets/IND-AUS-101")
        assert response.status_code == 403
        assert "already been scanned" in response.json()["detail"]

def test_event_mismatch_rejected():
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
         patch("backend.services.firebase_client.firebase_client.get_event", return_value={"status": "upcoming"}):
        response = client.get("/api/tickets/IND-AUS-101")
        assert response.status_code == 403
        assert "not currently active" in response.json()["detail"]
