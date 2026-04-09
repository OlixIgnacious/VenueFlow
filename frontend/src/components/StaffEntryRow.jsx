import React from 'react';
import CrowdBadge from './CrowdBadge';

const StaffEntryRow = ({ label, density, waitMinutes, status, capacity, currentCount }) => {
  const densityPercent = Math.round(density * 100);
  
  return (
    <tr className="border-b border-slate-800/50 hover:bg-slate-800/20 transition-colors group">
      <td className="py-4 px-4 font-bold text-slate-200">{label}</td>
      <td className="py-4 px-4">
        <div className="flex items-center space-x-3">
          <div className="flex-1 h-2 bg-slate-800 rounded-full overflow-hidden min-w-[100px]">
            <div 
              className={`h-full rounded-full transition-all duration-1000 ${
                status === 'high' ? 'bg-rose-500' : status === 'moderate' ? 'bg-amber-500' : 'bg-emerald-500'
              }`}
              style={{ width: `${densityPercent}%` }}
            />
          </div>
          <span className="text-sm font-mono text-slate-400 w-10 text-right">{densityPercent}%</span>
        </div>
      </td>
      <td className="py-4 px-4 text-slate-300 font-medium">{waitMinutes} min</td>
      <td className="py-4 px-4">
        <CrowdBadge level={status} />
      </td>
      <td className="py-4 px-4 text-slate-400 text-sm">
        {currentCount} / {capacity}
      </td>
    </tr>
  );
};

export default StaffEntryRow;
