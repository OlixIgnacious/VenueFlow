import pytest
from unittest.mock import patch, MagicMock
from fastapi import HTTPException
from backend.utils.spatial import calculate_distance, calculate_cardinal_direction, get_geospatial_context
from backend.utils.auth_middleware import get_current_user
from backend.models import Coordinates

# --- Spatial Tests ---

def test_calculate_distance():
    c1 = Coordinates(lat=34.0, lng=-118.0)
    c2 = Coordinates(lat=34.0, lng=-117.0) # Approx 92km
    dist = calculate_distance(c1, c2)
    assert 90000 < dist < 95000

def test_cardinal_directions():
    center = Coordinates(lat=0, lng=0)
    
    # NE (lat+, lng+)
    assert calculate_cardinal_direction(center, Coordinates(lat=1, lng=1)) == "North-East"
    # N (lat+)
    assert calculate_cardinal_direction(center, Coordinates(lat=1, lng=0)) == "North"
    # NW (lat+, lng-)
    assert calculate_cardinal_direction(center, Coordinates(lat=1, lng=-1)) == "North-West"
    # W (lng-)
    assert calculate_cardinal_direction(center, Coordinates(lat=0, lng=-1)) == "West"
    # SW (lat-, lng-)
    assert calculate_cardinal_direction(center, Coordinates(lat=-1, lng=-1)) == "South-West"
    # S (lat-)
    assert calculate_cardinal_direction(center, Coordinates(lat=-1, lng=0)) == "South"
    # SE (lat-, lng+)
    assert calculate_cardinal_direction(center, Coordinates(lat=-1, lng=1)) == "South-East"
    # E (lng+)
    assert calculate_cardinal_direction(center, Coordinates(lat=0, lng=1)) == "East"
    # Edge case: E (low angle)
    assert calculate_cardinal_direction(center, Coordinates(lat=0.1, lng=1)) == "East"
    
def test_geospatial_context():
    c1 = Coordinates(lat=0, lng=0)
    c2 = Coordinates(lat=0.1, lng=0)
    dist, direction = get_geospatial_context(c1, c2)
    assert isinstance(dist, int)
    assert direction == "North"

# --- Auth Middleware Tests ---

def test_get_current_user_valid():
    mock_creds = MagicMock()
    mock_creds.credentials = "valid_token"
    
    with patch("firebase_admin.auth.verify_id_token", return_value={"uid": "u1", "email": "t@t.com"}):
        user = get_current_user(mock_creds)
        assert user["uid"] == "u1"

def test_get_current_user_invalid():
    mock_creds = MagicMock()
    mock_creds.credentials = "invalid_token"
    
    with patch("firebase_admin.auth.verify_id_token", side_effect=ValueError("Invalid")):
        with pytest.raises(HTTPException) as exc:
            get_current_user(mock_creds)
        assert exc.value.status_code == 401

