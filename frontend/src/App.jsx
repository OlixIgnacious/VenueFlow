import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { VenueProvider } from './context/VenueContext';
import ErrorBoundary from './components/ErrorBoundary';
import EventDiscovery from './pages/EventDiscovery';
import AttendeeEntry from './pages/AttendeeEntry';
import Recommendation from './pages/Recommendation';
import StaffDashboard from './pages/StaffDashboard';

function App() {
  return (
    <ErrorBoundary>
      <VenueProvider>
        <Router>
          <div className="min-h-screen text-slate-100 bg-slate-950">
            <Routes>
              <Route path="/" element={<EventDiscovery />} />
              <Route path="/entry" element={<AttendeeEntry />} />
              <Route path="/recommendation" element={<Recommendation />} />
              <Route path="/staff" element={<StaffDashboard />} />
            </Routes>
          </div>
        </Router>
      </VenueProvider>
    </ErrorBoundary>
  );
}

export default App;
