"""
Geospatial Utilities for VenueFlow.
Provides mathematical functions to calculate distance and cardinal direction
between geographic coordinates.
"""
import math
from typing import Tuple
from backend.models import Coordinates

def calculate_distance(c1: Coordinates, c2: Coordinates) -> float:
    """
    Calculates the great-circle distance between two points on the Earth's 
    surface using the Haversine formula.
    
    Returns:
        float: Distance in meters.
    """
    R = 6371000  # Radius of Earth in meters
    phi1, phi2 = math.radians(c1.lat), math.radians(c2.lat)
    dphi = math.radians(c2.lat - c1.lat)
    dlamb = math.radians(c2.lng - c1.lng)
    
    a = math.sin(dphi/2)**2 + \
        math.cos(phi1) * math.cos(phi2) * math.sin(dlamb/2)**2
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1-a))
    
    return R * c

def calculate_cardinal_direction(center: Coordinates, point: Coordinates) -> str:
    """
    Calculates the approximate cardinal direction of a point relative to a center.
    
    Returns:
        str: Cardinal direction (e.g., "North", "South-East").
    """
    # Calculate difference in coordinates
    # For small distances, simple delta logic is usually enough for AI context
    dlat = point.lat - center.lat
    dlng = point.lng - center.lng
    
    # Calculate angle in degrees (0 = East, 90 = North, 180 = West, 270 = South)
    angle = math.degrees(math.atan2(dlat, dlng))
    if angle < 0:
        angle += 360
        
    if 22.5 <= angle < 67.5: return "North-East"
    elif 67.5 <= angle < 112.5: return "North"
    elif 112.5 <= angle < 157.5: return "North-West"
    elif 157.5 <= angle < 202.5: return "West"
    elif 202.5 <= angle < 247.5: return "South-West"
    elif 247.5 <= angle < 292.5: return "South"
    elif 292.5 <= angle < 337.5: return "South-East"
    else: return "East"

def get_geospatial_context(center: Coordinates, point: Coordinates) -> Tuple[int, str]:
    """
    Computes both distance and direction in one call.
    
    Returns:
        Tuple[int, str]: (Distance in meters, Cardinal direction).
    """
    distance = int(calculate_distance(center, point))
    direction = calculate_cardinal_direction(center, point)
    return distance, direction
