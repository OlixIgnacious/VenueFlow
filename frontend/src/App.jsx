import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { VenueProvider } from './context/VenueContext';
import ErrorBoundary from './components/ErrorBoundary';
import EventDiscovery from './pages/EventDiscovery';
import AttendeeEntry from './pages/AttendeeEntry';
import Recommendation from './pages/Recommendation';
import StaffDashboard from './pages/StaffDashboard';

/**
 * Main application component for VenueFlow.
 * 
 * Orchestrates the global providers (Error Boundaries, Venue Context) 
 * and defines the primary client-side routing routes for attendees and staff.
 * 
 * Routes:
 * - / : Event Discovery (Landing)
 * - /entry : Ticket Validation & Entry
 * - /recommendation : AI Entry Recommendations
 * - /staff : Live Crowd Monitoring Dashboard
 * 
 * @returns {JSX.Element} The root application component.
 */
function App() {
  return (
    <ErrorBoundary>
      <Router>
        <VenueProvider>
          <div className="min-h-screen text-slate-100 bg-slate-950">
            <Routes>
              <Route path="/" element={<EventDiscovery />} />
              <Route path="/entry" element={<AttendeeEntry />} />
              <Route path="/recommendation" element={<Recommendation />} />
              <Route path="/staff" element={<StaffDashboard />} />
            </Routes>
          </div>
        </VenueProvider>
      </Router>
    </ErrorBoundary>
  );
}

export default App;
