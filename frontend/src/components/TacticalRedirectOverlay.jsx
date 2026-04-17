import React from 'react';
import { ShieldAlert, MapPin, CheckCircle, XCircle, ArrowRight, Brain } from 'lucide-react';

/**
 * TacticalRedirectOverlay
 * 
 * A high-priority, full-screen interruptor for staff field units.
 * Triggered when an Admin sends a 'dispatched' order via RTDB.
 */
export default function TacticalRedirectOverlay({ 
  dispatch, 
  entryPoints, 
  onAccept, 
  onDecline 
}) {
  if (!dispatch) return null;

  const targetGate = entryPoints[dispatch.target_gate_id] || { label: 'Unspecified Terminal' };

  return (
    <div className="fixed inset-0 z-[999] bg-slate-950/95 backdrop-blur-xl flex items-center justify-center p-6 animate-in fade-in duration-300">
      {/* Tactical Glow Effect */}
      <div className="absolute inset-0 bg-indigo-500/10 animate-pulse pointer-events-none" />
      
      <div className="w-full max-w-xl bg-slate-900 border-2 border-indigo-500/50 rounded-[2.5rem] p-10 shadow-[0_0_100px_rgba(79,70,229,0.3)] relative overflow-hidden">
        {/* Dynamic Background Pattern */}
        <div className="absolute top-0 right-0 p-8 opacity-5">
           <Brain size={240} className="text-indigo-400 rotate-12" />
        </div>

        <div className="relative z-10 flex flex-col items-center text-center">
           <div className="w-20 h-20 bg-indigo-600 rounded-3xl flex items-center justify-center shadow-2xl shadow-indigo-900/50 mb-8 border border-indigo-400/30">
              <ShieldAlert size={40} className="text-white animate-bounce-short" />
           </div>

           <h2 className="text-3xl font-black text-white tracking-tight uppercase italic mb-2">Tactical Redirect</h2>
           <p className="text-indigo-300/60 text-xs font-black uppercase tracking-[0.2em] mb-10">Command Center Directive</p>

           {/* Route Visualization */}
           <div className="w-full flex items-center justify-between bg-slate-950/50 rounded-3xl p-6 border border-slate-800 mb-8">
              <div className="flex-1">
                 <p className="text-[10px] font-black text-slate-500 uppercase mb-1">Current</p>
                 <p className="text-lg font-bold text-slate-300">Field Duty</p>
              </div>
              <div className="px-4">
                 <ArrowRight className="text-indigo-500" />
              </div>
              <div className="flex-1">
                 <p className="text-[10px] font-black text-indigo-400 uppercase mb-1">Destination</p>
                 <p className="text-lg font-black text-white">{targetGate.label}</p>
              </div>
           </div>

           {/* Admin Reasoning */}
           <div className="w-full bg-indigo-500/5 border border-indigo-500/20 rounded-2xl p-6 mb-10">
              <p className="text-slate-400 text-sm leading-relaxed italic">
                 "{dispatch.message || 'Immediate redeployment required for optimal crowd flow management.'}"
              </p>
              <div className="mt-4 flex items-center justify-center space-x-2">
                 <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                 <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Verified by AI Dispatcher</span>
              </div>
           </div>

           {/* Actions */}
           <div className="flex flex-col w-full gap-4">
              <button 
                onClick={onAccept}
                className="w-full bg-indigo-600 hover:bg-indigo-500 text-white py-5 rounded-2xl font-black text-sm tracking-widest shadow-xl shadow-indigo-900/40 transition-all active:scale-[0.98] group flex items-center justify-center space-x-3"
              >
                 <MapPin size={18} className="group-hover:animate-ping" />
                 <span>START TACTICAL TRANSIT</span>
              </button>
              
              <button 
                onClick={onDecline}
                className="w-full bg-slate-850 hover:bg-rose-500/10 text-slate-500 hover:text-rose-400 py-4 rounded-2xl font-bold text-xs transition-all border border-slate-800 hover:border-rose-500/20 flex items-center justify-center space-x-2"
              >
                 <XCircle size={14} />
                 <span>DECLINE (LOCAL EMERGENCY)</span>
              </button>
           </div>
        </div>
      </div>
    </div>
  );
}
