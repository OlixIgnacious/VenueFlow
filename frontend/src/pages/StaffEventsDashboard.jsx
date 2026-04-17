import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate, useLocation } from 'react-router-dom';
import { Calendar, LogOut, AlertCircle, X, Shield } from 'lucide-react';

export default function StaffEventsDashboard() {
  const { userProfile, logout } = useAuth();
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const location = useLocation();
  const [toast, setToast] = useState(null);

  useEffect(() => {
    if (location.state?.error || location.state?.message) {
      setToast(location.state.error || location.state.message);
      // clear state to prevent toast on refresh
      window.history.replaceState({}, document.title);
      const timer = setTimeout(() => setToast(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [location]);

  useEffect(() => {
    fetchEvents();
  }, []);

  useEffect(() => {
    if (!loading && events.length === 1 && !location.state?.navigatedBack) {
      console.log(`[StaffEventsDashboard] Zero-Tap Entry: Launching ${events[0].name}`);
      navigate(`/staff/event/${events[0].id}`, { replace: true });
    }
  }, [loading, events, navigate, location.state]);

  async function fetchEvents() {
    try {
      const { currentUser } = (await import('../services/firebase')).auth;
      const token = await currentUser.getIdToken();
      const res = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/users/me/events`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setEvents(data);
      }
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      {/* Toast Notification */}
      {toast && (
        <div className="fixed top-24 left-1/2 -translate-x-1/2 z-[100] animate-in fade-in slide-in-from-top-4 duration-300">
          <div className="bg-slate-900/90 backdrop-blur-xl border border-blue-500/20 px-6 py-4 rounded-3xl shadow-2xl flex items-center space-x-4">
            <div className="w-10 h-10 rounded-full bg-blue-600/20 flex items-center justify-center text-blue-400">
              <Shield size={20} />
            </div>
            <p className="text-sm font-bold text-slate-100 pr-4">{toast}</p>
            <button aria-label="Close Notification" onClick={() => setToast(null)} className="text-slate-500 hover:text-white transition-colors focus:outline-none">
              <X size={18} aria-hidden="true" />
            </button>
          </div>
        </div>
      )}

      <div className="max-w-4xl mx-auto p-6 pt-12">
      <div className="flex justify-between items-center mb-10 border-b border-slate-800 pb-6">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent">
            Staff Portal
          </h1>
          <p className="text-slate-400 mt-2">Welcome Guard, {userProfile?.name}</p>
        </div>
        <button 
          onClick={logout} 
          className="flex items-center space-x-2 text-slate-400 hover:text-rose-400 transition-colors"
        >
          <LogOut size={18} /> <span>Sign Out</span>
        </button>
      </div>

      <div className="mb-6">
        <h2 className="text-xl font-semibold text-slate-200">Your Assigned Events</h2>
        <p className="text-slate-400 text-sm">Select an event below to open its Live Control Center.</p>
      </div>

      {loading ? (
        <div className="text-slate-400 py-12 text-center animate-pulse">Loading assignments...</div>
      ) : events.length === 0 ? (
        <div className="text-center py-12 text-slate-500 border border-slate-800 rounded-xl border-dashed">
          You are not currently assigned to any active events. Contact an Admin.
        </div>
      ) : (
        <div className="grid md:grid-cols-2 gap-6">
          {events.map((evt) => (
            <div 
              key={evt.id}
              onClick={() => navigate(`/staff/event/${evt.id}`)}
              className="bg-slate-900 border border-slate-800 hover:border-emerald-500/50 p-6 rounded-xl cursor-pointer transition-all hover:shadow-lg hover:shadow-emerald-900/20 group"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="bg-emerald-500/20 p-3 rounded-lg">
                  <Calendar className="text-emerald-400" size={24} />
                </div>
                <span className={`px-2 py-1 text-xs rounded-full font-medium ${evt.status === 'live' ? 'bg-rose-500/20 text-rose-400' : 'bg-blue-500/20 text-blue-400'}`}>
                  {evt.status.toUpperCase()}
                </span>
              </div>
              <h3 className="text-xl font-bold text-slate-200 mb-2 group-hover:text-emerald-400 transition-colors">{evt.name}</h3>
              <p className="text-slate-400 text-sm mb-4">{new Date(evt.start_time).toLocaleString()}</p>
              <div className="text-sm font-medium text-emerald-500 flex items-center">
                Launch Dashboard &rarr;
              </div>
            </div>
          ))}
        </div>
      )}
      </div>
    </div>
  );
}
