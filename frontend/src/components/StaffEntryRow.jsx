import React from 'react';
import CrowdBadge from './CrowdBadge';

const StaffEntryRow = ({ entryPoint }) => {
  if (!entryPoint) return null;

  const { label, density = 0, wait_minutes = 0, status = 'low', capacity = 100, current_count = 0 } = entryPoint;
  const densityPercent = Math.round(density * 100);
  
  return (
    <tr className="border-b border-slate-100 dark:border-slate-800/50 hover:bg-slate-50 dark:hover:bg-slate-800/20 transition-colors group">
      <td className="py-5 px-8 font-black text-slate-900 dark:text-white uppercase italic tracking-tighter text-lg">{label}</td>
      <td className="py-5 px-8">
        <div className="flex items-center space-x-4">
          <div className="flex-1 h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden min-w-[140px]">
            <div 
              className={`h-full rounded-full transition-all duration-1000 ${
                status === 'high' ? 'bg-rose-500 shadow-[0_0_12px_rgba(244,63,94,0.4)]' : 
                status === 'moderate' ? 'bg-amber-500 shadow-[0_0_12px_rgba(245,158,11,0.4)]' : 
                'bg-emerald-500 shadow-[0_0_12px_rgba(16,185,129,0.4)]'
              }`}
              style={{ width: `${densityPercent}%` }}
            />
          </div>
          <span className="text-xs font-black text-slate-500 dark:text-slate-400 w-12 text-right">{densityPercent}%</span>
        </div>
      </td>
      <td className="py-5 px-8 text-slate-700 dark:text-slate-300 font-black uppercase text-[10px] tracking-widest leading-none">{wait_minutes} min</td>
      <td className="py-5 px-8">
        <CrowdBadge level={status} />
      </td>
      <td className="py-5 px-8 text-slate-500 dark:text-slate-600 text-[10px] font-black uppercase tracking-widest italic opacity-60">
        {current_count} / {capacity}
      </td>
    </tr>
  );
};

export default StaffEntryRow;
