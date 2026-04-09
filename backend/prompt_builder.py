from datetime import datetime, timezone
from typing import List, Tuple
from backend.models import VenueConfig, EventConfig, EntryPoint

def build_gemini_prompts(
    venue: VenueConfig, 
    event: EventConfig, 
    entry_points: List[EntryPoint], 
    ref_value: str
) -> Tuple[str, str]:
    
    # Calculate minutes to start
    now = datetime.now(timezone.utc if event.start_time.tzinfo else None)
    minutes_to_start = int((event.start_time - now).total_seconds() / 60)
    
    system_prompt = f"""You are VenueFlow, an intelligent entry routing assistant.
You are currently operating at {venue.name}, a {venue.type}.
The event is {event.name} ({event.type}), starting in {minutes_to_start} minutes.
Your job is to minimise attendee wait times by recommending the least congested {venue.entry_label} that is also appropriate for the attendee's {venue.location_ref_label}.
Always respond with valid JSON only — no markdown, no text outside the JSON object."""

    entry_states = "\n".join([
        f"- {ep.label}: density {int(ep.density * 100)}%, wait {ep.wait_minutes} min, status {ep.status}"
        for ep in entry_points
    ])

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
