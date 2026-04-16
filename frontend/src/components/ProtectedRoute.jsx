import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function ProtectedRoute({ children, allowedRoles }) {
  const { currentUser, userProfile, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    // Wait for the initial auth state and profile to resolve
    return (
      <div className="flex bg-slate-950 min-h-screen items-center justify-center">
        <div className="flex flex-col items-center space-y-4">
          <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-slate-400 font-medium animate-pulse">Verifying credentials...</p>
        </div>
      </div>
    );
  }

  if (!currentUser) {
    return <Navigate to="/login" state={{ from: location, message: 'Please log in to access this page.' }} replace />;
  }

  if (!userProfile) {
    // If somehow we have a user but no profile and we're not loading, show error or fallback
    return <Navigate to="/login" state={{ error: 'Profile could not be loaded.' }} replace />;
  }

  if (allowedRoles && !allowedRoles.includes(userProfile.role)) {
    // Role not authorized, bounce them back to their respective dashboard
    const redirectPath = userProfile.role === 'admin' ? '/admin/dashboard' : 
                        (userProfile.role === 'staff' ? '/staff/dashboard' : '/dashboard');
    return <Navigate to={redirectPath} state={{ error: 'Access Denied: You do not have permission to view this dashboard.' }} replace />;
  }

  return children;
}
