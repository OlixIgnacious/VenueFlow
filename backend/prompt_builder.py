"""
AI Prompt Builder for VenueFlow.
Constructs structured system and user prompts for the Gemini model based on 
real-time venue configuration and crowd density data.
"""
from datetime import datetime, timezone
from typing import List, Tuple
from backend.models import VenueConfig, EventConfig, EntryPoint

def build_gemini_prompts(
    venue: VenueConfig, 
    event: EventConfig, 
    entry_points: List[EntryPoint], 
    ref_value: str
) -> Tuple[str, str]:
    """
    Constructs the system and user messages for the Gemini API.

    This function reconciles the static venue configuration, the specific event 
    metadata, and the real-time crowd density metrics into a set of prompts 
    that guide the AI to make an optimal entry recommendation.

    Args:
        venue (VenueConfig): The physical venue configuration.
        event (EventConfig): The scheduled event metadata.
        entry_points (List[EntryPoint]): Current state of all entry points.
        ref_value (str): The attendee's specific location reference (e.g., Seat section).

    Returns:
        Tuple[str, str]: A tuple containing (system_prompt, user_message).
    """
    
    # Calculate minutes to start for temporal context
    now = datetime.now(timezone.utc if event.start_time.tzinfo else None)
    minutes_to_start = int((event.start_time - now).total_seconds() / 60)
    
    # System prompt establishes the persona and the core logic rules
    system_prompt = f"""You are VenueFlow, an intelligent entry routing assistant.
You are currently operating at {venue.name}, a {venue.type}.
The event is {event.name} ({event.type}), starting in {minutes_to_start} minutes.
Your job is to minimise attendee wait times by recommending the least congested {venue.entry_label} that is also appropriate for the attendee's {venue.location_ref_label}.
Always respond with valid JSON only — no markdown, no text outside the JSON object."""

    # Serialize the current state of all entry points for the AI context
    entry_states = "\n".join([
        f"- {ep.label}: density {int(ep.density * 100)}%, wait {ep.wait_minutes} min, status {ep.status}"
        for ep in entry_points
    ])

    # User message provides the specific request and formatting instructions
    user_message = f"""Attendee {venue.location_ref_label}: {ref_value}
Current {venue.entry_label} states:
{entry_states}

Respond with JSON:
{{
  "recommended_entry": "string (the entry point ID, e.g. entry_A)",
  "wait_minutes": integer,
  "crowd_level": "low" | "moderate" | "high",
  "reason": "string (one friendly sentence, use correct vocabulary)",
  "alt_entry": "string (another entry point ID)",
  "tip": "string or null"
}}"""

    return system_prompt, user_message
