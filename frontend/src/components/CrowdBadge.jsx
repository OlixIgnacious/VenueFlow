import React from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

const CrowdBadge = ({ level }) => {
  const styles = {
    low: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
    moderate: "bg-amber-500/10 text-amber-400 border-amber-500/20",
    high: "bg-rose-500/10 text-rose-400 border-rose-500/20"
  };

  return (
    <span 
      className={twMerge(
        "px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider border",
        styles[level] || styles.low
      )}
      aria-label={`Crowd density: ${level}`}
    >
      <span className="sr-only">Status: </span>
      {level || "low"}
    </span>
  );
};

export default CrowdBadge;
