import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate, useLocation } from 'react-router-dom';
import { Ticket, LogOut, Plus, AlertCircle, X, Shield } from 'lucide-react';
import { auth } from '../services/firebase';

export default function AttendeeDashboard() {
  const { userProfile, logout } = useAuth();
  const [events, setEvents] = useState([]);
  const [ticketId, setTicketId] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const [toast, setToast] = useState(null);

  useEffect(() => {
    if (location.state?.error || location.state?.message) {
      setToast(location.state.error || location.state.message);
      window.history.replaceState({}, document.title);
      const timer = setTimeout(() => setToast(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [location]);

  useEffect(() => {
    if (userProfile) fetchEvents();
  }, [userProfile]);

  async function fetchEvents() {
    try {
      const currentUser = auth.currentUser;
      if (!currentUser) return;
      
      const token = await currentUser.getIdToken();
      const res = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/users/me/events`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        setEvents(await res.json());
      }
    } catch (e) {
      console.error('[AttendeeDashboard] Event fetch failed:', e);
    }
  }

  async function handleClaimTicket(e) {
    e.preventDefault();
    if (!ticketId) return;
    setError('');
    setLoading(true);

    try {
      const currentUser = auth.currentUser;
      if (!currentUser) return;

      const token = await currentUser.getIdToken();
      const res = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/users/me/tickets`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ ticket_id: ticketId })
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.detail || "Failed to claim ticket.");
      } else {
        setTicketId('');
        fetchEvents();
      }
    } catch (e) {
      setError("Network error adding ticket.");
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
        <header className="flex justify-between items-center mb-10 border-b border-slate-800 pb-6">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent uppercase tracking-tight italic leading-none">
              Tactical Ticketing
            </h1>
            <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest mt-3 opacity-60">Verified Operator: {userProfile?.name || 'Authorized Attendee'}</p>
          </div>
          <button 
            onClick={logout} 
            className="flex items-center space-x-2 text-slate-400 hover:text-rose-500 transition-all font-black text-[10px] uppercase tracking-[0.2em] group"
          >
            <LogOut size={16} className="group-hover:translate-x-1 transition-transform" /> <span>Disconnect</span>
          </button>
        </header>

        {error && (
          <div className="mb-8 bg-rose-500/10 border border-rose-500/20 text-rose-500 p-6 rounded-3xl flex items-start space-x-4 shadow-xl shadow-rose-900/5 animate-in fade-in zoom-in-95">
            <AlertCircle className="shrink-0 mt-0.5" size={20} />
            <span className="text-xs font-black uppercase tracking-widest leading-relaxed">{error}</span>
          </div>
        )}

        {/* Claim Ticket Section */}
        <div className="bg-slate-900 border border-slate-800 p-10 rounded-[3rem] shadow-2xl mb-16 relative overflow-hidden group">
          <div className="relative z-10">
            <h2 className="text-xs font-black text-slate-600 uppercase tracking-[0.3em] mb-8 flex items-center italic">
              <Plus size={16} className="mr-4 text-emerald-500" /> Perimeter Enrollment
            </h2>
            <form onSubmit={handleClaimTicket} className="flex space-x-6">
              <input 
                id="ticket-id-input"
                type="text" 
                placeholder="Enter Terminal Ticket ID (e.g. IND-AUS-101)" 
                aria-label="Ticket ID for perimeter enrollment"
                value={ticketId}
                onChange={e => setTicketId(e.target.value)}
                className="flex-1 bg-slate-950 border border-slate-800 rounded-2xl px-6 py-5 text-xs font-bold focus:ring-2 focus:ring-emerald-600 outline-none transition-all placeholder:text-slate-800 shadow-inner"
              />
              <button 
                id="enroll-ticket-button"
                type="submit" 
                disabled={loading || !ticketId}
                className="bg-emerald-600 hover:bg-emerald-500 text-white px-10 py-5 rounded-2xl font-black text-[10px] uppercase tracking-[0.3em] disabled:opacity-30 transition-all active:scale-95 shadow-xl shadow-emerald-900/20"
              >
                {loading ? 'SYNCING...' : 'ENROLL'}
              </button>
            </form>
          </div>
        </div>

        {/* Events Grid */}
        <div className="grid md:grid-cols-2 gap-10">
          {events.length === 0 ? (
            <div className="col-span-full text-center py-32 bg-slate-900/30 border border-slate-900 border-dashed rounded-[4rem]">
              <Ticket className="mx-auto mb-8 opacity-5" size={80} />
              <p className="text-slate-700 font-black uppercase tracking-[0.4em] italic text-xs">No active tactical tickets in current freq.</p>
            </div>
          ) : (
            events.map(event => (
              <div 
                key={event.id}
                onClick={() => navigate(`/recommendation?ref=${event.associated_ticket_id}&event_id=${event.id}`)}
                className="group bg-slate-900/50 border border-slate-800 hover:border-emerald-500/50 p-10 rounded-[3rem] cursor-pointer transition-all hover:shadow-2xl hover:shadow-emerald-600/10 active:scale-95"
              >
                <div className="flex items-start justify-between mb-8">
                  <div className="w-12 h-12 bg-emerald-500/10 rounded-2xl border border-emerald-500/20 flex items-center justify-center">
                    <Ticket className="text-emerald-400" size={24} />
                  </div>
                  <span className={`px-3 py-1 text-[9px] font-black uppercase tracking-widest rounded-lg border ${event.status === 'live' ? 'bg-rose-500/10 text-rose-500 border-rose-500/20 animate-pulse' : 'bg-blue-500/10 text-blue-500 border-blue-500/20'}`}>
                    {event.status}
                  </span>
                </div>
                <h3 className="text-3xl font-black text-white mb-3 group-hover:text-emerald-400 transition-colors tracking-tight uppercase italic leading-none">{event.name}</h3>
                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mb-10 opacity-50">{new Date(event.start_time).toLocaleDateString()} • {event.venue_name}</p>
                <div className="text-[10px] font-black text-emerald-500 uppercase flex items-center opacity-40 group-hover:opacity-100 transition-all tracking-[0.2em]">
                  CALCULATE AI ROUTE <span className="ml-3 group-hover:translate-x-2 transition-transform">→</span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
