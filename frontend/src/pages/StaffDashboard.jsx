import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import axios from 'axios';
import { useVenue } from '../context/VenueContext';
import { useEntryPoints } from '../hooks/useEntryPoints';
import StaffEntryRow from '../components/StaffEntryRow';
import VenueMap from '../components/VenueMap';
import { rtdb } from '../services/firebase';
import { onValue, ref as dbRef } from 'firebase/database';
import { Activity, AlertTriangle, LayoutDashboard, Map as MapIcon, RefreshCw, ChevronDown } from 'lucide-react';

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
const StaffDashboard = () => {
  const { venue, event, loading: venueLoading, refreshConfig } = useVenue();
  const { entryPoints, loading: entriesLoading } = useEntryPoints(event?.id);
  const [activeTab, setActiveTab] = useState('list');
  const [allEvents, setAllEvents] = useState([]);
  const [isConnected, setIsConnected] = useState(true);
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

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
   * Syncs the dashboard context if the event_id in the URL is modified.
   */
  useEffect(() => {
    const urlEventId = searchParams.get('event_id');
    if (urlEventId && urlEventId !== event?.id) {
      refreshConfig(urlEventId);
    }
  }, [searchParams, event?.id, refreshConfig]);

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
        <div className="flex items-center space-x-3 px-2">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center font-bold text-white shadow-md">V</div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-slate-100">VenueFlow</h1>
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
        </nav>

        <div className="mt-auto px-4 py-6 bg-slate-100 dark:bg-slate-900/50 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-inner">
          <p className="text-xs text-slate-500 uppercase tracking-widest font-bold mb-1">Venue Context</p>
          <h3 className="font-bold text-slate-800 dark:text-slate-200 line-clamp-1">{venue?.name}</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 italic line-clamp-2">{venue?.type?.replace('_', ' ')}</p>
        </div>
      </div>

      {/* Main viewport */}
      <div className="flex-1 p-8 overflow-y-auto">
        <header className="flex justify-between items-center mb-8">
          <div>
            <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Crowd Intelligence</h2>
            <p className="text-slate-500 dark:text-slate-400 text-sm">Monitoring {event?.name}</p>
          </div>
          <div className="flex items-center space-x-4">
            <div className={`flex items-center space-x-2 text-xs font-mono bg-white dark:bg-slate-900 px-3 py-1.5 rounded-full border shadow-sm transition-colors ${
              isConnected ? 'border-emerald-200 dark:border-emerald-800/30' : 'border-rose-200 dark:border-rose-800/30'
            }`}>
              <div className={`w-1.5 h-1.5 rounded-full ${isConnected ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'}`} />
              <span className={`uppercase font-bold ${isConnected ? 'text-emerald-600 dark:text-emerald-500' : 'text-rose-600 dark:text-rose-500'}`}>
                {isConnected ? 'Live' : 'Reconnecting...'}
              </span>
            </div>
            <div className="w-10 h-10 rounded-full bg-slate-200 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 shadow-sm overflow-hidden flex items-center justify-center">
              <Activity size={20} className="text-slate-400" />
            </div>
          </div>
        </header>

        {hasHighCongestion && (
          <div role="alert" className="mb-8 p-4 bg-rose-500/10 border border-rose-500/20 rounded-2xl flex items-center space-x-4 animate-pulse">
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
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="p-6 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm transition-all hover:shadow-md">
            <p className="text-slate-500 dark:text-slate-500 text-sm font-medium uppercase tracking-wider mb-1">Total {venue?.entry_label}s</p>
            <p className="text-4xl font-bold text-slate-800 dark:text-slate-100">{Object.keys(entryPoints).length}</p>
          </div>
          <div className="p-6 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm transition-all hover:shadow-md">
            <p className="text-slate-500 dark:text-slate-500 text-sm font-medium uppercase tracking-wider mb-1">Average Wait</p>
            <p className="text-4xl font-bold text-blue-600 dark:text-blue-500">
              {Object.values(entryPoints).length > 0 
                ? Math.round(Object.values(entryPoints).reduce((acc, ep) => acc + ep.wait_minutes, 0) / Object.values(entryPoints).length) 
                : 0} min
            </p>
          </div>
          <div className="p-6 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm transition-all hover:shadow-md">
            <p className="text-slate-500 dark:text-slate-500 text-sm font-medium uppercase tracking-wider mb-1">System Status</p>
            <div className="flex items-center space-x-2 mt-2">
              <div className="w-3 h-3 bg-emerald-500 rounded-full shadow-[0_0_10px_rgba(16,185,129,0.5)]" />
              <p className="text-xl font-bold text-emerald-600 dark:text-emerald-500 lowercase first-letter:uppercase">OPTIMAL</p>
            </div>
          </div>
        </div>

        {/* Dashboard Content Tabs */}
        {activeTab === 'list' ? (
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
        ) : (
          <div className="h-[600px] glass rounded-3xl border border-slate-800 overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-500">
            <VenueMap 
              venue={venue} 
              entryPoints={Object.values(entryPoints)} 
              showHeatmap={true} 
            />
          </div>
        )}
      </div>
    </div>
  );
};

export default StaffDashboard;
