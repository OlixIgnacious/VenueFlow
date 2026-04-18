import React from 'react';
import { User, MapPin, Clock, ShieldAlert, CheckCircle2, UserMinus } from 'lucide-react';

export default function AdminPersonnelMatrix({ personnel, entryPoints, onDispatch }) {
  // Sort: Emergency first, then Online, then Offline
  const sortedPersonnel = [...personnel].sort((a, b) => {
    if (a.presence?.status === 'emergency') return -1;
    if (b.presence?.status === 'emergency') return 1;
    if (a.is_online && !b.is_online) return -1;
    if (!a.is_online && b.is_online) return 1;
    return 0;
  });

  const onlineCount = personnel.filter(p => p.is_online).length;
  const emergencyCount = personnel.filter(p => p.presence?.status === 'emergency').length;
  const missingCount = personnel.filter(p => !p.is_online).length;

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <h3 className="text-lg font-black text-white uppercase italic tracking-tight">Tactical Deployment Matrix</h3>
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="p-6 bg-slate-900 border border-slate-800 rounded-2xl shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <p className="text-slate-500 text-xs font-bold uppercase tracking-widest">Active Staff</p>
            <CheckCircle2 size={16} className="text-emerald-500" />
          </div>
          <p className="text-3xl font-black text-white">{onlineCount} <span className="text-sm font-bold text-slate-500">/ {personnel.length}</span></p>
        </div>
        <div className="p-6 bg-slate-900 border border-slate-800 rounded-2xl shadow-sm border-l-4 border-l-rose-500">
          <div className="flex items-center justify-between mb-2">
            <p className="text-slate-500 text-xs font-bold uppercase tracking-widest">Emergencies</p>
            <ShieldAlert size={16} className="text-rose-500" />
          </div>
          <p className="text-3xl font-black text-white">{emergencyCount}</p>
        </div>
        <div className="p-6 bg-slate-900 border border-slate-800 rounded-2xl shadow-sm border-l-4 border-l-amber-500">
          <div className="flex items-center justify-between mb-2">
            <p className="text-slate-500 text-xs font-bold uppercase tracking-widest">Absent / Inactive</p>
            <UserMinus size={16} className="text-amber-500" />
          </div>
          <p className="text-3xl font-black text-white">{missingCount}</p>
        </div>
      </div>

      {/* Personnel Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-xl">
        <div className="p-6 border-b border-slate-800 flex justify-between items-center bg-slate-800/20">
          <h3 className="font-bold text-white flex items-center">
            <User className="mr-2 text-indigo-400" size={18} />
            Tactical Personnel Deployment
          </h3>
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Live Feed</span>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="text-slate-500 text-[10px] font-black uppercase tracking-widest border-b border-slate-800">
                <th className="py-4 px-6">Name</th>
                <th className="py-4 px-6">Location</th>
                <th className="py-4 px-6">Status</th>
                <th className="py-4 px-6">Last Active</th>
                <th className="py-4 px-6 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="text-sm">
              {sortedPersonnel.map((p) => (
                <tr key={p.uid} className="border-b border-slate-800/50 hover:bg-slate-800/30 transition-colors group">
                  <td className="py-4 px-6">
                    <div className="flex items-center space-x-3">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-white shadow-sm ${
                        p.presence?.status === 'emergency' ? 'bg-rose-500' : p.is_online ? 'bg-emerald-600' : 'bg-slate-700'
                      }`}>
                        {p.name.charAt(0)}
                      </div>
                      <div>
                        <p className="font-bold text-slate-200 group-hover:text-white transition-colors">{p.name}</p>
                        <p className="text-[10px] text-slate-500">{p.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="py-4 px-6">
                    <div className="flex items-center space-x-2 text-slate-400">
                      <MapPin size={14} className={p.is_online ? "text-indigo-400" : "text-slate-600"} />
                      <span className="font-medium text-xs">
                        {p.presence?.status === 'in_transit' 
                          ? `Moving to ${entryPoints[p.presence.target_gate_id]?.label || p.presence.target_gate_id}`
                          : p.presence?.current_gate_id ? (entryPoints[p.presence.current_gate_id]?.label || p.presence.current_gate_id) : 'Not Assigned'
                        }
                      </span>
                    </div>
                  </td>
                  <td className="py-4 px-6">
                    <div className={`inline-flex px-2.5 py-1 rounded text-[10px] font-black uppercase tracking-tighter ${
                      p.presence?.status === 'emergency' ? 'bg-rose-500 text-white animate-pulse' :
                      p.presence?.status === 'in_transit' ? 'bg-indigo-500/20 text-indigo-400 border border-indigo-500/40 animate-pulse' :
                      p.presence?.status === 'dispatched' ? 'bg-amber-600/20 text-amber-400 border border-amber-600/40' :
                      p.presence?.status === 'declined' ? 'bg-rose-900/40 text-rose-400 border border-rose-500/20' :
                      p.is_online ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 
                      'bg-slate-800 text-slate-500 border border-slate-700'
                    }`}>
                      {p.presence?.status || (p.is_online ? 'active' : 'offline')}
                    </div>
                  </td>
                  <td className="py-4 px-6">
                    <div className="flex items-center space-x-2 text-slate-500 text-xs">
                      <Clock size={12} />
                      <span>{p.last_reported ? new Date(p.last_reported).toLocaleTimeString() : 'N/A'}</span>
                    </div>
                  </td>
                  <td className="py-4 px-6 text-right">
                    {p.is_online && (
                      <button 
                        onClick={() => onDispatch(p)}
                        className="px-4 py-1.5 bg-indigo-600/10 hover:bg-indigo-600 text-indigo-400 hover:text-white border border-indigo-500/20 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all active:scale-95"
                      >
                        Redeploy
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        
        {personnel.length === 0 && (
          <div className="p-12 text-center text-slate-500 italic border-t border-slate-800">
            No personnel assigned to this event.
          </div>
        )}
      </div>
    </div>
  );
}
