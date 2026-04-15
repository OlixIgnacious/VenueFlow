import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Ticket, LogOut, Plus, AlertCircle } from 'lucide-react';

export default function AttendeeDashboard() {
  const { userProfile, logout } = useAuth();
  const [events, setEvents] = useState([]);
  const [ticketId, setTicketId] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    fetchEvents();
  }, []);

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
  }

  async function handleClaimTicket(e) {
    e.preventDefault();
    if (!ticketId) return;
    setError('');
    setLoading(true);

    try {
      const { currentUser } = (await import('../services/firebase')).auth;
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
        fetchEvents(); // Refresh
      }
    } catch (e) {
      setError("Network error adding ticket.");
    }
    setLoading(false);
  }

  return (
    <div className="max-w-4xl mx-auto p-6 pt-12">
      <div className="flex justify-between items-center mb-10 border-b border-slate-800 pb-6">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent">
            My Events
          </h1>
          <p className="text-slate-400 mt-2">Welcome back, {userProfile?.name}</p>
        </div>
        <button 
          onClick={logout} 
          className="flex items-center space-x-2 text-slate-400 hover:text-rose-400 transition-colors"
        >
          <LogOut size={18} /> <span>Sign Out</span>
        </button>
      </div>

      {error && (
        <div className="mb-6 bg-red-500/10 border border-red-500/50 text-red-400 p-4 rounded-lg flex items-start space-x-3">
          <AlertCircle className="shrink-0 mt-0.5" size={18} />
          <span>{error}</span>
        </div>
      )}

      {/* Claim Ticket Section */}
      <div className="bg-slate-900 border border-slate-800 p-6 rounded-xl shadow-lg mb-8">
        <h2 className="text-lg font-semibold text-slate-200 mb-4 flex items-center">
          <Plus size={20} className="mr-2 text-emerald-400" /> Add a Ticket
        </h2>
        <form onSubmit={handleClaimTicket} className="flex space-x-4">
          <input 
            type="text" 
            placeholder="Enter your Ticket ID (e.g. IND-AUS-101)" 
            value={ticketId}
            onChange={e => setTicketId(e.target.value)}
            className="flex-1 bg-slate-950 border border-slate-800 rounded px-4 py-2 text-slate-200 focus:outline-none focus:border-emerald-500"
          />
          <button 
            type="submit" 
            disabled={loading || !ticketId}
            className="bg-emerald-600 hover:bg-emerald-500 text-white px-6 py-2 rounded font-medium disabled:opacity-50 transition-colors"
          >
            {loading ? 'Verifying...' : 'Claim'}
          </button>
        </form>
      </div>

      {/* Events Grid */}
      <div className="grid md:grid-cols-2 gap-6">
        {events.length === 0 ? (
          <div className="col-span-full text-center py-12 text-slate-500 border border-slate-800 rounded-xl border-dashed">
            You don't have any tickets yet. Enter a ticket ID above.
          </div>
        ) : (
          events.map(event => (
            <div 
              key={event.id}
              onClick={() => navigate(`/recommendation?eventId=${event.id}`)}
              className="bg-slate-900 border border-slate-800 hover:border-emerald-500/50 p-6 rounded-xl cursor-pointer transition-all hover:shadow-lg hover:shadow-emerald-900/20 group"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="bg-emerald-500/20 p-3 rounded-lg">
                  <Ticket className="text-emerald-400" size={24} />
                </div>
                <span className={`px-2 py-1 text-xs rounded-full font-medium ${event.status === 'live' ? 'bg-rose-500/20 text-rose-400' : 'bg-blue-500/20 text-blue-400'}`}>
                  {event.status.toUpperCase()}
                </span>
              </div>
              <h3 className="text-xl font-bold text-slate-200 mb-2 group-hover:text-emerald-400 transition-colors">{event.name}</h3>
              <p className="text-slate-400 text-sm mb-4">{new Date(event.start_time).toLocaleString()}</p>
              <div className="text-sm font-medium text-emerald-500 flex items-center">
                Get Enter Recommendation &rarr;
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
