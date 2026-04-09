from pydantic import BaseModel, Field
from typing import List, Optional, Dict
from datetime import datetime

class Coordinates(BaseModel):
    lat: float
    lng: float

class VenueConfig(BaseModel):
    id: str
    name: str
    type: str # stadium, auditorium, convention_center, arena, exhibition_hall
    entry_label: str # Gate, Door, Hall Entrance, Portal, Pavilion Entry
    location_ref_label: str # Seat section, Seat row, Session / Hall, Zone
    coordinates: Coordinates
    entry_point_count: int

class EventConfig(BaseModel):
    id: str
    name: str
    type: str # sports_match, concert, conference, exhibition, ceremony
    venue_id: str
    venue_name: Optional[str] = None
    start_time: datetime
    status: str # upcoming, live, ended

class EntryPoint(BaseModel):
    id: str # entry_A, entry_B...
    label: str # {entry_label} {suffix}
    coordinates: Coordinates
    density: float = 0.0
    wait_minutes: int = 0
    status: str = "low" # low, moderate, high
    capacity: int = 500
    current_count: int = 0

class Recommendation(BaseModel):
    recommended_entry: str
    wait_minutes: int
    crowd_level: str # low, moderate, high
    reason: str
    alt_entry: str
    tip: Optional[str] = None

class ActiveEventPointer(BaseModel):
    event_id: str

class Ticket(BaseModel):
    id: str
    event_id: str
    event_name: str
    date: str
    persons: int
    location_ref: str # The value to be used as ref for recommendation (Seat/Row/Zone)
    venue_address: str
    status: str = "valid" # valid, inside, void

