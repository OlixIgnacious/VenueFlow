# VenueFlow 🏟️ — Smart Entry & Crowd Intelligence

VenueFlow is a venue-agnostic, event-type-aware crowd routing platform. It solves entry-point congestion at large-scale events by providing attendees with personalized AI-powered recommendations and staff with real-time crowd intelligence dashboards.

## 🚀 The Core Problem
At any major event, people naturally cluster at familiar or visible entrances, creating long wait times while other gates remain underused. VenueFlow distributes the crowd intelligently using real-time density sensors (simulated) and Gemini AI.

## 🌟 Key Features
- **Dynamic Vocabulary**: Labels like "Gate", "Door", or "Pavilion" are injected via config — zero hardcoding.
- **Event-Aware Simulation**: Crowd curves match real behavior (Sports vs. Concerts vs. Conferences).
- **Gemini Recommendations**: Intelligent routing logic that understands venue context.
- **Real-time Heatmap**: Visual dashboard for venue staff to spot bottlenecks before they form.
- **Walking Directions**: Integrated Google Maps directions to the recommended entrance.

## 🛠️ Tech Stack
- **Backend**: FastAPI (Python 3.11)
- **Frontend**: React 18 (Vite, Tailwind CSS)
- **AI**: Gemini 2.0 Flash (via Google AI Studio)
- **Database**: Firebase Realtime Database
- **Hosting**: Google Cloud Run
- **Secrets**: Google Cloud Secret Manager
- **Maps**: Google Maps JavaScript API (Heatmap + Directions)

## 📁 Project Structure
```text
venueflow/
├── backend/            # FastAPI source code
├── frontend/           # React + Vite source code
├── scripts/            # Database seeding scripts
├── docs/               # Setup & Deployment guides
├── Dockerfile          # Multi-stage production build
└── thingstodo.md      # Development checklist
```

## ⚙️ Setup & Deployment
Detailed guides are available in the `docs/` folder:
- [Firebase Setup](docs/firebase_setup_guide.md)
- [GCP Setup](docs/gcp_setup_guide.md)
- [Google Maps Setup](docs/google_maps_setup_guide.md)

### Local Development
1. **Backend**:
   ```bash
   pip install -r backend/requirements.txt
   uvicorn backend.main:app --reload
   ```
2. **Frontend**:
   ```bash
   cd frontend
   npm install
   npm run dev
   ```

## 🧪 Demo Scenario
The system is seeded with two distinct contexts:
1. **Stadium**: "India vs Australia T20" at M. Chinnaswamy Stadium. Uses "Gate" and "Seat Section".
2. **Exhibition Hall**: "Bengaluru Tech Summit" at BIEC. Uses "Pavilion Entry" and "Zone".

Switching between these via the Admin API instantly updates all UI labels, the Gemini prompt context, and the simulator's crowd behavior curve.

## 📝 Assumptions
- **Crowd density is simulated.** Real deployments would use IoT sensors (infrared counters, camera CV models) at each entry point in place of `simulator.py`.
- **Ticket scanner is a simulation.** The QR UI does not use the device camera. Production would use `html5-qrcode` or ruggedised handheld scanners over venue Wi-Fi/LTE.
- **No attendee authentication.** The flow requires only a ticket ID. Production would add identity verification to prevent ticket sharing.
- **Entry point coordinates are approximate.** Lat/lng are computed as stadium centre ± offset. Real deployments would GPS-survey each gate precisely.
- **Single active event at a time.** Multi-venue concurrent support would require per-venue Firebase namespacing and horizontal API scaling.
- **Wait time is capacity-relative.** `wait = int(current_count / 15) + 1` assumes a throughput of ~15 people/minute per gate. A real system would calibrate throughput from historical scan-rate data.

---
**Hackathon Submission** — *Built for Google Antigravity Challenge*