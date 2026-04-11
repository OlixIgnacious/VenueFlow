import sys
import os
import math

# Add root to sys.path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from backend.utils.spatial import calculate_distance, calculate_cardinal_direction
from backend.models import Coordinates

def test_distance():
    print("Testing distance calculation...")
    c1 = Coordinates(lat=12.9716, lng=77.5946) # Venue Center
    c2 = Coordinates(lat=12.9720, lng=77.5940) # 60m away approx
    
    dist = calculate_distance(c1, c2)
    print(f"Distance: {dist:.2f} meters")
    assert 50 < dist < 80
    print("✅ Distance test passed.")

def test_bearing():
    print("\nTesting bearing logic...")
    center = Coordinates(lat=12.9716, lng=77.5946)
    
    # Points in different directions
    north = Coordinates(lat=12.9726, lng=77.5946)
    south = Coordinates(lat=12.9706, lng=77.5946)
    east = Coordinates(lat=12.9716, lng=77.5956)
    west = Coordinates(lat=12.9716, lng=77.5936)
    
    assert calculate_cardinal_direction(center, north) == "North"
    print("✅ North bearing passed.")
    assert calculate_cardinal_direction(center, south) == "South"
    print("✅ South bearing passed.")
    assert calculate_cardinal_direction(center, east) == "East"
    print("✅ East bearing passed.")
    assert calculate_cardinal_direction(center, west) == "West"
    print("✅ West bearing passed.")

if __name__ == "__main__":
    try:
        test_distance()
        test_bearing()
        print("\nALL UNIT TESTS PASSED!")
    except Exception as e:
        print(f"\n❌ TEST FAILED: {str(e)}")
        sys.exit(1)
