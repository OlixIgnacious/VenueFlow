import React, { useState, useEffect } from 'react';
import { QrCode, X, Search, CheckCircle2, Loader2 } from 'lucide-react';

const TicketScanner = ({ onScan, onClose, event_id }) => {
  const [typingId, setTypingId] = useState('');
  const [validating, setValidating] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    const originalFocus = document.activeElement;
    const modal = document.querySelector('[role="dialog"]');
    if (modal) {
      const focusableSelectors = 'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';
      const focusableElements = modal.querySelectorAll(focusableSelectors);
      if (focusableElements.length > 0) {
        focusableElements[0].focus();
      }
    }

    const handleKeydown = (e) => {
      if (e.key === 'Escape') onClose();
      
      if (e.key === 'Tab' && modal) {
        const focusableSelectors = 'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';
        const focusableElements = Array.from(modal.querySelectorAll(focusableSelectors));
        const firstElement = focusableElements[0];
        const lastElement = focusableElements[focusableElements.length - 1];

        if (e.shiftKey) { // Shift + Tab
          if (document.activeElement === firstElement) {
            lastElement.focus();
            e.preventDefault();
          }
        } else { // Tab
          if (document.activeElement === lastElement) {
            firstElement.focus();
            e.preventDefault();
          }
        }
      }
    };

    window.addEventListener('keydown', handleKeydown);
    return () => {
      window.removeEventListener('keydown', handleKeydown);
      if (originalFocus && typeof originalFocus.focus === 'function') {
        originalFocus.focus();
      }
    };
  }, [onClose]);

  const handleSimulateScan = (id) => {
    setTypingId(id);
    handleConfirm(id);
  };

  const handleConfirm = async (idToUse) => {
    const id = idToUse || typingId;
    if (!id) return;

    setValidating(true);
    setError(null);
    try {
      // Small artificial delay for "scanning" feel
      await new Promise(r => setTimeout(r, 800));
      await onScan(id);
    } catch (err) {
      setError(err.message || 'Invalid Ticket ID for this event');
    } finally {
      setValidating(false);
    }
  };

  const sampleIds = event_id === 'event_001'
    ? ['IND-AUS-101', 'IND-AUS-102', 'IND-AUS-103', 'IND-AUS-104', 'IND-AUS-105', 'IND-AUS-VIP-01']
    : ['TECH-SUMMIT-01', 'TECH-SUMMIT-02', 'TECH-SUMMIT-03', 'TECH-SUMMIT-04', 'TECH-SUMMIT-05', 'TECH-SUMMIT-SPEAKER-01'];

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-300"
      role="dialog"
      aria-modal="true"
      aria-labelledby="scanner-title"
    >
      <div className="w-full max-w-md glass rounded-3xl overflow-hidden shadow-2xl animate-in zoom-in-95 duration-300">
        <div className="p-6 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <QrCode className="text-blue-500" size={20} />
            <h3 id="scanner-title" className="font-bold text-lg">Ticket Scanner</h3>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-800 rounded-full transition-colors">
            <X size={20} className="text-slate-400" />
          </button>
        </div>

        <div className="p-8 space-y-8">
          <div className="relative aspect-square max-w-[240px] mx-auto border-2 border-dashed border-slate-700 rounded-3xl flex items-center justify-center group overflow-hidden">
            <div className="absolute inset-0 bg-blue-500/5 group-hover:bg-blue-500/10 transition-colors" />
            <div className="relative flex flex-col items-center space-y-4">
              <QrCode size={80} className="text-slate-600 group-hover:text-blue-400 transition-colors" />
              <p className="text-xs text-slate-500 font-medium uppercase tracking-widest text-center">Position QR Code <br/> in the frame</p>
            </div>
            {/* Scanning Line Animation */}
            <div className="absolute top-0 left-0 w-full h-1 bg-blue-500/50 shadow-[0_0_15px_rgba(59,130,246,0.5)] animate-scan" />
          </div>

          <div className="space-y-4">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
              <input 
                type="text" 
                placeholder="Or type Ticket ID manually..." 
                className="w-full bg-slate-900/80 border border-slate-700 rounded-2xl py-4 pl-12 pr-4 text-center outline-none focus:ring-2 focus:ring-blue-500/50 transition-all font-mono"
                value={typingId}
                onChange={(e) => setTypingId(e.target.value)}
              />
            </div>

            <button
               onClick={() => handleConfirm()}
               disabled={!typingId || validating}
               className="w-full bg-blue-600 hover:bg-blue-500 disabled:opacity-50 py-4 rounded-2xl font-bold flex items-center justify-center space-x-2 transition-all"
            >
              {validating ? <Loader2 className="animate-spin" size={20} /> : <span>Confirm Ticket</span>}
            </button>
          </div>

          <div className="space-y-3">
            <p className="text-xs text-slate-500 uppercase font-bold tracking-widest text-center">Simulation Examples</p>
            <div className="flex flex-wrap gap-2 justify-center">
              {sampleIds.map(id => (
                <button 
                  key={id}
                  onClick={() => handleSimulateScan(id)}
                  className="text-xs bg-slate-800 hover:bg-slate-700 px-3 py-2 rounded-xl transition-colors font-mono"
                >
                  Scan {id}
                </button>
              ))}
            </div>
          </div>
        </div>

        {error && (
          <div className="p-4 bg-red-500/10 border-t border-red-500/20 text-red-400 text-sm text-center font-medium">
            {error}
          </div>
        )}
      </div>
      
      <style>{`
        @keyframes scan {
          0% { top: 0; }
          100% { top: 100%; }
        }
        .animate-scan {
          animation: scan 2s linear infinite;
        }
      `}</style>
    </div>
  );
};

export default TicketScanner;
