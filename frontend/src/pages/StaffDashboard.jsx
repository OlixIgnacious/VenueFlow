import React, { useState } from 'react';
import { useVenue } from '../context/VenueContext';
import { useEntryPoints } from '../hooks/useEntryPoints';
import StaffEntryRow from '../components/StaffEntryRow';
import VenueMap from '../components/VenueMap';
import { Activity, AlertTriangle, LayoutDashboard, Map as MapIcon, RefreshCw } from 'lucide-react';

const StaffDashboard = () => {
  const { venue, event, loading: venueLoading } = useVenue();
  const { entryPoints, loading: entriesLoading } = useEntryPoints(event?.id);
  const [activeTab, setActiveTab] = useState('list');

  const hasHighCongestion = Object.values(entryPoints).some(ep => ep.status === 'high');

  if (venueLoading) {
    return <div className="p-12 text-center text-slate-400">Loading dashboard...</div>;
  }

  return (
    <div className="flex bg-slate-950 min-h-screen">
      {/* Sidebar */}
      <div className="w-64 border-r border-slate-800 p-6 space-y-8 flex flex-col">
        <div className="flex items-center space-x-3 px-2">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center font-bold">V</div>
          <h1 className="text-xl font-bold tracking-tight">VenueFlow</h1>
        </div>
        
        <nav className="space-y-1">
          <button 
            onClick={() => setActiveTab('list')}
            className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl transition-all ${
              activeTab === 'list' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-400 hover:text-white hover:bg-slate-900'
            }`}
          >
            <LayoutDashboard size={20} />
            <span className="font-semibold">Dashboard</span>
          </button>
          <button 
            onClick={() => setActiveTab('map')}
            className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl transition-all ${
              activeTab === 'map' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-400 hover:text-white hover:bg-slate-900'
            }`}
          >
            <MapIcon size={20} />
            <span className="font-semibold">Heatmap</span>
          </button>
        </nav>

        <div className="mt-auto px-4 py-6 bg-slate-900/50 rounded-2xl border border-slate-800">
          <p className="text-xs text-slate-500 uppercase tracking-widest font-bold mb-1">Venue Context</p>
          <h3 className="font-bold text-slate-200">{venue?.name}</h3>
          <p className="text-xs text-slate-400 mt-1 italic">{event?.name}</p>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 p-8 overflow-y-auto">
        <header className="flex justify-between items-center mb-8">
          <div>
            <h2 className="text-2xl font-bold">Crowd Intelligence</h2>
            <p className="text-slate-400 text-sm">Real-time entry point density and wait times.</p>
          </div>
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2 text-xs font-mono bg-slate-900 px-3 py-1.5 rounded-full border border-slate-800">
              <RefreshCw size={12} className="text-emerald-500 animate-spin-slow" />
              <span className="text-slate-400 uppercase">Live Syncing</span>
            </div>
            <div className="w-10 h-10 rounded-full bg-slate-800 border border-slate-700" />
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
          <div className="p-6 glass rounded-3xl border border-slate-800">
            <p className="text-slate-500 text-sm font-medium uppercase tracking-wider mb-1">Total {venue?.entry_label}s</p>
            <p className="text-4xl font-bold text-slate-100">{Object.keys(entryPoints).length}</p>
          </div>
          <div className="p-6 glass rounded-3xl border border-slate-800">
            <p className="text-slate-500 text-sm font-medium uppercase tracking-wider mb-1">Average Wait</p>
            <p className="text-4xl font-bold text-blue-500">
              {Object.values(entryPoints).length > 0 
                ? Math.round(Object.values(entryPoints).reduce((acc, ep) => acc + ep.wait_minutes, 0) / Object.values(entryPoints).length) 
                : 0} min
            </p>
          </div>
          <div className="p-6 glass rounded-3xl border border-slate-800">
            <p className="text-slate-500 text-sm font-medium uppercase tracking-wider mb-1">System Status</p>
            <div className="flex items-center space-x-2 mt-2">
              <div className="w-3 h-3 bg-emerald-500 rounded-full shadow-[0_0_10px_rgba(16,185,129,0.5)]" />
              <p className="text-xl font-bold text-emerald-500">OPTIMAL</p>
            </div>
          </div>
        </div>

        {/* Dashboard Content Tabs */}
        {activeTab === 'list' ? (
          <div className="glass rounded-3xl border border-slate-800 overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-500">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-slate-900/50 text-slate-500 text-xs uppercase tracking-widest font-bold">
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
