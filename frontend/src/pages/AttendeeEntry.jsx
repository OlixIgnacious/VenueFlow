import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useVenue } from '../context/VenueContext';
import { MapPin, ArrowRight, Loader2, QrCode, CheckCircle2, Ticket as TicketIcon } from 'lucide-react';
import axios from 'axios';
import TicketScanner from '../components/TicketScanner';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '';

/**
 * Attendee Entry Page.
 * 
 * The primary interface for attendees reaching the venue. 
 * Allows users to either scan their digital ticket for automatic seat 
 * detection or manually enter their seat/section reference.
 * 
 * Features:
 * - Ticket validation via the backend API.
 * - Integration with the TicketScanner component.
 * - Redirection to the Recommendation page with extracted seating metadata.
 * 
 * @returns {JSX.Element} The Attendee Entry page.
 */
const AttendeeEntry = () => {
  const { venue, event, loading, error } = useVenue();
  const [searchParams] = useSearchParams();
  const [refValue, setRefValue] = useState('');
  const [showScanner, setShowScanner] = useState(false);
  const [ticket, setTicket] = useState(null);
  const navigate = useNavigate();
  const { refreshConfig } = useVenue();

  /**
   * Defensive Synchronization:
   * Ensures the page context matches the URL param.
   */
  useEffect(() => {
    const eventIdFromUrl = searchParams.get('event_id');
    if (eventIdFromUrl && event && event.id !== eventIdFromUrl) {
      console.log(`[AttendeeEntry] Context Mismatch! URL=${eventIdFromUrl}, Context=${event.id}. Syncing...`);
      refreshConfig(eventIdFromUrl);
    }
  }, [searchParams, event, refreshConfig]);

  /**
   * Navigates to the recommendation page using the provided location reference.
   * 
   * @param {string|null} customRef - Optional reference override (e.g., from a ticket).
   */
  const handleFindEntry = (customRef = null) => {
    const finalRef = customRef || refValue;
    if (!finalRef) return;
    
    // CRITICAL: Preserve the event context in the URL when navigating
    const eventId = searchParams.get('event_id') || event?.id;
    const url = `/recommendation?ref=${encodeURIComponent(finalRef)}${eventId ? `&event_id=${eventId}` : ''}`;
    
    console.log(`[AttendeeEntry] Navigating to: ${url}`);
    navigate(url);
  };

  /**
   * Processes a successful ticket scan.
   * Fetches ticket validity from the backend and extracts the seating reference.
   * 
   * @param {string} ticketId - The scanned ticket identifier.
   * @throws {Error} If the ticket is invalid or belongs to another event.
   */
  const handleTicketScan = async (ticketId) => {
    try {
      const response = await axios.get(`${API_BASE_URL}/api/tickets/${ticketId}`);
      const ticketData = response.data;
      
      setTicket(ticketData);
      setRefValue(ticketData.location_ref);
      setShowScanner(false);
      
      // Auto-navigate after a short delay to show the "Success" state to the user
      setTimeout(() => {
        handleFindEntry(ticketId); // Use the full ticket ID as the reference for better backend lookup
      }, 1500);

    } catch (err) {
      const errorMsg = err.response?.data?.detail || err.message;
      console.error(`[AttendeeEntry] Ticket Scan Error: ${errorMsg}`);
      throw new Error(errorMsg || "Invalid Ticket ID for this event");
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen space-y-4">
        <Loader2 className="w-12 h-12 text-blue-500 animate-spin" />
        <p className="text-slate-400 font-medium">Loading session details...</p>
      </div>
    );
  }

  if (error || !venue) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen text-center p-6 space-y-6">
        <div className="bg-red-500/10 p-4 rounded-full">
           <MapPin className="text-red-400" size={48} />
        </div>
        <div className="space-y-2">
          <h2 className="text-2xl font-bold text-red-400">Context Missing</h2>
          <p className="text-slate-400 max-w-xs mx-auto">We couldn't link your session to an active event. Please try selecting one from the Discovery page.</p>
        </div>
        <button onClick={() => navigate('/')} className="bg-slate-800 px-6 py-3 rounded-2xl font-bold hover:bg-slate-700 transition-colors">Return to Discovery</button>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-6 relative overflow-hidden">
      <button 
        onClick={() => navigate('/')}
        className="absolute top-6 right-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-3 rounded-full shadow-lg hover:shadow-xl hover:text-blue-500 transition-all z-20 group"
        title="Return to Discovery"
      >
        <Navigation size={20} className="group-hover:rotate-12 transition-transform" />
      </button>

      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-blue-600/10 blur-[120px] rounded-full -z-10" />
      
      <div className="max-w-md w-full p-8 glass rounded-3xl space-y-8 animate-in fade-in slide-in-from-bottom-8 duration-700">
        <div className="text-center space-y-2">
          <div className="flex items-center justify-center space-x-2 text-blue-400 font-semibold uppercase tracking-widest text-xs">
            <MapPin size={14} />
            <span>{venue.name}</span>
          </div>
          <h1 
            onClick={() => navigate('/')}
            className="text-4xl font-bold tracking-tight cursor-pointer hover:text-blue-500 transition-colors"
          >
            Venue<span className="text-blue-500">Flow</span>
          </h1>
          <p className="text-slate-400">
            Entry routing for <span className="text-slate-100 font-medium italic">{event.name}</span>
          </p>
        </div>

        {ticket ? (
          <div className="p-6 bg-blue-600/10 border border-blue-500/20 rounded-2xl space-y-4 animate-in zoom-in-95">
             <div className="flex items-center space-x-3 text-blue-400">
                <CheckCircle2 size={24} />
                <span className="font-bold">Ticket Validated!</span>
             </div>
             <div className="space-y-1">
                <p className="text-xs text-slate-500 uppercase font-bold tracking-widest">Reserved Location</p>
                <p className="text-2xl font-bold">{ticket.location_ref}</p>
             </div>
             <div className="flex items-center justify-between text-sm text-slate-400">
                <span>{ticket.persons} {ticket.persons === 1 ? 'Person' : 'Persons'}</span>
                <span className="font-mono text-xs">{ticket.id}</span>
             </div>
             <div className="pt-2 flex items-center space-x-2 text-blue-400 text-xs font-medium">
                <Loader2 size={12} className="animate-spin" />
                <span>Redirecting to best entry path...</span>
             </div>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="space-y-4">
              <button 
                onClick={() => setShowScanner(true)}
                className="w-full bg-slate-100 text-slate-950 hover:bg-white font-bold py-6 px-6 rounded-2xl flex items-center justify-center space-x-3 transition-all active:scale-95 shadow-xl shadow-blue-500/5 group"
              >
                <QrCode size={24} className="group-hover:rotate-12 transition-transform" />
                <div className="text-left">
                   <p className="text-lg leading-none">Scan My Ticket</p>
                   <p className="text-[10px] uppercase tracking-tighter opacity-60">Automatic seat detection</p>
                </div>
              </button>
              
              <div className="relative flex items-center py-2">
                <div className="flex-grow border-t border-slate-800"></div>
                <span className="flex-shrink mx-4 text-slate-600 text-xs uppercase font-bold tracking-widest">Or enter manually</span>
                <div className="flex-grow border-t border-slate-800"></div>
              </div>
 
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-widest text-slate-500 px-1">
                  Your {venue.location_ref_label}
                </label>
                <input
                  type="text"
                  placeholder="e.g. Block B, Zone 3..."
                  value={refValue}
                  onChange={(e) => setRefValue(e.target.value)}
                  className="w-full bg-slate-900/50 border border-slate-700 rounded-2xl px-6 py-4 outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all text-xl"
                />
              </div>
 
              <button
                onClick={() => handleFindEntry()}
                disabled={!refValue}
                className="w-full bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-4 px-6 rounded-2xl flex items-center justify-center space-x-2 transition-all group active:scale-95"
              >
                <span>Find My {venue.entry_label}</span>
                <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
              </button>
            </div>
          </div>
        )}
 
        <div className="pt-4 text-center">
          <p className="text-xs text-slate-500 uppercase tracking-widest font-medium">
            Powered by Gemini 2.5 Flash
          </p>
        </div>
      </div>

      {showScanner && (
        <TicketScanner 
          onScan={handleTicketScan} 
          onClose={() => setShowScanner(false)} 
          event_id={event.id}
        />
      )}
    </div>
  );
};

export default AttendeeEntry;
