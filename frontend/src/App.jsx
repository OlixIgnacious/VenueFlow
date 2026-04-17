import React, { Suspense, lazy } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { VenueProvider } from './context/VenueContext';
import ErrorBoundary from './components/ErrorBoundary';
import EventDiscovery from './pages/EventDiscovery';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import PublicRoute from './components/PublicRoute';
import AuthPortal from './pages/AuthPortal';

// Lazy loaded heavy dashboard and feature components
const AttendeeEntry = lazy(() => import('./pages/AttendeeEntry'));
const Recommendation = lazy(() => import('./pages/Recommendation'));
const StaffDashboard = lazy(() => import('./pages/StaffDashboard'));
const AttendeeDashboard = lazy(() => import('./pages/AttendeeDashboard'));
const StaffEventsDashboard = lazy(() => import('./pages/StaffEventsDashboard'));
const AdminDashboard = lazy(() => import('./pages/AdminDashboard'));

function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <Router>
          <VenueProvider>
            <div className="min-h-screen text-slate-100 bg-slate-950">
              <Suspense fallback={
                <div className="min-h-screen bg-slate-950 flex items-center justify-center">
                  <div className="w-10 h-10 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin" />
                </div>
              }>
                <Routes>
                  {/* Public Landing & Unified Auth */}
                  <Route path="/" element={<PublicRoute><EventDiscovery /></PublicRoute>} />
                  <Route path="/login" element={<PublicRoute><AuthPortal /></PublicRoute>} />
                  <Route path="/register" element={<PublicRoute><AuthPortal /></PublicRoute>} />

                  {/* Protected Attendee Routes */}
                  <Route path="/dashboard" element={
                    <ProtectedRoute allowedRoles={['attendee']}>
                      <AttendeeDashboard />
                    </ProtectedRoute>
                  } />
                  <Route path="/entry" element={
                    <ProtectedRoute allowedRoles={['attendee']}>
                      <AttendeeEntry />
                    </ProtectedRoute>
                  } />
                  <Route path="/recommendation" element={
                    <ProtectedRoute allowedRoles={['attendee']}>
                      <Recommendation />
                    </ProtectedRoute>
                  } />

                  {/* Protected Staff Routes */}
                  <Route path="/staff/dashboard" element={
                    <ProtectedRoute allowedRoles={['staff']}>
                      <StaffEventsDashboard />
                    </ProtectedRoute>
                  } />
                  <Route path="/staff/event/:eventId" element={
                    <ProtectedRoute allowedRoles={['staff', 'admin']}>
                      <StaffDashboard />
                    </ProtectedRoute>
                  } />

                  {/* Protected Admin Routes */}
                  <Route path="/admin/dashboard" element={
                    <ProtectedRoute allowedRoles={['admin']}>
                      <AdminDashboard />
                    </ProtectedRoute>
                  } />

                </Routes>
              </Suspense>
            </div>
          </VenueProvider>
        </Router>
      </AuthProvider>
    </ErrorBoundary>
  );
}

export default App;
