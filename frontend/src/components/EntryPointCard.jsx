import React from 'react';
import CrowdBadge from './CrowdBadge';
import { Clock, Info, ShieldAlert } from 'lucide-react';

const EntryPointCard = ({ label, wait_minutes, status, reason, tip, isRecommended = false }) => {
  return (
    <div className={`p-6 rounded-3xl border transition-all ${
      isRecommended 
        ? "bg-white dark:bg-slate-900 border-blue-500/50 shadow-[0_10px_40px_-15px_rgba(59,130,246,0.2)] dark:shadow-[0_0_40px_-15px_rgba(59,130,246,0.3)]" 
        : "bg-white dark:bg-slate-900/40 border-slate-200 dark:border-slate-800 shadow-sm"
    }`}>
      <div className="flex justify-between items-start mb-4">
        <div>
          <h3 className="text-xl font-bold tracking-tight text-slate-900 dark:text-slate-100">{label}</h3>
          <div className="flex items-center text-slate-500 dark:text-slate-400 text-sm mt-1">
            <Clock size={14} className="mr-1" />
            <span>{wait_minutes} min wait</span>
          </div>
        </div>
        <CrowdBadge level={status} />
      </div>

      <div className="space-y-4">
        <div className="flex items-start bg-blue-50 dark:bg-blue-500/5 p-4 rounded-2xl border border-blue-100 dark:border-blue-500/10">
          <Info size={18} className="text-blue-600 dark:text-blue-400 mr-3 mt-1 flex-shrink-0" />
          <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
            {reason}
          </p>
        </div>

        {tip && (
          <div className="flex items-center text-emerald-600 dark:text-emerald-400 text-sm px-1">
            <ShieldAlert size={16} className="mr-2" />
            <span>{tip}</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default EntryPointCard;
