import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { auth, rtdb } from '../services/firebase';
import { onValue, ref as dbRef, set, push, update } from 'firebase/database';
import { 
  Activity, LayoutDashboard, Map as MapIcon, 
  RefreshCw, History, Shield, Users, Brain
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useEntryPoints } from '../hooks/useEntryPoints';
import StaffEntryRow from '../components/StaffEntryRow';
import VenueMap from '../components/VenueMap';
import AdminPersonnelMatrix from '../components/AdminPersonnelMatrix';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '';

export default function IntelligenceHubView({ eventId, venue, initialTab = 'list' }) {
  const { userProfile } = useAuth();
  const { entryPoints, loading: entriesLoading } = useEntryPoints(eventId);
  const [activeTab, setActiveTab] = useState(initialTab);
  const [allStaffPresence, setAllStaffPresence] = useState({});
  const [aiRecommendations, setAiRecommendations] = useState([]);
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [allIncidents, setAllIncidents] = useState([]);
  const [personnel, setPersonnel] = useState([]);
  const [isDispatchModalOpen, setIsDispatchModalOpen] = useState(null); // stores staff UID
  const [selectedGateForDispatch, setSelectedGateForDispatch] = useState(null);
  const [toast, setToast] = useState(null);

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  // Sync RTDB State
  useEffect(() => {
    if (!eventId) return;

    // 1. Staff Presence
    const presenceRef = dbRef(rtdb, `staff_presence/${eventId}`);
    const unsubPresence = onValue(presenceRef, (snap) => setAllStaffPresence(snap.val() || {}));

    // 2. Incidents
    const incidentsRef = dbRef(rtdb, `incidents/${eventId}`);
    const unsubIncidents = onValue(incidentsRef, (snap) => {
      const data = snap.val();
      setAllIncidents(data ? Object.entries(data).map(([id, val]) => ({ id, ...val })).sort((a,b)=>new Date(b.timestamp)-new Date(a.timestamp)) : []);
    });

    // 3. Fetch Personnel (Admin Only)
    if (userProfile?.role === 'admin') {
      const fetchPersonnel = async () => {
        try {
          const token = await auth.currentUser?.getIdToken();
          const res = await axios.get(`${API_BASE_URL}/api/admin/personnel/${eventId}`, {
            headers: { 'Authorization': `Bearer ${token}` }
          });
          setPersonnel(res.data);
        } catch (e) { console.error('Personnel fetch error:', e); }
      };
      fetchPersonnel();
    }

    return () => {
      unsubPresence();
      unsubIncidents();
    };
  }, [eventId, userProfile]);

  const fetchAIAdvice = async () => {
    if (!eventId) return;
    setIsAiLoading(true);
    try {
      const token = await auth.currentUser?.getIdToken();
      const response = await axios.get(`${API_BASE_URL}/api/admin/dispatch-advice/${eventId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      setAiRecommendations(response.data.recommendations);
    } catch (err) {
      console.error('AI Advice failed:', err);
    } finally {
      setIsAiLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'ai' && userProfile?.role === 'admin') fetchAIAdvice();
  }, [activeTab, userProfile]);

  const handleDispatch = async (staffUid, gateId, message = "") => {
    if (!eventId || !staffUid || !gateId) return;
    try {
      const token = await auth.currentUser?.getIdToken();
      await axios.post(`${API_BASE_URL}/api/admin/dispatch`, {
        event_id: eventId,
        staff_uid: staffUid,
        target_gate_id: gateId,
        message: message
      }, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      setIsDispatchModalOpen(null);
      setSelectedGateForDispatch(null);
      showToast("Dispatch order broadcasted.", "success");
    } catch (e) {
      console.error('Dispatch error:', e);
      showToast("Dispatch failed.", "error");
    }
  };

  const livePersonnel = personnel.map(p => ({
    ...p,
    presence: allStaffPresence[p.uid] || null,
    is_online: !!allStaffPresence[p.uid]
  }));

  if (entriesLoading) {
    return <div className="p-12 text-center text-slate-500 uppercase font-black text-xs italic">Synchronizing Fleet...</div>;
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      
      {/* Tactical Overview Panels */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="p-6 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm transition-all hover:shadow-md border-l-4 border-l-blue-500">
          <p className="text-slate-500 dark:text-slate-500 text-[10px] font-black uppercase tracking-widest mb-1">Station Volume</p>
          <p className="text-4xl font-black text-slate-900 dark:text-white">{Object.keys(entryPoints).length}</p>
        </div>
        <div className="p-6 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm transition-all hover:shadow-md border-l-4 border-l-indigo-500">
          <p className="text-slate-500 dark:text-slate-500 text-[10px] font-black uppercase tracking-widest mb-1">Average Wait</p>
          <p className="text-4xl font-black text-slate-900 dark:text-white">
            {Object.keys(entryPoints).length > 0 
              ? `${Math.round(Object.values(entryPoints).reduce((acc, ep) => acc + ep.wait_minutes, 0) / Object.keys(entryPoints).length)}m`
              : '--'
            }
          </p>
        </div>
        <div className="p-6 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm transition-all hover:shadow-md border-l-4 border-l-emerald-500">
          <p className="text-slate-500 dark:text-slate-500 text-[10px] font-black uppercase tracking-widest mb-1">Staff Online</p>
          <div className="flex items-baseline space-x-1">
            <p className="text-4xl font-black text-emerald-600 dark:text-emerald-500">
              {Object.values(allStaffPresence).filter(p => p.status === 'active').length}
            </p>
            <p className="text-slate-400 text-sm font-bold opacity-30">/ {Object.keys(allStaffPresence).length || '?'}</p>
          </div>
        </div>
        <div className="p-6 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm transition-all hover:shadow-md border-l-4 border-l-rose-500">
          <p className="text-slate-500 dark:text-slate-500 text-[10px] font-black uppercase tracking-widest mb-1">Live Incidents</p>
          <div className="flex items-center space-x-2">
            <p className={`text-4xl font-black ${allIncidents.length > 0 ? 'text-rose-500' : 'text-slate-300'}`}>
              {allIncidents.length}
            </p>
            {allIncidents.length > 0 && <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />}
          </div>
        </div>
      </div>

      {/* Sub-navigation Tabs */}
      <div className="flex bg-slate-100 dark:bg-slate-900/50 p-1.5 rounded-2xl border border-slate-200 dark:border-slate-800 w-fit">
        {[
          { id: 'list', label: 'Matrix', icon: LayoutDashboard },
          { id: 'map', label: 'Heatmap', icon: MapIcon },
          { id: 'incidents', label: 'Log', icon: History },
          ...(userProfile?.role === 'admin' ? [
             { id: 'personnel', label: 'Staff', icon: Users },
             { id: 'ai', label: 'AI Tactical', icon: Brain }
          ] : [])
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center space-x-2 px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${
              activeTab === tab.id ? 'bg-white dark:bg-slate-800 text-blue-600 shadow-sm' : 'text-slate-500 hover:text-blue-500'
            }`}
          >
            <tab.icon size={14} />
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {activeTab === 'list' && (
        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm animate-in fade-in slide-in-from-bottom-4 duration-500">
           <table className="w-full text-left">
             <thead className="bg-slate-50 dark:bg-slate-950/50 border-b border-slate-100 dark:border-slate-800">
               <tr>
                 <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Site Terminal</th>
                 <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Operational Status</th>
                 <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Wait Pulse</th>
                 <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Wait Status</th>
                 <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Occupancy</th>
               </tr>
             </thead>
             <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
               {Object.entries(entryPoints).map(([id, ep]) => (
                 <StaffEntryRow key={id} entryPoint={ep} />
               ))}
             </tbody>
           </table>
        </div>
      )}

      {activeTab === 'map' && (
        <div className="h-[600px] bg-slate-900 rounded-3xl border border-slate-800 overflow-hidden relative shadow-2xl animate-in fade-in zoom-in-95 duration-500">
           <VenueMap 
             venue={venue}
             entryPoints={Object.entries(entryPoints).map(([id, ep]) => ({ ...ep, id }))} 
             showHeatmap={true} 
           />
        </div>
      )}

      {activeTab === 'incidents' && (
        <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
           {allIncidents.length === 0 ? (
             <div className="py-24 text-center border border-dashed border-slate-800 rounded-3xl">
                <p className="text-slate-500 italic">No tactical incidents logged.</p>
             </div>
           ) : (
             allIncidents.map(incident => (
               <div key={incident.id} className="bg-slate-900 border border-slate-800 p-6 rounded-3xl flex justify-between items-center group hover:border-blue-500/30 transition-all shadow-xl">
                  <div className="flex items-center space-x-6">
                     <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-bold text-lg ${incident.severity === 'alpha' ? 'bg-rose-500/20 text-rose-500' : 'bg-amber-500/20 text-amber-500'}`}>{incident.severity === 'alpha' ? '!' : '?'}</div>
                     <div><h4 className="font-bold text-white text-lg uppercase italic tracking-tighter">{incident.type.replace('_', ' ')}</h4><p className="text-slate-400 text-sm mt-1">{incident.description}</p><div className="flex items-center space-x-4 mt-3"><span className="text-[10px] font-black text-slate-600 uppercase tracking-widest">{new Date(incident.timestamp).toLocaleString()}</span><span className="text-[10px] font-black text-blue-500 uppercase tracking-widest">Reporter: {incident.staff_name || incident.reporter_name || 'Staff Member'}</span></div></div>
                  </div>
               </div>
             ))
           )}
        </div>
      )}

      {activeTab === 'personnel' && userProfile?.role === 'admin' && (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
          <AdminPersonnelMatrix 
            personnel={livePersonnel} 
            entryPoints={entryPoints} 
            onDispatch={(staff) => setIsDispatchModalOpen(staff.uid)} 
          />
        </div>
      )}

      {activeTab === 'ai' && userProfile?.role === 'admin' && (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
           <div className="bg-gradient-to-br from-indigo-900/40 to-slate-900 border border-indigo-500/30 rounded-3xl p-8 shadow-2xl relative overflow-hidden group">
              <div className="relative z-10">
                 <div className="flex items-center justify-between mb-8">
                    <div className="flex items-center space-x-3">
                       <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center shadow-lg"><Brain className="text-white" size={20} /></div>
                       <div><h4 className="text-xl font-black text-white tracking-tight italic uppercase">Tactical Advisory</h4><p className="text-indigo-400 text-[10px] font-bold uppercase tracking-widest">Powered by Gemini 2.5 Flash</p></div>
                    </div>
                    <button onClick={fetchAIAdvice} className="bg-indigo-500/20 hover:bg-indigo-500/40 text-indigo-400 px-6 py-2 rounded-xl text-xs font-bold transition-all border border-indigo-500/20 flex items-center space-x-2"><RefreshCw size={14} className={isAiLoading ? 'animate-spin' : ''} /><span>RESCAN SYSTEM PULSE</span></button>
                 </div>
                 {isAiLoading ? (
                   <div className="grid grid-cols-1 md:grid-cols-2 gap-4">{[1,2].map(i => <div key={i} className="h-32 bg-slate-800/50 rounded-2xl animate-pulse" />)}</div>
                 ) : aiRecommendations.length === 0 ? (
                   <p className="text-center py-8 text-indigo-300/40 italic text-sm">Optimal staff distribution detected.</p>
                 ) : (
                   <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {aiRecommendations.map((rec, idx) => (
                        <div key={idx} className="bg-slate-900/80 border border-indigo-500/20 p-6 rounded-2xl hover:border-indigo-400/50 transition-all">
                           <p className="text-white font-black text-lg mb-1">{rec.staff_name}</p>
                           <p className="text-slate-400 text-xs mb-4 uppercase tracking-widest">Target: <span className="text-indigo-400 font-bold">{entryPoints[rec.target_gate_id]?.label || rec.target_gate_id}</span></p>
                           <div className="p-4 bg-indigo-600/10 rounded-2xl border border-indigo-500/10 mb-6 font-medium italic text-[11px] text-slate-300">"{rec.reason}"</div>
                           <button onClick={() => handleDispatch(rec.staff_uid, rec.target_gate_id, rec.reason)} className="w-full bg-indigo-600 hover:bg-indigo-500 text-white py-3 rounded-xl text-xs font-black shadow-lg shadow-indigo-900/40 transition-all active:scale-95">EXECUTE REDIRECT</button>
                        </div>
                      ))}
                   </div>
                 )}
              </div>
           </div>
        </div>
      )}

      {/* Dispatch Modal */}
      {isDispatchModalOpen && (
        <div className="fixed inset-0 bg-slate-950/90 backdrop-blur-md z-[100] flex items-center justify-center p-4">
           <div className="bg-slate-900 border border-slate-800 w-full max-w-md rounded-3xl p-8 shadow-2xl animate-in zoom-in-95 duration-200">
              <h3 className="text-2xl font-black mb-2 uppercase italic tracking-tighter">Tactical Redirect</h3>
              <p className="text-slate-500 text-xs font-bold uppercase tracking-widest mb-8">Deploying <span className="text-white">{livePersonnel.find(p => p.uid === isDispatchModalOpen)?.name}</span></p>
              <div className="space-y-3 mb-8 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                 {Object.entries(entryPoints).map(([id, ep]) => (
                   <button key={id} onClick={() => setSelectedGateForDispatch(id)} className={`w-full text-left p-4 rounded-2xl border transition-all flex justify-between items-center group ${selectedGateForDispatch === id ? 'bg-blue-600 border-blue-500 text-white shadow-xl' : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'}`}>
                      <div className="flex flex-col"><span className="font-bold text-sm uppercase italic">{ep.label}</span><span className="text-[10px] opacity-50 uppercase font-black">Station ID: {id}</span></div>
                      <div className={`text-[10px] font-black uppercase ${ep.status === 'high' ? 'text-rose-400' : 'text-slate-500'}`}>{ep.status} Load</div>
                   </button>
                 ))}
              </div>
              <div className="flex gap-4">
                 <button onClick={() => { setIsDispatchModalOpen(null); setSelectedGateForDispatch(null); }} className="flex-1 bg-slate-850 hover:bg-slate-800 text-slate-400 py-4 rounded-2xl font-bold transition-all border border-slate-800 uppercase text-[10px] tracking-widest">ABORT</button>
                 <button disabled={!selectedGateForDispatch} onClick={() => handleDispatch(isDispatchModalOpen, selectedGateForDispatch)} className="flex-1 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white py-4 rounded-2xl font-black text-[10px] tracking-[0.2em] shadow-xl shadow-blue-900/40 transition-all active:scale-95">CONFIRM DISPATCH</button>
              </div>
           </div>
        </div>
      )}

      {/* Toast System */}
      {toast && (
        <div className="fixed bottom-8 right-8 z-[201] animate-in slide-in-from-right-10 duration-500">
           <div className={`px-8 py-4 rounded-2xl shadow-2xl border flex items-center space-x-4 backdrop-blur-xl ${toast.type === 'success' ? 'bg-emerald-500/90 border-emerald-400 text-white' : 'bg-rose-500/90 border-rose-400 text-white'}`}>
              <Shield size={18} className="text-white" />
              <p className="font-black text-[11px] uppercase tracking-widest tracking-tight">{toast.message}</p>
           </div>
        </div>
      )}
    </div>
  );
}
