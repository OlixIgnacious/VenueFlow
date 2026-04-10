# VenueFlow 🏟️ — Smart Entry & Crowd Intelligence

[![CI/CD Pipeline](https://github.com/OlixIgnacious/VenueFlow/actions/workflows/deploy.yml/badge.svg)](https://github.com/OlixIgnacious/VenueFlow/actions)
[![FastAPI](https://img.shields.io/badge/FastAPI-005863?style=flat&logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com/)
[![React](https://img.shields.io/badge/React-20232A?style=flat&logo=react&logoColor=61DAFB)](https://reactjs.org/)
[![Gemini 2.0](https://img.shields.io/badge/Gemini_2.0_Flash-4285F4?style=flat&logo=google&logoColor=white)](https://deepmind.google/technologies/gemini/)

VenueFlow is a **venue-agnostic, event-type-aware** crowd routing platform. It solves entry-point congestion at large-scale events by providing attendees with personalized AI-powered recommendations and staff with real-time crowd intelligence dashboards.

---

## 🏗️ System Architecture

```mermaid
graph TD
    subgraph Frontend
        A[Attendee UI] --> B[VenueContext]
        C[Staff UI] --> B
        B --> D[useEntryPoints Hook]
    end

    subgraph Backend
        E[FastAPI Routers] --> F[Gemini Service]
        E --> G[Simulator Service]
        E --> H[Firebase Client]
    end

    subgraph Data Layer
        D <--> I[(Firebase RTDB)]
        H <--> I
    end

    F --> J[Vertex AI / Gemini 2.0]
```

---

## 🌟 Key Features

### 🧠 Gemini-Powered Recommendations
Intelligent routing logic that understands venue context, event type, and current gate density.
> [!TIP]
> The system reconciles denormalized venue config with real-time sensor data to provide "human" tips like *"Gate B is your best bet; it's right by the food court and currently has zero wait."*

### 🗺️ Live Crowd Heatmap
Visual dashboard for venue staff to spot bottlenecks before they form, using Google Maps JS API.

### 🎭 Total Vocabulary Versatility
Labels like "Gate", "Door", or "Pavilion" are injected via configuration — zero hardcoding. Switching from a Football Stadium to a Tech Conference takes one API call.

---

## 📸 Visual Showcase

````carousel
![Staff Dashboard View](file:///Users/olixstudios/.gemini/antigravity/brain/64131bd9-e40c-44c1-8006-cb99c004bd74/staff_dashboard_final_1775770142198.png)
<!-- slide -->
![AI Recommendation Flow](file:///Users/olixstudios/.gemini/antigravity/brain/64131bd9-e40c-44c1-8006-cb99c004bd74/recommendation_page_1775770142198.png)
<!-- slide -->
![Real-time Heatmap](file:///Users/olixstudios/.gemini/antigravity/brain/64131bd9-e40c-44c1-8006-cb99c004bd74/staff_dashboard_initial_1775764748325.png)
````

---

## 🛠️ Tech Stack & Security

- **Backend**: FastAPI (Python 3.11) with Google-style Docstrings.
- **Frontend**: React 18 (Vite, Tailwind CSS) with JSDoc standards.
- **AI**: Gemini 2.0 Flash via Vertex AI.
- **Cloud**: Automated keyless deployment to **Google Cloud Run** using GitHub OIDC / Workload Identity Federation.
- **Real-time**: Firebase Realtime Database for sub-second gate density updates.

---

## 📁 Sub-System Documentation

| Component | Description | README |
| :--- | :--- | :--- |
| **Backend** | Python API, Simulator, AI Orchestration | [Explore Backend](backend/README.md) |
| **Frontend** | React SPA, Google Maps Integration | [Explore Frontend](frontend/README.md) |
| **Infrastructure** | Docker & Deployment Guides | [Explore Docs](docs/README.md) |

---

## 📝 Project Assumptions & Design Decisions
- **Crowd density is simulated.** Real deployments would use IoT sensors (infrared counters, camera CV models) at each entry point.
- **Secure by Default.** No long-lived service account keys; the entire CI/CD pipeline uses short-lived tokens via Workload Identity.
- **Dynamic Context.** The Gemini prompt builder uses a pure functional approach to scale venue-specific labels without hardcoding.

---
**Hackathon Submission** — *Built for Google Antigravity Challenge*