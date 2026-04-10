# VenueFlow Frontend 🏟️

A high-performance, real-time React application designed for seamless venue entry and crowd monitoring.

## 🚀 Key Features

- **Real-time Synchronization**: Sub-second updates from Firebase Realtime Database.
- **AI Recommendation Display**: Interactive UI for viewing personalized gate advice and walking routes.
- **Dynamic Mapping**: Custom Google Maps integration showing gate density and user location.
- **Staff Intelligence**: A multi-view dashboard for venue operators with live heatmaps.

## 🏗️ Architecture

The frontend is built on a "Context-First" architecture to ensure venue-agnostic compatibility:

### 🌐 State Management (`VenueContext.jsx`)
The `VenueProvider` acts as the global brain of the app. It:
- Fetches the current event and venue metadata on load.
- Exposes dynamic labels (e.g., `venue.entry_label`) to all child components.
- Handles centralized error state and loading transitions.

### 🪝 Real-time Hooks (`useEntryPoints.js`)
A specialized hook that creates a direct subscription to the Firebase Realtime Database paths for the active event. It provides the rest of the app with an automatically updating `entryPoints` object.

### 🎨 Design System
- **Tailwind CSS**: Used for all styling to ensure a premium, modern aesthetic with native dark mode support.
- **Lucide React**: For consistent, high-quality iconography.
- **Framer Motion**: (If used in components) for smooth micro-animations.

## 🛠️ Key Components

- **`VenueMap`**: High-fidelity Google Maps implementation with custom markers and density heatmaps.
- **`TicketScanner`**: Simulated ticket validation flow (Seeding context: Stadium vs. Exhibition Hall).
- **`EntryPointCard`**: A reusable, visual indicator for gate status, wait times, and AI tips.

## ⚙️ Development

### Setup
```bash
cd frontend
npm install
```

### Configuration
Create a `.env` file in the `frontend/` directory:
```env
VITE_API_BASE_URL=https://your-backend-url.run.app
VITE_FIREBASE_API_KEY=your_key
VITE_FIREBASE_PROJECT_ID=your_id
VITE_FIREBASE_DATABASE_URL=your_url
VITE_GOOGLE_MAPS_API_KEY=your_maps_key
```

### Running Locally
```bash
npm run dev
```

---
**Part of the VenueFlow Project**
