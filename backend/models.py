"""
Data models for the VenueFlow backend.
Defines the Pydantic schemas for data validation and API documentation.
"""
from pydantic import BaseModel, Field
from typing import List, Optional, Dict
from datetime import datetime

class Coordinates(BaseModel):
    """Simple latitude/longitude coordinate pair."""
    lat: float
    lng: float

class VenueConfig(BaseModel):
    """
    Physical configuration and metadata for a venue.

    Attributes:
        id (str): Unique identifier for the venue.
        name (str): Display name of the venue.
        type (str): Category (e.g., stadium, auditorium).
        entry_label (str): Taxonomy for entries (e.g., Gate, Pavilion).
        location_ref_label (str): Taxonomy for seat references (e.g., Seat section, Zone).
        coordinates (Coordinates): Geographic center of the venue.
        entry_point_count (int): Number of managed entry points.
    """
    id: str
    name: str
    type: str # stadium, auditorium, convention_center, arena, exhibition_hall
    entry_label: str # Gate, Door, Hall Entrance, Portal, Pavilion Entry
    location_ref_label: str # Seat section, Seat row, Session / Hall, Zone
    coordinates: Coordinates
    entry_point_count: int

class EventConfig(BaseModel):
    """
    Metadata for a scheduled event at a venue.

    Attributes:
        id (str): Unique identifier for the event.
        name (str): Display name of the event.
        type (str): Category (e.g., sports_match, concert).
        venue_id (str): Linked venue ID.
        venue_name (Optional[str]): Denormalized venue name for faster access.
        start_time (datetime): Scheduled start time.
        status (str): Operational status (e.g., upcoming, live).
    """
    id: str
    name: str
    type: str # sports_match, concert, conference, exhibition, ceremony
    venue_id: str
    venue_name: Optional[str] = None
    start_time: datetime
    status: str # upcoming, live, ended

class EntryPoint(BaseModel):
    """
    Crowd density and proximity data for a specific venue entry point.

    Attributes:
        id (str): Unique internal ID (e.g., entry_A).
        label (str): Human-readable name (e.g., Gate A).
        coordinates (Coordinates): Geographic location of the entry gate.
        density (float): Live congestion level (0.0 to 1.0).
        wait_minutes (int): Estimated wait time in minutes.
        status (str): Traffic level label (low, moderate, high).
        capacity (int): Maximum throughput capacity.
        current_count (int): Current number of arrivals detected.
    """
    id: str # entry_A, entry_B...
    label: str # {entry_label} {suffix}
    coordinates: Coordinates
    density: float = 0.0
    wait_minutes: int = 0
    status: str = "low" # low, moderate, high
    capacity: int = 500
    current_count: int = 0

class Recommendation(BaseModel):
    """
    AI-generated guidance for an attendee.

    Attributes:
        recommended_entry (str): The optimal entry point ID.
        wait_minutes (int): Estimated wait time at the recommended entry.
        crowd_level (str): Expected traffic level.
        reason (str): Natural language explanation for the selection.
        alt_entry (str): A secondary entry point as a suggestion.
        tip (Optional[str]): Context-aware tip (e.g., 'Turn left at the fountain').
    """
    recommended_entry: str
    wait_minutes: int
    crowd_level: str # low, moderate, high
    reason: str
    alt_entry: str
    tip: Optional[str] = None

class ActiveEventPointer(BaseModel):
    """Points to the currently active/live event for the system."""
    event_id: str

class Ticket(BaseModel):
    """
    Attendee ticket data from the ticketing system.

    This model represents the digital twin of a physical or mobile ticket, 
    linking an attendee to a specific event and location within the venue.

    Attributes:
        id (str): Unique ticket/barcode reference (e.g., TKT-12345).
        event_id (str): ID of the event this ticket is valid for.
        event_name (str): Display name of the event (denormalized).
        date (str): Human-readable date of the event.
        persons (int): Number of attendees admitted by this ticket.
        location_ref (str): The specific seat/section/zone (e.g., 'Section 101, Row A').
        venue_address (str): Physical address of the venue for display.
        status (str): Lifecycle state: 'valid' (unused), 'inside' (scanned), 'void' (cancelled).
    """
    id: str
    event_id: str
    event_name: str
    date: str
    persons: int
    location_ref: str
    venue_address: str
    status: str = "valid"

