import time
import random
import math
import threading
import logging
from datetime import datetime, timezone
from backend.services.firebase_client import firebase_client

logger = logging.getLogger(__name__)

class CrowdSimulator:
    def __init__(self):
        self.running = False
        self.thread = None
        self.interval = 30 # seconds
        self.active_event_id = None

    def sports_match_curve(self, t_min: int) -> float:
        # t_min is minutes relative to start (T=0)
        if t_min < -120: return 0.05
        if -120 <= t_min < -60: return 0.1 + (t_min + 120) * 0.005 # Linear rise
        if -60 <= t_min < -15: return 0.4 + (t_min + 60) * 0.01 # Sharp ramp to 0.85
        if -15 <= t_min < 0: return 0.85 # Peak
        if 0 <= t_min < 20: return 0.85 - (t_min * 0.03) # Sharp drop after kick-off
        if 20 <= t_min < 40: return 0.25 - (t_min - 20) * 0.0075 # Smooth trickle to 0.1
        if 40 <= t_min < 50: return 0.3 + 0.2 * math.sin((t_min - 40) * math.pi / 10) # Half-time peak
        if t_min > 90: return 0.9 # Exit spike
        return 0.1 # During match trickle

    def concert_curve(self, t_min: int) -> float:
        if t_min < -90: return 0.02
        if -90 <= t_min < -30: return 0.1 + (t_min + 90) * 0.013 # Sharp ramp
        if -30 <= t_min < 0: return 0.9
        if t_min > 120: return 0.95 # Exit spike
        return 0.05

    def conference_curve(self, t_min: int) -> float:
        # Morning peak (9am start)
        if -30 <= t_min <= 15: return 0.8
        # Lunch peak (assume 3-4 hours after start)
        if 180 <= t_min <= 240: return 0.7
        # Afternoon session
        if 300 <= t_min <= 330: return 0.5
        if t_min > 480: return 0.6 # Exit
        return 0.2

    def exhibition_curve(self, t_min: int) -> float:
        if t_min < 0: return 0.05
        if 0 <= t_min < 120: return 0.1 + (t_min * 0.004) # Slow ramp
        return 0.5 + 0.1 * math.sin(t_min / 60) # Steady with minor fluctuations

    def ceremony_curve(self, t_min: int) -> float:
        if -45 <= t_min < -5: return 0.85 # Very sharp peak
        if t_min > 60: return 0.9 # Sharp exit
        return 0.05

    def get_density(self, event_type: str, minutes_to_start: int, index: int) -> float:
        # Select curve
        if event_type == "sports_match":
            base = self.sports_match_curve(minutes_to_start)
        elif event_type == "concert":
            base = self.concert_curve(minutes_to_start)
        elif event_type == "conference":
            base = self.conference_curve(minutes_to_start)
        elif event_type == "exhibition":
            base = self.exhibition_curve(minutes_to_start)
        elif event_type == "ceremony":
            base = self.ceremony_curve(minutes_to_start)
        else:
            base = 0.2

        # Add per-gate variance and noise
        gate_bias = (index % 3 - 1) * 0.1 # Some gates are naturally busier
        noise = random.uniform(-0.05, 0.05)
        
        density = max(0.01, min(0.99, base + gate_bias + noise))
        return density

    def update_once(self):
        self.active_event_id = firebase_client.get_active_event_id()
        if not self.active_event_id:
            return

        event_data = firebase_client.get_event(self.active_event_id)
        if not event_data:
            return

        event_type = event_data.get('type')
        start_time = datetime.fromisoformat(event_data.get('start_time'))
        now = datetime.now(timezone.utc if start_time.tzinfo else None)
        
        minutes_to_start = int((now - start_time).total_seconds() / 60)

        entry_points = firebase_client.get_entry_points(self.active_event_id)
        if not entry_points:
            return

        updated_entry_points = {}
        for index, (eid, data) in enumerate(entry_points.items()):
            density = self.get_density(event_type, minutes_to_start, index)
            wait = int(density * 20) # Max 20 min wait
            status = "low"
            if density > 0.7: status = "high"
            elif density > 0.4: status = "moderate"

            data['density'] = round(density, 2)
            data['wait_minutes'] = wait
            data['status'] = status
            data['current_count'] = int(density * data.get('capacity', 500))
            updated_entry_points[eid] = data

        firebase_client.set_entry_points(self.active_event_id, updated_entry_points)
        logger.info(f"Simulator tick: {self.active_event_id} ({event_type}) at T{minutes_to_start}min")

    def run_loop(self):
        while self.running:
            try:
                self.update_once()
            except Exception as e:
                logger.error(f"Simulator error: {e}")
            time.sleep(self.interval)

    def start(self):
        if not self.running:
            self.running = True
            self.thread = threading.Thread(target=self.run_loop, daemon=True)
            self.thread.start()
            logger.info("Simulator thread started")

    def stop(self):
        self.running = False
        if self.thread:
            self.thread.join(timeout=5)
            logger.info("Simulator thread stopped")

simulator = CrowdSimulator()
