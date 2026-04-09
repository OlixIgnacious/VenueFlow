import pytest
from backend.services.simulator import CrowdSimulator

@pytest.fixture
def sim():
    return CrowdSimulator()

def test_sports_match_curve(sim):
    # Peak should be at T-15 to T0
    assert sim.sports_match_curve(-15) == pytest.approx(0.85)
    assert sim.sports_match_curve(0) == pytest.approx(0.85)
    # Should be low far before
    assert sim.sports_match_curve(-121) == pytest.approx(0.05)
    # Should drop after start
    assert sim.sports_match_curve(10) < 0.85

def test_concert_curve(sim):
    # Sharp ramp
    assert sim.concert_curve(-100) == pytest.approx(0.02)
    assert sim.concert_curve(-30) == pytest.approx(0.9)
    # Exit spike
    assert sim.concert_curve(150) == pytest.approx(0.95)

def test_get_density_ranges(sim):
    # Density should always be between 0.01 and 0.99
    for _ in range(100):
        d = sim.get_density("sports_match", -30, 0)
        assert 0.01 <= d <= 0.99

def test_conference_curve(sim):
    assert sim.conference_curve(0) == 0.8 # Morning peak
    assert sim.conference_curve(200) == 0.7 # Lunch
    assert sim.conference_curve(600) == 0.6 # Exit
