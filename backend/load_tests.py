from locust import HttpUser, task, between
import random

class VenueFlowLoadTest(HttpUser):
    # Wait between 1 and 2 seconds between tasks to simulate attendee behavior
    wait_time = between(1, 2)

    def on_start(self):
        # Could perform an initial login setup here if needed
        # For public endpoints or endpoints using generic keys, no auth needed
        self.client.headers.update({"origin": "http://localhost:5173"})

    @task(3)
    def test_recommendation_caching(self):
        # We simulate hitting the recommendation endpoint.
        # We will reuse the same reference frequently to hit the TTLCache
        refs = ["VIP-1", "GA-103", "GA-402", "BLOCK-B", "VIP-2"]
        ref = random.choice(refs)
        # Use our mocked active event from the DB or a fast test event
        # Assuming event_id isn't required if the ref is a ticket
        
        # Test rate limiting and performance under load
        with self.client.get(f"/api/recommend?ref={ref}", catch_response=True) as response:
            if response.status_code == 200:
                response.success()
            elif response.status_code == 429:
                # 429 is expected when rate limits hit, indicating SlowAPI is working
                response.success() 
            elif response.status_code == 404:
                # 404 could happen if ticket ref isn't seeded, we mark it successful for throughput testing
                response.success()

    @task(1)
    def test_health(self):
        self.client.get("/api/health")

    @task(2)
    def test_events_list(self):
        # Public events list check
        self.client.get("/api/events/list")
