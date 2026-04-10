# VenueFlow Backend 🧠

The VenueFlow backend is a high-performance **FastAPI** application that orchestrates crowd simulation, real-time data synchronization, and AI-powered entry recommendations.

## 🏗️ Architecture

The backend is organized into functional layers:

- **Routers** (`/routers`): API endpoints for tickets, administrative controls, events, and recommendations.
- **Services** (`/services`): Core business logic for Firebase interaction, Gemini AI orchestration, and the crowd simulator.
- **Models** (`/backend/models.py`): Pydantic schemas for data validation and API documentation.
- **Config** (`/backend/config.py`): Environment-driven configuration using `Pydantic Settings`.

## 🤖 AI Orchestration

VenueFlow utilizes **Gemini 2.0 Flash** to provide personalized routing advice.

1.  **Context Building**: The `PromptBuilder` retrieves the current venue configuration (e.g., gate labels, seat sections) and real-time gate density.
2.  **Prompt Engineering**: It constructs a zero-shot prompt that instructs Gemini to select the optimal gate based on proximity and wait time.
3.  **Fallback Logic**: If the AI service is unavailable or returns an invalid gate, a robust rule-based fallback system takes over to ensure the user is never without a recommendation.

## 📈 Crowd Simulator

To provide a realistic demo experience, the backend includes a stochastic simulator (`simulator.py`):

- **Event-Awareness**: Different event types (Concert vs. Sports vs. Conference) have different "arrival curves".
- **Dynamic Simulation**: Every 10 seconds (in the background), the simulator updates entry counts and density based on a sinusoidal probability function centered around the event start time.
- **Firebase Sync**: Updates are pushed to the Firebase Realtime Database, which triggers live updates in the React frontend.

## 🛠️ Development

### Prerequisites
- Python 3.11+
- Firebase Service Account (JSON)
- Google Cloud Project with Vertex AI API enabled

### Running Locally
```bash
# From the project root
pip install -r backend/requirements.txt
export FIREBASE_CREDENTIALS=$(cat path/to/service-account.json)
uvicorn backend.main:app --host 0.0.0.0 --port 8080 --reload
```

### API Documentation
Once running, you can access the interactive Swagger UI at:
- `http://localhost:8080/docs`

## 🧪 Testing

We use `pytest` for comprehensive backend testing, including:
- **Smoke Tests**: Verifying all core endpoints.
- **Recommendation Logic**: Testing AI response handling and fallback mechanisms.
- **Simulator Accuracy**: Verifying that arrival curves follow the correct math.

```bash
pytest backend/tests/
```

---
**Part of the VenueFlow Project**
