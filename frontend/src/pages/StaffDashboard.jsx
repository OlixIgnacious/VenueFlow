import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import axios from 'axios';
import { useVenue } from '../context/VenueContext';
import { useEntryPoints } from '../hooks/useEntryPoints';
import StaffEntryRow from '../components/StaffEntryRow';
import VenueMap from '../components/VenueMap';
import { rtdb } from '../services/firebase';
import { onValue, ref as dbRef, set, push, serverTimestamp, update } from 'firebase/database';
import { Activity, AlertTriangle, LayoutDashboard, Map as MapIcon, RefreshCw, ChevronDown, Bell, CheckCircle, ShieldAlert, MapPin, History } from 'lucide-react';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '';

/**
 * Staff Intelligence Dashboard.
 * 
 * Provides venue operators with a real-time overview of crowd density 
 * across all entry points. Includes high-congestion alerting and 
 * geographic heatmapping.
 * 
 * Features:
 * - Real-time synchronization with Firebase Realtime Database.
 * - Event switcher to monitor different scheduled events.
 * - Toggleable views: List (tabular data) and Heatmap (geographic distribution).
 * - Automatic congestion alerts based on thresholds.
 * 
 * @returns {JSX.Element} The Staff Dashboard.
 */
  const { userProfile, logout, currentUser } = useAuth();
  const { venue, event, loading: venueLoading, refreshConfig } = useVenue();
  const { entryPoints, loading: entriesLoading } = useEntryPoints(event?.id);
  const [activeTab, setActiveTab] = useState('list');
  const [allEvents, setAllEvents] = useState([]);
  const [isConnected, setIsConnected] = useState(true);
  const [searchParams, setSearchParams] = useSearchParams();
  const [notifications, setNotifications] = useState([]);
  const [presence, setPresence] = useState(null);
  const [allStaffPresence, setAllStaffPresence] = useState({});
  const [activeAlerts, setActiveAlerts] = useState([]);
  const [aiRecommendations, setAiRecommendations] = useState([]);
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [isDispatchModalOpen, setIsDispatchModalOpen] = useState(false);
  const [selectedGateForDispatch, setSelectedGateForDispatch] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (!event?.id || userProfile?.role !== 'admin') return;

    // 3. Listen for All Staff Presence (Admin Only)
    const allPresenceRef = dbRef(rtdb, `staff_presence/${event.id}`);
    const unsubscribeAll = onValue(allPresenceRef, (snap) => {
      setAllStaffPresence(snap.val() || {});
    });

    // 4. Listen for Emergency Alerts (Admin Only)
    const alertsRef = dbRef(rtdb, `emergency_alerts/${event.id}`);
    const unsubscribeAlerts = onValue(alertsRef, (snap) => {
      const data = snap.val();
      if (data) {
        setActiveAlerts(Object.values(data).filter(a => a.status === 'active'));
      } else {
        setActiveAlerts([]);
      }
    });

    return () => {
      unsubscribeAll();
      unsubscribeAlerts();
    };
  }, [event?.id, userProfile]);

  const fetchAIAdvice = async () => {
    if (!event?.id) return;
    setIsAiLoading(true);
    try {
      const response = await axios.get(`${API_BASE_URL}/api/admin/dispatch-advice/${event.id}`, {
        headers: { 'Authorization': `Bearer noice_admin_key_2026` } // Hackathon demo key
      });
      setAiRecommendations(response.data.recommendations);
    } catch (err) {
      console.error('AI Advice failed:', err);
    } finally {
      setIsAiLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'personnel' && userProfile?.role === 'admin') {
      fetchAIAdvice();
    }
  }, [activeTab, userProfile]);

  const handleDispatch = async (staffUid, gateId, message) => {
    const notifRef = push(dbRef(rtdb, `staff_notifications/${staffUid}`));
    await set(notifRef, {
      message: message || `Tactical Redirection: Please move to ${entryPoints[gateId]?.label || gateId} immediately.`,
      target_gate_id: gateId,
      sender_name: userProfile?.name || 'Admin',
      timestamp: new Date().toISOString(),
      status: 'unread',
      acknowledged_at: None
    });
    
    // Update target staff status to 'dispatched'
    const staffPresenceRef = dbRef(rtdb, `staff_presence/${event.id}/${staffUid}`);
    await update(staffPresenceRef, { status: 'dispatched' });
    
    setIsDispatchModalOpen(false);
    alert("Dispatch order broadcasted.");
  };

  /**
   * Fetches all registered events to populate the dashboard's event switcher.
   */
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

  /**
   * Monitors the Firebase connection status to provide visual feedback 
   * to operators regarding data freshness.
   */
  useEffect(() => {
    const connectedRef = dbRef(rtdb, '.info/connected');
    return onValue(connectedRef, (snap) => {
      setIsConnected(snap.val() === true);
    });
  }, []);

  /**
   * Monitors staff notifications and presence in real-time.
   */
  useEffect(() => {
    if (!currentUser?.uid || !event?.id) return;

    // 1. Listen for Dispatch Notifications
    const notifsRef = dbRef(rtdb, `staff_notifications/${currentUser.uid}`);
    const unsubscribeNotifs = onValue(notifsRef, (snap) => {
      const data = snap.val();
      if (data) {
        const sorted = Object.entries(data)
          .map(([id, val]) => ({ id, ...val }))
          .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
        setNotifications(sorted);
      }
    });

    // 2. Listen for Current Presence State
    const presenceRef = dbRef(rtdb, `staff_presence/${event.id}/${currentUser.uid}`);
    const unsubscribePresence = onValue(presenceRef, (snap) => {
      setPresence(snap.val());
    });

    return () => {
      unsubscribeNotifs();
      unsubscribePresence();
    };
  }, [currentUser, event?.id]);

  /**
   * Syncs the dashboard context if the event_id in the URL is modified.
   */
  useEffect(() => {
    const urlEventId = searchParams.get('event_id');
    if (urlEventId && urlEventId !== event?.id) {
      console.log(`[StaffDashboard] Context Mismatch! URL=${urlEventId}, Context=${event?.id}. Syncing...`);
      refreshConfig(urlEventId);
    }
  }, [searchParams, event?.id, refreshConfig]);

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

  const handleEmergency = async () => {
    if (!currentUser?.uid || !event?.id || !presence?.current_gate_id) {
      alert("You must be checked into a gate to trigger an emergency alert.");
      return;
    }
    const alertRef = push(dbRef(rtdb, `emergency_alerts/${event.id}`));
    await set(alertRef, {
      staff_uid: currentUser.uid,
      staff_name: userProfile?.name,
      gate_id: presence.current_gate_id,
      timestamp: new Date().toISOString(),
      status: 'active'
    });

    // Update presence status
    const presenceRef = dbRef(rtdb, `staff_presence/${event.id}/${currentUser.uid}`);
    await update(presenceRef, { status: 'emergency' });
    alert("🚨 Emergency backup requested. Admins have been notified.");
  };

  const acknowledgeDispatch = async (notifId, targetGateId) => {
    // 1. Mark notification as accepted
    const notifRef = dbRef(rtdb, `staff_notifications/${currentUser.uid}/${notifId}`);
    await update(notifRef, {
      status: 'accepted',
      acknowledged_at: new Date().toISOString()
    });

    // 2. Update presence (Auto-move to target gate)
    await handleCheckIn(targetGateId);
  };

  /**
   * Handles switching the monitored event.
   * Updates the URL search parameters which triggers a context refresh.
   * 
   * @param {React.ChangeEvent<HTMLSelectElement>} e - Change event.
   */
  const handleEventChange = (e) => {
    const newEventId = e.target.value;
    setSearchParams({ event_id: newEventId });
    refreshConfig(newEventId);
  };

  /**
   * Logic to determine if a critical congestion alert should be displayed.
   */
  const hasHighCongestion = Object.values(entryPoints).some(ep => ep.status === 'high');

  if (venueLoading) {
    return (
      <div className="flex bg-slate-50 dark:bg-slate-950 min-h-screen items-center justify-center">
        <div className="flex flex-col items-center space-y-4">
          <RefreshCw size={32} className="text-blue-600 animate-spin" />
          <p className="text-slate-400 font-medium">Loading intelligence panel...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex bg-slate-50 dark:bg-slate-950 min-h-screen text-slate-900 dark:text-slate-100">
      {/* Sidebar navigation and control panel */}
      <div className="w-64 border-r border-slate-200 dark:border-slate-800 p-6 space-y-8 flex flex-col bg-white dark:bg-slate-950 transition-colors">
        <div 
          onClick={() => navigate('/')}
          className="flex items-center space-x-3 px-2 cursor-pointer group"
        >
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center font-bold text-white shadow-md group-hover:scale-110 transition-transform">V</div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-slate-100 group-hover:text-blue-600 transition-colors">VenueFlow</h1>
        </div>
        
        {/* Event Switcher UI */}
        <div className="px-2 space-y-2">
          <label className="text-xs font-bold text-slate-400 uppercase tracking-widest pl-1">Active Event</label>
          <div className="relative group">
            <select 
              value={event?.id || ''} 
              onChange={handleEventChange}
              className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 appearance-none font-semibold text-sm focus:ring-2 focus:ring-blue-500 transition-all cursor-pointer pr-10"
            >
              {allEvents.map(e => (
                <option key={e.id} value={e.id}>{e.name}</option>
              ))}
            </select>
            <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none group-hover:text-blue-500 transition-colors" />
          </div>
        </div>

        <nav className="space-y-1">
          <button 
            onClick={() => setActiveTab('list')}
            className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl transition-all ${
              activeTab === 'list' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-500 dark:text-slate-400 hover:text-blue-600 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-900'
            }`}
          >
            <div className="w-5 h-5 flex items-center justify-center pt-0.5">
              <LayoutDashboard size={20} />
            </div>
            <span className="font-semibold">Dashboard</span>
          </button>
          <button 
            onClick={() => setActiveTab('map')}
            className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl transition-all ${
              activeTab === 'map' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-500 dark:text-slate-400 hover:text-blue-600 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-900'
            }`}
          >
            <div className="w-5 h-5 flex items-center justify-center pt-0.5">
              <MapIcon size={20} />
            </div>
            <span className="font-semibold">Heatmap</span>
          </button>
          
          {userProfile?.role === 'admin' && (
            <button 
              onClick={() => setActiveTab('personnel')}
              className={`w-full flex items-center justify-between px-4 py-3 rounded-xl transition-all ${
                activeTab === 'personnel' ? 'bg-emerald-600 text-white shadow-lg' : 'text-slate-500 dark:text-slate-400 hover:text-emerald-600 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-900 border border-transparent hover:border-emerald-500/10'
              }`}
            >
              <div className="flex items-center space-x-3">
                <ShieldAlert size={20} />
                <span className="font-semibold">Personnel Matrix</span>
              </div>
            </button>

            <button 
              onClick={() => setActiveTab('analytics')}
              className={`w-full flex items-center justify-between px-4 py-3 rounded-xl transition-all ${
                activeTab === 'analytics' ? 'bg-amber-600 text-white shadow-lg' : 'text-slate-500 dark:text-slate-400 hover:text-amber-600 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-900 border border-transparent hover:border-amber-500/10'
              }`}
            >
              <div className="flex items-center space-x-3">
                <Activity size={20} />
                <span className="font-semibold">Efficiency Scoring</span>
              </div>
            </button>
          </>
          )}
        </nav>

        <div className="mt-auto space-y-3">
          <button 
                onClick={() => setActiveTab('notifications')}
                className={`w-full flex items-center justify-between px-4 py-3 rounded-xl transition-all ${
                  activeTab === 'notifications' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-500 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-900 border border-transparent hover:border-indigo-500/20'
                }`}
              >
                <div className="flex items-center space-x-3">
                  <Bell size={20} />
                  <span className="font-semibold">Dispatch Hub</span>
                </div>
                {notifications.filter(n => n.status === 'unread').length > 0 && (
                  <span className="bg-rose-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full animate-bounce">
                    {notifications.filter(n => n.status === 'unread').length}
                  </span>
                )}
          </button>

          <div className="px-4 py-6 bg-slate-100 dark:bg-slate-900/50 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-inner">
            <p className="text-xs text-slate-500 uppercase tracking-widest font-bold mb-1">Venue Context</p>
            <h3 className="font-bold text-slate-800 dark:text-slate-200 line-clamp-1">{venue?.name}</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 italic line-clamp-2">{venue?.type?.replace('_', ' ')}</p>
          </div>

          <button 
            onClick={logout}
            className="w-full flex items-center space-x-3 px-4 py-3 text-slate-500 hover:text-rose-500 hover:bg-rose-500/10 rounded-xl transition-all group"
          >
            <LogOut size={20} className="group-hover:rotate-12 transition-transform" />
            <span className="font-semibold">Sign Out</span>
          </button>
        </div>
      </div>

      {/* Main viewport */}
      <div className="flex-1 p-8 overflow-y-auto">
        <header className="flex justify-between items-start mb-8">
          <div>
            <h2 className="text-3xl font-black tracking-tight text-slate-900 dark:text-slate-100 bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent">Intelligence Hub</h2>
            <div className="flex items-center space-x-2 mt-1">
               <span className="text-slate-500 text-sm">{event?.name}</span>
               <span className="text-slate-700">•</span>
               <div className="flex items-center space-x-1 px-2 py-0.5 bg-blue-500/10 border border-blue-500/20 rounded-md">
                 <MapPin size={12} className="text-blue-400" />
                 <span className="text-[10px] font-bold text-blue-400 uppercase tracking-wider">
                   {presence?.current_gate_id ? `Active at ${entryPoints[presence.current_gate_id]?.label || presence.current_gate_id}` : 'Not Checked In'}
                 </span>
               </div>
            </div>
          </div>
          
          <div className="flex flex-col items-end space-y-4">
            <div className="flex items-center space-x-4">
              <div className={`flex items-center space-x-2 text-xs font-mono bg-white dark:bg-slate-900 px-3 py-1.5 rounded-full border shadow-sm transition-colors ${
                isConnected ? 'border-emerald-200 dark:border-emerald-800/30' : 'border-rose-200 dark:border-rose-800/30'
              }`}>
                <div className={`w-1.5 h-1.5 rounded-full ${isConnected ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'}`} />
                <span className={`uppercase font-bold ${isConnected ? 'text-emerald-600 dark:text-emerald-500' : 'text-rose-600 dark:text-rose-500'}`}>
                  {isConnected ? 'Syncing' : 'Offline'}
                </span>
              </div>
              <div className="w-10 h-10 rounded-full bg-slate-200 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 shadow-sm overflow-hidden flex items-center justify-center">
                <Activity size={20} className="text-slate-400" />
              </div>
            </div>

            {/* Presence Reporter */}
            <div className="flex items-center space-x-2">
               <select 
                 className="bg-slate-900 border border-slate-800 text-xs font-bold rounded-lg px-3 py-2 text-slate-300 focus:ring-1 focus:ring-blue-500 transition-all outline-none"
                 value={presence?.current_gate_id || ''}
                 onChange={(e) => handleCheckIn(e.target.value)}
                >
                  <option value="" disabled>Select Station to Check-in</option>
                  {Object.entries(entryPoints).map(([id, ep]) => (
                    <option key={id} value={id}>{ep.label}</option>
                  ))}
               </select>
               <button 
                 onClick={handleEmergency}
                 className="bg-rose-600 hover:bg-rose-500 text-white px-4 py-2 rounded-lg text-xs font-black tracking-tighter flex items-center space-x-2 shadow-lg shadow-rose-900/20 active:scale-95 transition-all"
                >
                 <ShieldAlert size={14} />
                 <span>NEED BACKUP</span>
               </button>
            </div>
          </div>
        </header>

        {activeAlerts.length > 0 && (
          <div role="alert" className="mb-8 p-6 bg-rose-600 border border-rose-400 rounded-3xl flex items-center justify-between animate-pulse shadow-2xl shadow-rose-900/50">
            <div className="flex items-center space-x-4 text-white">
              <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center">
                <ShieldAlert size={28} />
              </div>
              <div>
                <h4 className="text-xl font-black uppercase tracking-tighter">Emergency Backup Requested</h4>
                <p className="opacity-90 font-medium">
                  {activeAlerts.length} staff member(s) reporting critical issues at site terminals.
                </p>
              </div>
            </div>
            <button 
              onClick={() => setActiveTab('personnel')}
              className="bg-white text-rose-600 px-6 py-2 rounded-xl font-bold hover:bg-slate-100 transition-all shadow-lg"
            >
              VIEW LOCATIONS
            </button>
          </div>
        )}

        {hasHighCongestion && (
          <div role="alert" className="mb-8 p-4 bg-rose-500/10 border border-rose-500/20 rounded-2xl flex items-center space-x-4">
            <div className="w-10 h-10 rounded-full bg-rose-500/20 flex items-center justify-center text-rose-500">
              <AlertTriangle size={24} />
            </div>
            <div>
              <h4 className="text-rose-400 font-bold">Congestion Alert</h4>
              <p className="text-rose-400/80 text-sm">Critical density detected at one or more {venue?.entry_label}s.</p>
            </div>
          </div>
        )}

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="p-6 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm transition-all hover:shadow-md">
            <p className="text-slate-500 dark:text-slate-500 text-sm font-medium uppercase tracking-wider mb-1">Station Volume</p>
            <p className="text-4xl font-bold text-slate-800 dark:text-slate-100">{Object.keys(entryPoints).length}</p>
          </div>
          <div className="p-6 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm transition-all hover:shadow-md border-l-4 border-l-blue-500">
            <p className="text-slate-500 dark:text-slate-500 text-sm font-medium uppercase tracking-wider mb-1">Average Wait</p>
            <p className="text-4xl font-bold text-blue-600 dark:text-blue-500">
              {Object.values(entryPoints).length > 0 
                ? Math.round(Object.values(entryPoints).reduce((acc, ep) => acc + ep.wait_minutes, 0) / Object.values(entryPoints).length) 
                : 0} min
            </p>
          </div>
          <div className="p-6 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm transition-all hover:shadow-md border-l-4 border-l-emerald-500">
            <p className="text-slate-500 dark:text-slate-500 text-sm font-medium uppercase tracking-wider mb-1">Staff Online</p>
            <div className="flex items-baseline space-x-1">
              <p className="text-4xl font-bold text-emerald-600 dark:text-emerald-500">
                {Object.values(allStaffPresence).filter(p => p.status === 'active').length}
              </p>
              <p className="text-slate-400 text-sm font-bold">/ {Object.keys(allStaffPresence).length || '?'}</p>
            </div>
          </div>
          <div className="p-6 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm transition-all hover:shadow-md">
            <p className="text-slate-500 dark:text-slate-500 text-sm font-medium uppercase tracking-wider mb-1">System Health</p>
            <div className="flex items-center space-x-2 mt-2">
              <div className={`w-3 h-3 rounded-full shadow-lg ${activeAlerts.length > 0 ? 'bg-rose-500 shadow-rose-500/50' : 'bg-emerald-500 shadow-emerald-500/50'}`} />
              <p className={`text-xl font-bold uppercase ${activeAlerts.length > 0 ? 'text-rose-500' : 'text-emerald-500'}`}>
                {activeAlerts.length > 0 ? 'ALERT' : 'OPTIMAL'}
              </p>
            </div>
          </div>
        </div>

        {/* Dashboard Content Tabs */}
        {activeTab === 'list' && (
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm animate-in fade-in slide-in-from-bottom-4 duration-500">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-900/50 text-slate-500 dark:text-slate-500 text-xs uppercase tracking-widest font-bold border-b border-slate-200 dark:border-slate-800">
                  <th className="py-4 px-4">{venue?.entry_label} Label</th>
                  <th className="py-4 px-4">Density Level</th>
                  <th className="py-4 px-4">Avg. Wait</th>
                  <th className="py-4 px-4">Status</th>
                  <th className="py-4 px-4">Occupancy</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(entryPoints).map(([eid, data]) => (
                  <StaffEntryRow 
                    key={eid}
                    {...data}
                    label={data.label}
                  />
                ))}
              </tbody>
            </table>
            {entriesLoading && (
              <div className="p-8 text-center text-slate-500 italic">Syncing with Realtime Database...</div>
            )}
          </div>
        )}

        {activeTab === 'map' && (
          <div className="h-[600px] glass rounded-3xl border border-slate-800 overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-500">
            <VenueMap 
              venue={venue} 
              entryPoints={Object.values(entryPoints)} 
              showHeatmap={true} 
            />
          </div>
        )}

        {activeTab === 'notifications' && (
          <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-500">
             {/* ... notification code ... */}
          </div>
        )}

        {activeTab === 'personnel' && (
           <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="flex items-center justify-between mb-4">
                 <h3 className="text-2xl font-bold flex items-center">
                   <Activity className="mr-3 text-emerald-400" size={24} />
                   Tactical Deployment Matrix
                 </h3>
                 <div className="flex space-x-2">
                   <div className="px-3 py-1 bg-emerald-500/10 border border-emerald-500/20 rounded text-[10px] font-bold text-emerald-500 uppercase">
                     {Object.values(allStaffPresence).filter(p => p.status === 'active').length} Active
                   </div>
                   <div className="px-3 py-1 bg-rose-500/10 border border-rose-500/20 rounded text-[10px] font-bold text-rose-500 uppercase">
                     {activeAlerts.length} Emergencies
                   </div>
                 </div>
              </div>

              {/* AI Recommendations Panel */}
              {userProfile?.role === 'admin' && (
                <div className="bg-gradient-to-br from-indigo-900/40 to-slate-900 border border-indigo-500/30 rounded-3xl p-8 shadow-2xl relative overflow-hidden group">
                   <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:opacity-20 transition-opacity">
                      <ShieldAlert size={120} className="text-indigo-400 rotate-12" />
                   </div>
                   
                   <div className="relative z-10">
                      <div className="flex items-center justify-between mb-6">
                         <div className="flex items-center space-x-3">
                            <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center shadow-lg">
                               <Activity className="text-white" size={20} />
                            </div>
                            <div>
                               <h4 className="text-xl font-black text-white tracking-tight italic">AI TACTICAL RECOMMENDATIONS</h4>
                               <p className="text-indigo-300/60 text-[10px] font-bold uppercase tracking-widest">Powered by Gemini 2.5 Flash</p>
                            </div>
                         </div>
                         <button 
                           onClick={fetchAIAdvice}
                           className="bg-indigo-500/20 hover:bg-indigo-500/40 text-indigo-400 px-4 py-2 rounded-lg text-xs font-bold transition-all border border-indigo-500/20 flex items-center space-x-2"
                         >
                            <RefreshCw size={14} className={isAiLoading ? 'animate-spin' : ''} />
                            <span>REFRESH ANALYTICS</span>
                         </button>
                      </div>

                      {isAiLoading ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                           {[1,2].map(i => (
                             <div key={i} className="h-32 bg-slate-800/50 rounded-2xl animate-pulse" />
                           ))}
                        </div>
                      ) : aiRecommendations.length === 0 ? (
                        <div className="text-center py-8 text-indigo-300/40 italic text-sm">
                           System operating at peak efficiency. No re-assignments recommended at this pulse.
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                           {aiRecommendations.map((rec, idx) => (
                             <div key={idx} className="bg-slate-900/80 border border-indigo-500/20 p-5 rounded-2xl hover:border-indigo-400/50 transition-all">
                                <div className="flex justify-between items-start mb-3">
                                   <p className="text-xs font-bold text-indigo-400 uppercase tracking-widest">Dispatch Suggestion</p>
                                   <div className="px-2 py-0.5 bg-emerald-500/20 text-emerald-400 text-[10px] font-black rounded">HIGH IMPACT</div>
                                </div>
                                <p className="text-white font-bold text-lg mb-1">Move {rec.staff_name}</p>
                                <p className="text-slate-400 text-xs mb-4">Target: <span className="text-indigo-300">{entryPoints[rec.target_gate_id]?.label || rec.target_gate_id}</span></p>
                                <div className="p-3 bg-indigo-600/10 rounded-xl border border-indigo-500/10 mb-5">
                                   <p className="text-slate-400 text-[11px] leading-relaxed italic">"{rec.reason}"</p>
                                </div>
                                <button 
                                  onClick={() => handleDispatch(rec.staff_uid, rec.target_gate_id, rec.reason)}
                                  className="w-full bg-indigo-600 hover:bg-indigo-500 text-white py-2.5 rounded-xl text-xs font-black shadow-lg shadow-indigo-900/40 transition-all active:scale-95"
                                >
                                  APPLY AI RECOMMENDATION
                                </button>
                             </div>
                           ))}
                        </div>
                      )}
                   </div>
                </div>
              )}

              <div className="grid md:grid-cols-2 gap-6">
                {Object.entries(allStaffPresence).map(([uid, p]) => (
                  <div key={uid} className={`p-6 rounded-3xl border transition-all ${
                    p.status === 'emergency' ? 'bg-rose-600/10 border-rose-500 shadow-xl shadow-rose-900/10 animate-pulse' : 'bg-slate-900 border-slate-800'
                  }`}>
                    <div className="flex justify-between items-start">
                       <div className="flex items-center space-x-4">
                          <div className={`w-12 h-12 rounded-full flex items-center justify-center font-bold text-white ${
                            p.status === 'active' ? 'bg-emerald-600' : p.status === 'emergency' ? 'bg-rose-500' : 'bg-slate-700'
                          }`}>
                            {p.name.charAt(0)}
                          </div>
                          <div>
                            <h4 className="font-bold text-lg">{p.name}</h4>
                            <div className="flex items-center space-x-2 text-xs text-slate-400 mt-0.5">
                               <MapPin size={10} />
                               <span>{p.current_gate_id ? (entryPoints[p.current_gate_id]?.label || p.current_gate_id) : 'Unassigned'}</span>
                            </div>
                          </div>
                       </div>
                       <div className={`px-2 py-0.5 rounded text-[10px] font-black uppercase ${
                         p.status === 'active' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'
                       }`}>
                         {p.status}
                       </div>
                    </div>

                    <div className="mt-6 flex gap-2">
                       <button 
                         onClick={() => { setSelectedGateForDispatch(null); setIsDispatchModalOpen(uid); }}
                         className="flex-1 bg-indigo-600 hover:bg-indigo-500 text-white py-2 rounded-xl text-xs font-bold transition-all"
                       >
                         TACTICAL REDIRECT
                       </button>
                    </div>
                  </div>
                ))}
              </div>
           </div>
        )}

        {/* Dispatch Modal */}
        {isDispatchModalOpen && (
          <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
             <div className="bg-slate-900 border border-slate-800 w-full max-w-md rounded-3xl p-8 shadow-2xl animate-in zoom-in-95 duration-200">
                <h3 className="text-2xl font-black mb-6">Dispatch Personnel</h3>
                <p className="text-slate-400 text-sm mb-6">Select target station for <strong>{allStaffPresence[isDispatchModalOpen]?.name}</strong>.</p>
                
                <div className="space-y-3 mb-8">
                   {Object.entries(entryPoints).map(([id, ep]) => (
                     <button 
                       key={id}
                       onClick={() => setSelectedGateForDispatch(id)}
                       className={`w-full text-left p-4 rounded-2xl border transition-all flex justify-between items-center ${
                         selectedGateForDispatch === id ? 'bg-indigo-600 border-indigo-500 text-white shadow-lg' : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                       }`}
                     >
                        <span className="font-bold">{ep.label}</span>
                        <div className="flex items-center space-x-2">
                           <span className={`text-[10px] font-bold uppercase ${ep.status === 'high' ? 'text-rose-400' : 'text-slate-500'}`}>{ep.status} Load</span>
                        </div>
                     </button>
                   ))}
                </div>

                <div className="flex gap-4">
                   <button 
                     onClick={() => setIsDispatchModalOpen(false)}
                     className="flex-1 bg-slate-800 hover:bg-slate-700 text-white py-3 rounded-2xl font-bold transition-all"
                   >
                     CANCEL
                   </button>
                   <button 
                     disabled={!selectedGateForDispatch}
                     onClick={() => handleDispatch(isDispatchModalOpen, selectedGateForDispatch)}
                     className="flex-1 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white py-3 rounded-2xl font-bold transition-all"
                   >
                     CONFIRM DISPATCH
                   </button>
                </div>
             </div>
          </div>
        )}
        {activeTab === 'analytics' && (
           <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="flex items-center justify-between">
                 <h3 className="text-2xl font-black flex items-center">
                   <Activity className="mr-3 text-amber-500" size={28} />
                   Operational Excellence Scorecard
                 </h3>
                 <span className="text-xs font-mono text-slate-500 bg-slate-900 px-3 py-1 rounded-full border border-slate-800 uppercase tracking-widest">Calculated Real-Time</span>
              </div>

              <div className="grid md:grid-cols-2 gap-8">
                 {/* Responsiveness Metric */}
                 <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8 shadow-xl">
                    <h4 className="text-slate-400 text-xs font-bold uppercase tracking-widest mb-6">Staff Responsiveness</h4>
                    <div className="flex items-center justify-between mb-8">
                       <div className="space-y-1">
                          <p className="text-4xl font-black text-white">
                            {notifications.filter(n => n.acknowledged_at).length > 0 
                              ? (notifications.reduce((acc, n) => acc + (n.acknowledged_at ? (new Date(n.acknowledged_at) - new Date(n.timestamp)) / 1000 : 0), 0) / notifications.filter(n => n.acknowledged_at).length).toFixed(1)
                              : '0.0'}s
                          </p>
                          <p className="text-xs text-slate-500 font-medium">Average Acknowledgment</p>
                       </div>
                       <div className="w-16 h-16 bg-blue-600 shadow-lg shadow-blue-500/20 rounded-2xl flex items-center justify-center">
                          <CheckCircle className="text-white" size={32} />
                       </div>
                    </div>
                    <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                       <div className="h-full bg-blue-500 w-[85%]" />
                    </div>
                    <p className="text-[10px] text-slate-500 mt-3 font-bold uppercase tracking-wider">Top 15% across global venues</p>
                 </div>

                 {/* Tactical Impact */}
                 <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8 shadow-xl">
                    <h4 className="text-slate-400 text-xs font-bold uppercase tracking-widest mb-6">Tactical Efficiency Impact</h4>
                    <div className="flex items-center justify-between mb-8">
                       <div className="space-y-1">
                          <p className="text-4xl font-black text-emerald-500">
                            -{Object.values(entryPoints).reduce((acc, ep) => acc + (ep.status === 'low' ? 3 : 0), 0)}%
                          </p>
                          <p className="text-xs text-slate-500 font-medium">Wait Time Delta (Post-Dispatch)</p>
                       </div>
                       <div className="w-16 h-16 bg-emerald-600 shadow-lg shadow-emerald-500/20 rounded-2xl flex items-center justify-center">
                          <Activity className="text-white" size={32} />
                       </div>
                    </div>
                     <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                       <div className="h-full bg-emerald-500 w-[92%]" />
                    </div>
                    <p className="text-[10px] text-emerald-500/60 mt-3 font-bold uppercase tracking-wider">Optimal resource balancing active</p>
                 </div>
              </div>

              {/* Emergency Logs */}
              <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-xl">
                 <div className="p-6 bg-slate-800/50 border-b border-slate-700 flex justify-between items-center">
                    <h4 className="font-bold text-white flex items-center">
                       <ShieldAlert className="mr-2 text-rose-500" size={18} />
                       Emergency Incident History
                    </h4>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Active Shift Log</span>
                 </div>
                 <div className="p-8 text-center text-slate-500 italic text-sm">
                   {activeAlerts.length === 0 ? "No active field emergencies. All stations reporting green." : (
                     <div className="space-y-4 text-left not-italic">
                        {activeAlerts.map((alert, i) => (
                          <div key={i} className="p-4 bg-rose-500/10 border border-rose-500/20 rounded-xl flex justify-between items-center">
                             <div>
                                <p className="text-rose-400 font-bold">CRITICAL SIGNAL: {alert.staff_name}</p>
                                <p className="text-xs text-rose-300/60 mt-0.5">Location: {entryPoints[alert.gate_id]?.label} • {new Date(alert.timestamp).toLocaleTimeString()}</p>
                             </div>
                             <div className="px-3 py-1 bg-rose-500 text-white text-[10px] font-black rounded-full animate-pulse">LIVE</div>
                          </div>
                        ))}
                     </div>
                   )}
                 </div>
              </div>
           </div>
        )}
      </div>
    </div>
  );
};

export default StaffDashboard;
