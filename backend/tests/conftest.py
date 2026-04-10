"""
Shared test fixtures and global mocks for the VenueFlow backend test suite.
"""
import pytest
from unittest.mock import patch, MagicMock

@pytest.fixture(autouse=True)
def mock_gemini_client():
    """
    Globally mocks the GeminiClient.generate_recommendation method
    to prevent real API calls during tests, even if an API key is present.
    """
    with patch("backend.services.gemini_client.GeminiClient.generate_recommendation") as mock:
        # Default mock response for a successful AI recommendation
        mock.return_value = {
            "recommended_entry": "entry_B",
            "wait_minutes": 2,
            "crowd_level": "low",
            "reason": "Mocked AI recommends Gate B because it has significantly lower density and a shorter wait time compared to other options.",
            "alt_entry": "entry_A",
            "tip": "This is a mocked AI response for testing."
        }
        yield mock
