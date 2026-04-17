import React, { useState } from 'react';
import { X, ShieldAlert, Heart, Users, Wrench, AlertTriangle, Send, Shield } from 'lucide-react';
import { rtdb, auth } from '../services/firebase';
import { push, ref as dbRef, set } from 'firebase/database';
import { useAuth } from '../context/AuthContext';

const INCIDENT_TYPES = [
  { id: 'security', label: 'Alpha (Security)', icon: ShieldAlert, color: 'rose' },
  { id: 'medical', label: 'Medical Emergency', icon: Heart, color: 'orange' },
  { id: 'surge', label: 'Crowd Surge', icon: Users, color: 'amber' },
  { id: 'technical', label: 'Technical Failure', icon: Wrench, color: 'blue' },
];

const SEVERITY_LEVELS = [
  { id: 'alpha', label: 'Critical (Alpha)', color: 'bg-rose-500', text: 'text-rose-500' },
  { id: 'bravo', label: 'Urgent (Bravo)', color: 'bg-orange-500', text: 'text-orange-500' },
  { id: 'charlie', label: 'Standard (Charlie)', color: 'bg-blue-500', text: 'text-blue-500' },
];

export default function IncidentReportModal({ isOpen, onClose, eventId, staffMember, currentGateId, gateLabel }) {
  const { userProfile } = useAuth();
  const [type, setType] = useState('security');
  const [severity, setSeverity] = useState('bravo');
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!eventId || !staffMember) return;

    setIsSubmitting(true);
    try {
      const incidentRef = push(dbRef(rtdb, `incidents/${eventId}`));
      await set(incidentRef, {
        type,
        severity,
        description,
        staff_uid: staffMember.uid || auth.currentUser?.uid,
        staff_name: staffMember.name || userProfile?.name || 'Staff Member',
        gate_id: currentGateId || 'UNASSIGNED',
        gate_label: gateLabel || 'Field Reporting',
        timestamp: new Date().toISOString(),
        status: 'active',
      });
      onClose();
    } catch (err) {
      console.error('Incident report failed:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-950/90 backdrop-blur-md z-[100] flex items-center justify-center p-4">
      <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-[2.5rem] shadow-2xl overflow-hidden relative animate-in zoom-in-95 duration-300">
        {/* Tactical Header */}
        <div className="bg-gradient-to-r from-slate-900 to-slate-800 px-8 py-6 border-b border-slate-800 flex justify-between items-center">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-indigo-600/20 rounded-xl flex items-center justify-center border border-indigo-500/20">
              <ShieldAlert className="text-indigo-400" size={20} />
            </div>
            <div>
              <h2 className="text-xl font-black text-white tracking-tighter uppercase italic">Incident Report</h2>
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{gateLabel || 'Field Location'}</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="w-10 h-10 rounded-full hover:bg-slate-800 flex items-center justify-center text-slate-400 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-8 space-y-8">
          {/* Incident Type Selector */}
          <div className="space-y-4">
            <label className="text-xs font-black text-slate-500 uppercase tracking-widest flex items-center">
              <AlertTriangle size={14} className="mr-2 text-amber-500" />
              1. Incident Classification
            </label>
            <div className="grid grid-cols-2 gap-3">
              {INCIDENT_TYPES.map((it) => {
                const Icon = it.icon;
                const isActive = type === it.id;
                return (
                  <button
                    key={it.id}
                    type="button"
                    onClick={() => setType(it.id)}
                    className={`flex items-center space-x-3 p-4 rounded-2xl border transition-all text-left ${
                      isActive 
                        ? 'bg-slate-800 border-indigo-500 text-white shadow-lg' 
                        : 'bg-slate-950/50 border-slate-800 text-slate-500 hover:border-slate-700'
                    }`}
                  >
                    <div className={`p-2 rounded-lg ${isActive ? 'bg-indigo-600 text-white' : 'bg-slate-900 text-slate-500'}`}>
                      <Icon size={18} />
                    </div>
                    <span className="font-bold text-xs uppercase tracking-tight">{it.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Severity Levels */}
          <div className="space-y-4">
            <label className="text-xs font-black text-slate-500 uppercase tracking-widest flex items-center">
              <Shield size={14} className="mr-2 text-indigo-500" />
              2. Tactical Severity
            </label>
            <div className="flex bg-slate-950 p-1 rounded-2xl border border-slate-800">
              {SEVERITY_LEVELS.map((sl) => {
                const isActive = severity === sl.id;
                return (
                  <button
                    key={sl.id}
                    type="button"
                    onClick={() => setSeverity(sl.id)}
                    className={`flex-1 py-3 px-2 rounded-xl text-[10px] font-black uppercase tracking-tighter transition-all ${
                      isActive 
                        ? `${sl.color} text-white shadow-lg shadow-black/40` 
                        : `text-slate-600 hover:text-slate-400`
                    }`}
                  >
                    {sl.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Description */}
          <div className="space-y-3">
            <label className="text-xs font-black text-slate-500 uppercase tracking-widest">3. Brief Intelligence Note</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Provide tactical context (e.g., '3 individuals non-compliant at turnstile A')."
              rows={3}
              required
              className="w-full bg-slate-950 border border-slate-800 rounded-3xl p-5 text-sm text-slate-200 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all placeholder:text-slate-700 resize-none"
            />
          </div>

          <button
            type="submit"
            disabled={isSubmitting || !description}
            className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white py-5 rounded-[1.5rem] font-black uppercase tracking-widest shadow-xl shadow-indigo-900/40 flex items-center justify-center space-x-3 transition-all active:scale-95 group"
          >
            {isSubmitting ? (
              <AlertTriangle className="animate-spin" size={20} />
            ) : (
              <>
                <Send size={18} className="group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
                <span>Transmit Report</span>
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
