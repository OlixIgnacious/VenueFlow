import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { useVenue } from '../context/VenueContext';
import { useEntryPoints } from '../hooks/useEntryPoints';
import { rtdb } from '../services/firebase';
import { onValue, ref as dbRef, set, push, update } from 'firebase/database';
import { 
  Activity, AlertTriangle, LayoutDashboard, 
  RefreshCw, ChevronDown, Bell, CheckCircle, ShieldAlert, 
  Shield, MapPin, History, LogOut, Check 
} from 'lucide-react';
import TacticalRedirectOverlay from '../components/TacticalRedirectOverlay';
import IncidentReportModal from '../components/IncidentReportModal';
import IntelligenceHubView from '../components/IntelligenceHubView';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '';

export default function StaffDashboard() {
  const { userProfile, logout, currentUser } = useAuth();
  const { venue, event, loading: venueLoading, refreshConfig } = useVenue();
  const { eventId } = useParams();
  const { entryPoints, loading: entriesLoading } = useEntryPoints(event?.id || eventId);
  const [activeTab, setActiveTab] = useState('list');
  const [allEvents, setAllEvents] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [presence, setPresence] = useState(null);
  const [isIncidentModalOpen, setIsIncidentModalOpen] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [isConnected, setIsConnected] = useState(true);
  const navigate = useNavigate();

  // 1. Fetch available events for the switcher
  useEffect(() => {
    const fetchAllEvents = async () => {
      try {
        const response = await axios.get(`${API_BASE_URL}/api/events/list`);
        setAllEvents(Object.values(response.data));
      } catch (err) {
        console.error('Failed to fetch events list:', err);
      }
    };
    fetchAllEvents();
  }, []);

  // 2. Monitor connectivity status
  useEffect(() => {
    const connectedRef = dbRef(rtdb, '.info/connected');
    return onValue(connectedRef, (snap) => setIsConnected(snap.val() === true));
  }, []);

  // 3. Listen for My Presence and Notifications
  useEffect(() => {
    const targetEventId = event?.id || eventId;
    if (!targetEventId || !currentUser) return;

    const myPresenceRef = dbRef(rtdb, `staff_presence/${targetEventId}/${currentUser.uid}`);
    const unsubPresence = onValue(myPresenceRef, (snap) => setPresence(snap.val()));

    const myNotifRef = dbRef(rtdb, `staff_notifications/${currentUser.uid}`);
    const unsubNotif = onValue(myNotifRef, (snap) => {
      const data = snap.val();
      if (data) {
        const sorted = Object.entries(data)
          .map(([id, val]) => ({ id, ...val }))
          .sort((a,b) => new Date(b.timestamp) - new Date(a.timestamp));
        setNotifications(sorted);
      } else {
        setNotifications([]);
      }
    });

    return () => {
      unsubPresence();
      unsubNotif();
    };
  }, [event?.id, eventId, currentUser]);

  const handleEventChange = (e) => {
    const newId = e.target.value;
    navigate(`/staff/event/${newId}`);
    refreshConfig(newId);
  };

  const handleCheckIn = async (gateId) => {
    if (!currentUser?.uid || !event?.id) return;
    const presenceRef = dbRef(rtdb, `staff_presence/${event.id}/${currentUser.uid}`);
    await set(presenceRef, {
      name: userProfile?.name || 'Staff',
      current_gate_id: gateId,
      status: 'active',
      last_reported: new Date().toISOString()
    });
  };

  const handleAcceptDispatch = async (dispatch) => {
    const notifRef = dbRef(rtdb, `staff_notifications/${currentUser.uid}/${dispatch.id}`);
    await update(notifRef, { status: 'accepted', acknowledged_at: new Date().toISOString() });
    const presenceRef = dbRef(rtdb, `staff_presence/${event.id}/${currentUser.uid}`);
    await update(presenceRef, { status: 'in_transit', target_gate_id: dispatch.target_gate_id, last_reported: new Date().toISOString() });
  };

  const handleConfirmArrival = async () => {
    if (!presence?.target_gate_id) return;
    await handleCheckIn(presence.target_gate_id);
  };

  const handleEmergency = async () => {
    if (!currentUser?.uid || !event?.id || !presence?.current_gate_id) return;
    const alertRef = push(dbRef(rtdb, `emergency_alerts/${event.id}`));
    await set(alertRef, {
      staff_uid: currentUser.uid,
      staff_name: userProfile?.name,
      gate_id: presence.current_gate_id,
      timestamp: new Date().toISOString(),
      status: 'active'
    });
    await update(dbRef(rtdb, `staff_presence/${event.id}/${currentUser.uid}`), { status: 'emergency' });
  };

  if (venueLoading || entriesLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center space-y-4">
        <RefreshCw className="text-blue-500 animate-spin" size={32} />
        <p className="text-slate-500 font-bold uppercase tracking-widest text-xs italic">Syncing Tactical Context...</p>
      </div>
    );
  }

  // DEPLOYMENT PORTAL: If not checked in, force selection
  if (!presence?.current_gate_id && activeTab !== 'notifications') {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6 relative overflow-hidden">
        <div className="absolute inset-0 z-0 opacity-50">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-blue-600/10 rounded-full blur-[120px] animate-pulse" />
        </div>

        <div className="relative z-10 flex-1 flex flex-col max-w-6xl mx-auto w-full p-8 md:p-12 text-slate-100">
          <header className="flex justify-between items-start mb-16 px-4">
            <div className="flex items-center space-x-4">
               <div className="w-12 h-12 bg-blue-600 rounded-2xl flex items-center justify-center font-black text-2xl shadow-xl shadow-blue-500/20">V</div>
               <div>
                  <h1 className="text-3xl font-black italic tracking-tighter uppercase leading-none">VenueFlow</h1>
                  <p className="text-[10px] font-bold text-blue-500 uppercase tracking-[0.3em] mt-1">Tactical Personnel Entry</p>
               </div>
            </div>
            <button onClick={logout} className="p-3 bg-slate-900 rounded-full border border-slate-800 hover:text-rose-500 transition-all shadow-lg"><LogOut size={20} /></button>
          </header>

          <main className="flex-1 space-y-12 px-4">
            <div className="max-w-2xl">
              <h2 className="text-5xl md:text-6xl font-black uppercase tracking-tighter mb-4 leading-[0.9]">Deployment <span className="text-blue-500">Required</span></h2>
              <p className="text-slate-400 text-lg font-medium leading-relaxed">Welcome, <span className="text-white font-bold">{userProfile?.name}</span>. Identify your assigned site terminal to initiate synchronization.</p>
            </div>

            <div className="grid md:grid-cols-3 gap-6">
              <div className="md:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-4">
                {Object.entries(entryPoints).map(([id, ep]) => (
                  <button
                    key={id}
                    onClick={() => { setIsScanning(id); setTimeout(() => { handleCheckIn(id); setIsScanning(false); }, 1200); }}
                    className="group relative bg-slate-900 border border-slate-800 p-8 rounded-[2rem] hover:border-blue-500/50 transition-all text-left overflow-hidden active:scale-95 shadow-xl"
                  >
                    {isScanning === id && (
                      <div className="absolute inset-0 bg-blue-600/20 backdrop-blur-sm z-20 flex flex-col items-center justify-center">
                        <RefreshCw className="animate-spin text-blue-400" size={24} />
                        <span className="text-[10px] font-black text-blue-400 uppercase tracking-widest mt-2">Syncing...</span>
                      </div>
                    )}
                    <div className="flex justify-between items-start mb-6">
                      <div className="w-10 h-10 bg-slate-950 rounded-xl flex items-center justify-center border border-slate-800 group-hover:border-blue-500/30 transition-colors"><CheckCircle className="text-slate-500 group-hover:text-blue-500" size={20} /></div>
                      <div className={`px-2 py-0.5 rounded text-[10px] font-black uppercase ${ep.status === 'low' ? 'text-emerald-400 bg-emerald-500/10' : ep.status === 'med' ? 'text-amber-400 bg-amber-500/10' : 'text-rose-400 bg-rose-500/10'}`}>{ep.status} Load</div>
                    </div>
                    <h4 className="text-xl font-bold text-white mb-1 uppercase tracking-tight italic">{ep.label}</h4>
                    <p className="text-xs text-slate-500 font-bold uppercase tracking-widest">Est. Wait: {ep.wait_minutes} min</p>
                  </button>
                ))}
              </div>
              <div className="bg-slate-900/50 border border-slate-800 rounded-[2.5rem] p-8 flex flex-col justify-between shadow-2xl relative overflow-hidden group">
                 <div className="absolute top-0 right-0 p-8 opacity-[0.03] group-hover:opacity-[0.07] transition-opacity pointer-events-none"><Shield size={180} className="text-white rotate-12" /></div>
                 <div>
                    <h3 className="text-xs font-black text-slate-500 uppercase tracking-widest mb-6 italic">Tactical Protocols</h3>
                    <ul className="space-y-4">
                       {["Verify perimeter integrity.", "Report surges via Incident Hub.", "Maintain comms pulse."].map((t, i) => (
                         <li key={i} className="flex items-center space-x-3 text-xs text-slate-500"><div className="w-1.5 h-1.5 rounded-full bg-blue-600 shadow-sm shadow-blue-500/50" /><span>{t}</span></li>
                       ))}
                    </ul>
                 </div>
                 <div className="pt-8 border-t border-slate-800 flex items-center justify-between">
                    <div>
                      <p className="text-[10px] font-bold text-emerald-500 uppercase tracking-widest mb-1 italic">Connection Optimal</p>
                      <p className="text-[10px] text-slate-600 font-bold uppercase tracking-widest">Latency: 42ms</p>
                    </div>
                    <Activity size={24} className="text-slate-800" />
                 </div>
              </div>
            </div>
          </main>
        </div>
      </div>
    );
  }

  return (
    <div className="flex bg-slate-950 min-h-screen text-slate-100 selection:bg-blue-600/30">
      {/* Sidebar navigation */}
      <div className="w-68 border-r border-slate-900 p-6 space-y-8 flex flex-col bg-slate-950 sticky top-0 h-screen z-40">
        <div onClick={() => navigate('/')} className="flex items-center space-x-3 px-2 cursor-pointer group mb-4">
          <div className="w-9 h-9 bg-blue-600 rounded-xl flex items-center justify-center font-black text-white shadow-2xl shadow-blue-600/20 group-hover:scale-105 transition-transform">V</div>
          <h1 className="text-2xl font-black tracking-tighter uppercase italic group-hover:text-blue-500 transition-colors">VenueFlow</h1>
        </div>
        
        <div className="px-2 space-y-2 mb-6">
          <label className="text-[10px] font-black text-slate-600 uppercase tracking-[0.2em] pl-1">Operational Frequency</label>
          <div className="relative group">
            <select 
              value={event?.id || ''} 
              onChange={handleEventChange}
              className="w-full bg-slate-900 border border-slate-800 rounded-2xl px-5 py-3.5 appearance-none font-black text-xs focus:ring-2 focus:ring-blue-600 outline-none transition-all cursor-pointer pr-10 hover:border-slate-700 shadow-lg"
            >
              {allEvents.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
            </select>
            <ChevronDown size={14} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-600 pointer-events-none group-hover:text-blue-500 transition-colors" />
          </div>
        </div>

        <nav className="space-y-1.5 flex-1">
          <button onClick={() => setActiveTab('list')} className={`w-full flex items-center space-x-3 px-5 py-4 rounded-2xl transition-all border font-black text-[11px] uppercase tracking-widest ${activeTab === 'list' ? 'bg-blue-600 text-white border-blue-500 shadow-xl shadow-blue-600/20' : 'text-slate-500 border-transparent hover:bg-slate-900 hover:text-blue-400'}`}><LayoutDashboard size={18} /> <span>Dashboard</span></button>
          <button onClick={() => setActiveTab('notifications')} className={`w-full flex items-center justify-between px-5 py-4 rounded-2xl transition-all border font-black text-[11px] uppercase tracking-widest ${activeTab === 'notifications' ? 'bg-indigo-600 text-white border-indigo-500 shadow-xl shadow-indigo-600/20' : 'text-slate-500 border-transparent hover:bg-slate-900 hover:text-indigo-400'}`}><div className="flex items-center space-x-3"><Bell size={18} /> <span>Dispatch Hub</span></div> {notifications.filter(n => n.status === 'unread').length > 0 && <span className="bg-rose-500 text-white text-[10px] font-black px-2.5 py-1 rounded-lg animate-bounce shadow-lg shadow-rose-900/40">{notifications.filter(n => n.status === 'unread').length}</span>}</button>
        </nav>

        <div className="pt-8 border-t border-slate-900 space-y-6">
          <div className="px-5 py-6 bg-slate-900/50 rounded-3xl border border-slate-800 shadow-inner">
            <p className="text-[10px] text-slate-600 uppercase tracking-widest font-black mb-2 italic">Active Garrison</p>
            <h3 className="font-black text-slate-200 text-xs uppercase italic line-clamp-1">{presence?.current_gate_id ? (entryPoints[presence.current_gate_id]?.label || presence.current_gate_id) : 'Undeployed'}</h3>
            <div className="flex items-center space-x-2 mt-2">
               <div className={`w-1.5 h-1.5 rounded-full ${isConnected ? 'bg-emerald-500 shadow-lg shadow-emerald-500/50 animate-pulse' : 'bg-rose-500 shadow-lg shadow-rose-500/50'}`} />
               <p className={`text-[10px] font-black uppercase tracking-widest ${isConnected ? 'text-emerald-500' : 'text-rose-500'}`}>{isConnected ? 'Live Sync' : 'Offline'}</p>
            </div>
          </div>
          <button onClick={logout} className="w-full flex items-center space-x-3 px-5 py-4 text-slate-600 hover:text-rose-500 transition-all font-black text-[11px] uppercase tracking-widest group"><LogOut size={18} className="group-hover:rotate-12 transition-transform" /> <span>Disconnect</span></button>
        </div>
      </div>

      {/* Main Viewport */}
      <main className="flex-1 p-12 overflow-y-auto bg-slate-950">
        <header className="flex justify-between items-start mb-16 px-2">
          <div>
            <p className="text-blue-500 font-black text-[11px] uppercase tracking-[0.5em] mb-4 italic opacity-80">Tactical Intelligence Orchestration</p>
            <h2 className="text-6xl font-black text-white tracking-tighter uppercase italic leading-none">{event?.name || 'Live Event Monitor'}</h2>
          </div>
          
          <div className="flex flex-col items-end space-y-5">
             <div className="flex items-center space-x-4">
                <button onClick={() => setIsIncidentModalOpen(true)} className="flex items-center space-x-3 px-8 py-4.5 bg-rose-600 hover:bg-rose-500 text-white rounded-[1.5rem] shadow-2xl shadow-rose-600/30 transition-all font-black text-[10px] uppercase tracking-widest active:scale-95"><ShieldAlert size={18} /> <span>REPORT INCIDENT</span></button>
                <button onClick={handleEmergency} className="flex items-center space-x-3 px-8 py-4.5 bg-slate-900 border border-slate-800 text-amber-500 rounded-[1.5rem] hover:bg-slate-800 transition-all font-black text-[10px] uppercase tracking-widest active:scale-95 shadow-xl"><AlertTriangle size={18} /> <span>EMERGENCY BACKUP</span></button>
             </div>
             
             {presence?.status === 'in_transit' && (
               <div className="w-full max-w-sm bg-indigo-600/10 border border-indigo-500/20 rounded-3xl p-6 animate-in slide-in-from-top-6 duration-700 shadow-2xl">
                  <div className="flex items-center justify-between mb-5">
                     <div className="flex items-center space-x-3">
                        <RefreshCw size={16} className="text-indigo-400 animate-spin" />
                        <span className="text-[11px] font-black text-indigo-400 uppercase tracking-widest italic">Tactical Transit</span>
                     </div>
                     <span className="text-[10px] font-black text-slate-600 uppercase tracking-widest italic">Target: Sector B</span>
                  </div>
                  <button onClick={handleConfirmArrival} className="w-full bg-indigo-600 hover:bg-indigo-500 text-white py-4 rounded-2xl text-[11px] font-black shadow-2xl shadow-indigo-600/40 transition-all flex items-center justify-center space-x-2 active:scale-95"><Check size={18} /> <span>CONFIRM STATION ARRIVAL</span></button>
               </div>
             )}
          </div>
        </header>

        <section className="animate-in fade-in slide-in-from-bottom-8 duration-700">
           <IntelligenceHubView eventId={event?.id || eventId} venue={venue} initialTab={activeTab === 'notifications' ? 'list' : activeTab} />
        </section>

        <footer className="mt-24 py-12 border-t border-slate-900 flex justify-between items-center text-slate-700 text-[10px] font-black uppercase tracking-[0.3em] italic">
          <span>&copy; 2026 VenueFlow Tactical Operations</span>
          <div className="flex space-x-12">
             <span>Station ID: {presence?.current_gate_id || 'FLOAT_ALPHA'}</span>
             <span>Network: {isConnected ? 'Synchronized' : 'Desynchronized'}</span>
          </div>
        </footer>
      </main>

      <IncidentReportModal isOpen={isIncidentModalOpen} onClose={() => setIsIncidentModalOpen(false)} staffMember={presence} eventId={event?.id || eventId} />

      {notifications.find(n => n.status === 'unread') && (
        <TacticalRedirectOverlay 
          dispatch={notifications.find(n => n.status === 'unread')} 
          entryPoints={entryPoints} 
          onAccept={() => handleAcceptDispatch(notifications.find(n => n.status === 'unread'))} 
          onDecline={() => update(dbRef(rtdb, `staff_notifications/${currentUser.uid}/${notifications.find(n => n.status === 'unread').id}`), { status: 'read' })} 
        />
      )}
    </div>
  );
}
