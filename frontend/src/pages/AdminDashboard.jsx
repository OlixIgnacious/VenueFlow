import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Shield, LogOut, UserPlus } from 'lucide-react';

export default function AdminDashboard() {
  const { userProfile, logout } = useAuth();
  const [events, setEvents] = useState([]);
  const [staffEmail, setStaffEmail] = useState('');
  const [selectedEventId, setSelectedEventId] = useState('');
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
        if (data.length > 0) setSelectedEventId(data[0].id);
      }
    } catch (e) {
      console.error(e);
    }
  }

  function handleAssignStaff(e) {
    e.preventDefault();
    if (!staffEmail || !selectedEventId) return;
    
    // MOCK DATA for Hackathon
    alert(`Mock Success: Staff user '${staffEmail}' has been assigned to event '${selectedEventId}'.`);
    setStaffEmail('');
  }

  return (
    <div className="max-w-5xl mx-auto p-6 pt-12">
      <div className="flex justify-between items-center mb-10 border-b border-slate-800 pb-6">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-rose-400 to-orange-400 bg-clip-text text-transparent flex items-center">
            <Shield className="text-rose-400 mr-3" /> Admin Control
          </h1>
          <p className="text-slate-400 mt-2">Welcome Admin, {userProfile?.name}</p>
        </div>
        <button 
          onClick={logout} 
          className="flex items-center space-x-2 text-slate-400 hover:text-rose-400 transition-colors"
        >
          <LogOut size={18} /> <span>Sign Out</span>
        </button>
      </div>

      <div className="grid md:grid-cols-3 gap-8">
        
        {/* Left Col: Staff Assignment */}
        <div className="md:col-span-1 bg-slate-900 p-6 rounded-xl border border-slate-800 h-fit">
          <h2 className="text-lg font-semibold text-slate-200 mb-4 border-b border-slate-800 pb-2 flex items-center">
            <UserPlus className="mr-2 text-indigo-400" size={18}/> Assign Staff
          </h2>
          <form onSubmit={handleAssignStaff} className="space-y-4 text-sm">
            <div>
              <label className="block text-slate-400 mb-1">Staff Email</label>
              <input 
                type="email" 
                placeholder="staff@venueflow.com"
                value={staffEmail}
                onChange={e => setStaffEmail(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-slate-200 focus:outline-none focus:border-indigo-500"
              />
            </div>
            <div>
              <label className="block text-slate-400 mb-1">Target Event</label>
              <select 
                value={selectedEventId} 
                onChange={e => setSelectedEventId(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-slate-200 focus:outline-none focus:border-indigo-500"
              >
                {events.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
              </select>
            </div>
            <button 
              type="submit" 
              className="w-full bg-indigo-600 hover:bg-indigo-500 text-white py-2 rounded font-medium transition-colors"
            >
              Assign Role
            </button>
          </form>
        </div>

        {/* Right Col: Events */}
        <div className="md:col-span-2">
          <h2 className="text-xl font-semibold text-slate-200 mb-4">Global Events Overview</h2>
          <div className="grid sm:grid-cols-2 gap-4">
            {events.map((evt) => (
              <div 
                key={evt.id}
                onClick={() => navigate(`/staff/event/${evt.id}`)}
                className="bg-slate-900 border border-slate-800 hover:border-emerald-500/50 p-5 rounded-xl cursor-pointer transition-all hover:shadow-lg hover:shadow-emerald-900/20 group"
              >
                <div className="flex items-start justify-between mb-2">
                  <h3 className="font-bold text-slate-200 group-hover:text-emerald-400 transition-colors">{evt.name}</h3>
                  <span className={`px-2 py-0.5 text-xs rounded-full font-medium ${evt.status === 'live' ? 'bg-rose-500/20 text-rose-400' : 'bg-blue-500/20 text-blue-400'}`}>
                    {evt.status.toUpperCase()}
                  </span>
                </div>
                <p className="text-slate-400 text-xs mb-3">{new Date(evt.start_time).toLocaleString()}</p>
                <div className="text-xs font-medium text-emerald-500 flex items-center">
                  Monitor Dash &rarr;
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
