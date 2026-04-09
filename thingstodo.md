# VenueFlow — Project Checklist

This file tracks the development progress of VenueFlow.

## PHASE 1 — Firebase Schema + Backend Foundation
- [ ] Scaffold folder structure (`backend/`, `frontend/`, `scripts/`)
- [ ] Define Pydantic models in `backend/models.py`
- [ ] Create `scripts/seed_firebase.py` for stadium and exhibition hall
- [ ] Setup `backend/services/firebase_client.py`
- [ ] Implement `GET /api/venue/current`
- [ ] Implement `GET /api/entry-points`
- [ ] Implement `GET /api/health`
- [ ] Add unit tests for entry points

## PHASE 2 — Simulator (Event-type-aware)
- [ ] Implement `simulator.py` with 5 curve functions
- [ ] Implement simulator background thread in FastAPI lifespan
- [ ] Implement `POST /api/simulate/tick`
- [ ] Implement `POST /api/admin/activate`
- [ ] Add unit tests for curve shapes

## PHASE 3 — Gemini Recommendation Engine
- [ ] Implement `prompt_builder.py` (pure functions, no hardcoding)
- [ ] Implement `gemini_client.py` (REST API integration)
- [ ] Implement `GET /api/recommend` with rule-based fallback
- [ ] Add unit tests for recommendations

## PHASE 4 — Docker + Cloud Run Deploy
- [ ] Create multi-stage `Dockerfile`
- [ ] Test build locally: `docker build`
- [ ] Configure GCP Secret Manager
- [ ] Deploy to Cloud Run

## PHASE 5 — React Frontend
- [ ] Scaffold Vite + React + Tailwind
- [ ] Create `VenueContext.jsx` for global config propagation
- [ ] Implement `useEntryPoints` hook
- [ ] Build `AttendeeEntry` page (dynamic labels)
- [ ] Build `Recommendation` page (dynamic labels)
- [ ] Build `StaffDashboard` (live updates)

## PHASE 6 — Google Maps Integration
- [ ] Integrate `@googlemaps/js-api-loader`
- [ ] Implement `HeatmapLayer` in `StaffDashboard`
- [ ] Implement walking directions in `Recommendation` page
- [ ] Add entry point markers with dynamic labels

## PHASE 7 — Polish, Tests, README
- [ ] Final UI/UX polish (contrast, accessibility)
- [ ] End-to-end testing of "Venue-agnostic" switching
- [ ] Complete `README.md` with demo scenario
- [ ] Final deployment to Cloud Run
