import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

/**
 * PublicRoute prevents authenticated users from accessing public pages 
 * like Login, Register, or the Landing page.
 * 
 * If the user is authenticated, it redirects them to their respective dashboard 
 * based on their associated role.
 */
export default function PublicRoute({ children }) {
  const { currentUser, userProfile, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="flex bg-slate-950 min-h-screen items-center justify-center">
        <div className="flex flex-col items-center space-y-4">
          <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-slate-400 font-medium animate-pulse">Syncing session...</p>
        </div>
      </div>
    );
  }

  // If we have a user and their profile is loaded, redirect them away from the public page
  if (currentUser && userProfile) {
    const role = userProfile.role;
    const state = location.state;
    
    if (role === 'admin') {
      return <Navigate to="/admin/dashboard" state={state} replace />;
    } else if (role === 'staff') {
      return <Navigate to="/staff/dashboard" state={state} replace />;
    } else {
      // Default to attendee dashboard
      return <Navigate to="/dashboard" state={state} replace />;
    }
  }

  // User is not logged in, allow access to 'public' content
  return children;
}
