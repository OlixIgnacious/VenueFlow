import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { 
  Shield, 
  LogOut, 
  UserPlus, 
  LayoutDashboard, 
  Users, 
  Settings, 
  Bell, 
  ChevronRight,
  RefreshCw,
  Activity,
  MapPin,
  AlertCircle,
  Brain
} from 'lucide-react';
import { auth, rtdb } from '../services/firebase';
import { ref as dbRef, onValue } from 'firebase/database';
import IntelligenceHubView from '../components/IntelligenceHubView';

export default function AdminDashboard() {
  const { userProfile, logout } = useAuth();
  const [events, setEvents] = useState([]);
  const [staffEmail, setStaffEmail] = useState('');
  const [selectedEventId, setSelectedEventId] = useState('');
  const [activeTab, setActiveTab] = useState('overview'); // overview, intelligence, personnel, incidents
  const [isLoading, setIsLoading] = useState(true);
  const [allIncidents, setAllIncidents] = useState([]);
  const navigate = useNavigate();

  async function fetchEvents() {
    try {
      setIsLoading(true);
      const currentUser = auth.currentUser;
      if (!currentUser) return;
      const token = await currentUser.getIdToken();
      const res = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/users/me/events`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setEvents(data);
        if (data.length > 0 && !selectedEventId) setSelectedEventId(data[0].id);
      }
    } catch (e) {
      console.error('[AdminDashboard] Event fetch error:', e);
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    if (userProfile) fetchEvents();
  }, [userProfile]);

  useEffect(() => {
    if (!selectedEventId) return;
    const incidentsRef = dbRef(rtdb, `incidents/${selectedEventId}`);
    const unsubscribe = onValue(incidentsRef, (snap) => {
      const data = snap.val();
      setAllIncidents(data ? Object.entries(data).map(([id, val]) => ({ id, ...val })) : []);
    });
    return () => unsubscribe();
  }, [selectedEventId]);

  if (isLoading) {
    return (
      <div className="flex bg-slate-950 min-h-screen items-center justify-center">
        <RefreshCw className="text-blue-500 animate-spin" size={32} />
      </div>
    );
  }

  return (
    <div className="flex bg-slate-950 min-h-screen text-slate-100 font-sans selection:bg-blue-600/30">
      
      {/* Sidebar navigation */}
      <aside className="w-72 border-r border-slate-900 bg-slate-950 p-6 flex flex-col fixed h-full z-20">
        <div className="flex items-center space-x-3 mb-10 px-2 cursor-pointer" onClick={() => setActiveTab('overview')}>
          <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-indigo-700 rounded-xl flex items-center justify-center shadow-lg shadow-blue-900/40">
            <Shield className="text-white" size={20} />
          </div>
          <h1 className="text-xl font-black tracking-tight uppercase italic">Admin<span className="text-blue-500">Node</span></h1>
        </div>

        <nav className="space-y-2 flex-1">
          <button onClick={() => setActiveTab('overview')} className={`w-full flex items-center space-x-4 px-5 py-3.5 rounded-2xl transition-all font-bold text-xs uppercase tracking-widest ${activeTab === 'overview' ? 'bg-slate-900 text-white shadow-xl' : 'text-slate-500 hover:bg-slate-900/50 hover:text-slate-300'}`}><LayoutDashboard size={18} /> <span>Global Grid</span></button>
          
          {selectedEventId && (
            <>
              <button onClick={() => setActiveTab('intelligence')} className={`w-full flex items-center space-x-4 px-5 py-3.5 rounded-2xl transition-all font-black text-xs uppercase tracking-widest ${activeTab === 'intelligence' ? 'bg-blue-600 text-white shadow-xl shadow-blue-900/20' : 'text-slate-500 hover:bg-slate-900/50 hover:text-blue-400'}`}><Activity size={18} /> <span>Intelligence Hub</span></button>
              <button onClick={() => setActiveTab('personnel')} className={`w-full flex items-center space-x-4 px-5 py-3.5 rounded-2xl transition-all font-black text-xs uppercase tracking-widest ${activeTab === 'personnel' ? 'bg-indigo-600 text-white shadow-xl shadow-indigo-900/20' : 'text-slate-500 hover:bg-slate-900/50 hover:text-indigo-400'}`}><Users size={18} /> <span>Personnel Matrix</span></button>
              <button onClick={() => setActiveTab('incidents')} className={`w-full flex items-center space-x-4 px-5 py-3.5 rounded-2xl transition-all font-black text-xs uppercase tracking-widest ${activeTab === 'incidents' ? 'bg-rose-600 text-white shadow-xl shadow-rose-900/20' : 'text-slate-500 hover:bg-slate-900/50 hover:text-rose-400'}`}><AlertCircle size={18} /> <span>Incident Command</span></button>
            </>
          )}
        </nav>

        <div className="mt-auto pt-8 border-t border-slate-900 space-y-5">
          <div className="px-5 py-6 bg-slate-900/50 rounded-3xl border border-slate-900 shadow-inner">
            <p className="text-[10px] text-slate-600 uppercase tracking-widest font-black mb-2 opacity-60 italic">System Operator</p>
            <p className="text-xs font-black text-slate-200 uppercase tracking-tight">{userProfile?.name || 'Authorized Admin'}</p>
          </div>
          <button onClick={logout} className="w-full flex items-center space-x-4 px-5 py-3.5 text-slate-600 hover:text-rose-500 transition-all font-black text-[10px] uppercase tracking-widest group"><LogOut size={18} className="group-hover:translate-x-1 transition-transform" /> <span>Disconnect</span></button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 ml-72 p-12 min-h-screen">
        <header className="flex justify-between items-start mb-16">
          <div>
            <h2 className="text-5xl font-black text-white tracking-tighter uppercase italic leading-none">{activeTab.replace('_', ' ')}</h2>
            <p className="text-slate-500 font-bold uppercase tracking-widest text-[10px] mt-4 opacity-50">{selectedEventId ? `Connected Frequency: ${events.find(e => e.id === selectedEventId)?.name}` : 'Real-time monitoring of global event load levels.'}</p>
          </div>
          <div className="bg-slate-900 border border-slate-800 rounded-2xl px-5 py-3 flex items-center space-x-4 shadow-xl shadow-black/20"><div className="w-2 h-2 rounded-full bg-emerald-500 shadow-lg shadow-emerald-500 animate-pulse" /><span className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Global Cloud Synced</span></div>
        </header>

        <section className="animate-in fade-in slide-in-from-bottom-8 duration-700">
          {activeTab === 'overview' && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
              <div className="lg:col-span-2 space-y-8">
                <h3 className="text-xs font-black text-slate-700 uppercase tracking-[0.3em] mb-4 italic">Active Tactical Deployments</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  {events.map((evt) => (
                    <div key={evt.id} onClick={() => { setSelectedEventId(evt.id); setActiveTab('intelligence'); }} className="group bg-slate-900/50 border border-slate-900 hover:border-blue-500/50 p-8 rounded-[2.5rem] cursor-pointer transition-all hover:shadow-2xl hover:shadow-blue-600/10 active:scale-95">
                      <div className="flex items-center justify-between mb-6">
                        <div className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest ${evt.status === 'live' ? 'bg-rose-500/10 text-rose-500 border border-rose-500/20' : 'bg-blue-500/10 text-blue-500 border border-blue-500/20'}`}>{evt.status}</div>
                        <Activity size={18} className="text-slate-800 group-hover:text-blue-500 transition-colors" />
                      </div>
                      <h4 className="text-2xl font-black text-white mb-2 group-hover:text-blue-400 transition-colors tracking-tight uppercase italic">{evt.name}</h4>
                      <div className="flex items-center justify-between border-t border-slate-900/50 pt-6 mt-4">
                        <div className="flex items-center space-x-2 text-slate-500 font-bold"><MapPin size={14} /> <span className="text-[10px] uppercase tracking-widest">{evt.venue_id}</span></div>
                        <div className="text-[10px] font-black text-blue-500 uppercase flex items-center opacity-40 group-hover:opacity-100 transition-all tracking-widest">ACCESS INTEL <ChevronRight size={14} className="ml-1" /></div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <div className="space-y-10">
                <div className="bg-slate-900 p-10 rounded-[3rem] border border-slate-900 shadow-2xl relative overflow-hidden group">
                  <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity"><UserPlus size={120} className="text-white" /></div>
                  <h3 className="text-xl font-black mb-8 flex items-center italic uppercase tracking-tighter">Dispatch Entry</h3>
                  <form onSubmit={(e) => { e.preventDefault(); alert("Key broadcasted."); setStaffEmail(''); }} className="space-y-6">
                    <div><label className="text-[10px] font-black text-slate-600 uppercase tracking-widest ml-1 mb-3 block">Personnel Email</label><input type="email" value={staffEmail} onChange={e => setStaffEmail(e.target.value)} placeholder="personnel@venueflow.ai" className="w-full bg-slate-950 border border-slate-900 rounded-2xl px-5 py-4 text-xs font-bold focus:ring-2 focus:ring-blue-600 outline-none transition-all placeholder:text-slate-800 shadow-inner" /></div>
                    <button className="w-full bg-blue-600 hover:bg-blue-500 text-white py-4.5 rounded-2xl font-black text-[11px] uppercase tracking-[0.2em] shadow-2xl shadow-blue-900/40 transition-all active:scale-95">GRANT ACCESS</button>
                  </form>
                </div>
              </div>
            </div>
          )}

          {(() => {
            const activeEvent = events.find(e => e.id === selectedEventId);
            return (
              <>
                {activeTab === 'intelligence' && selectedEventId && (
                  <IntelligenceHubView eventId={selectedEventId} venue={activeEvent} initialTab="list" />
                )}

                {activeTab === 'personnel' && selectedEventId && (
                  <IntelligenceHubView eventId={selectedEventId} venue={activeEvent} initialTab="personnel" />
                )}

                {activeTab === 'incidents' && selectedEventId && (
                  <IntelligenceHubView eventId={selectedEventId} venue={activeEvent} initialTab="incidents" />
                )}
              </>
            );
          })()}
        </section>
      </main>
    </div>
  );
}
