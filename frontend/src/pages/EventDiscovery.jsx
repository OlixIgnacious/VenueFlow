import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Search, Calendar, MapPin, ArrowRight, Loader2, IndianRupee } from 'lucide-react';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '';

/**
 * Event Discovery Page.
 * 
 * Provides a landing interface for attendees to search for and select 
 * their specific event. This selection sets the context for the 
 * rest of the entry experience.
 * 
 * Functions:
 * - Fetches all active events from the backend.
 * - Provides real-time filtering by name and type.
 * - Navigates to the Attendee Entry page with the selected event context.
 * 
 * @returns {JSX.Element} The Event Discovery page.
 */
const EventDiscovery = () => {
  const [events, setEvents] = useState({});
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  /**
   * Fetches the complete list of available events on mount.
   */
  useEffect(() => {
    const fetchEvents = async () => {
      try {
        const response = await axios.get(`${API_BASE_URL}/api/events/list`);
        setEvents(response.data);
      } catch (error) {
        console.error("Failed to fetch events:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchEvents();
  }, []);

  /**
   * Filters the master event list based on the user's search input.
   */
  const filteredEvents = Object.entries(events).filter(([id, event]) => 
    event.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    event.type.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <Loader2 className="w-12 h-12 text-blue-500 animate-spin" />
        <p className="mt-4 text-slate-400">Discovering events...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-6 md:p-12 max-w-6xl mx-auto space-y-12">
      <div className="space-y-4 text-center border-b border-slate-200 dark:border-slate-800 pb-12">
        <h1 className="text-5xl font-bold tracking-tight text-slate-900 dark:text-slate-100">Find Your <span className="text-blue-600 dark:text-blue-500">Event</span></h1>
        <p className="text-slate-600 dark:text-slate-400 text-lg max-w-2xl mx-auto font-medium">
          Select your event to access smart routing and crowd intelligence recommendations.
        </p>
      </div>

      <div className="relative max-w-2xl mx-auto">
        <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500" size={24} />
        <input 
          type="text" 
          placeholder="Search by name, sport, or type..." 
          className="w-full bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-3xl py-6 pl-16 pr-8 text-xl outline-none focus:ring-2 focus:ring-blue-500/50 transition-all text-slate-900 dark:text-slate-100 shadow-sm"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {filteredEvents.map(([id, event]) => (
          <div 
            key={id} 
            onClick={() => navigate(`/entry?event_id=${id}`)}
            className="group bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl overflow-hidden cursor-pointer hover:border-blue-500/50 transition-all hover:translate-y-[-4px] shadow-md hover:shadow-xl"
          >
            <div className="h-48 bg-slate-100 dark:bg-slate-800 relative">
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 to-transparent opacity-60 dark:opacity-80" />
              <div className="absolute bottom-6 left-6 right-6">
                 <span className="bg-blue-600 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-widest text-white shadow-lg">{event.type.replace('_', ' ')}</span>
                 <h2 className="text-xl font-bold mt-2 leading-tight text-white">{event.name}</h2>
              </div>
            </div>
            <div className="p-6 space-y-4">
              <div className="space-y-2">
                <div className="flex items-center text-slate-500 dark:text-slate-400 text-sm space-x-2">
                  <Calendar size={14} />
                  <span>{new Date(event.start_time).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</span>
                </div>
                <div className="flex items-center text-slate-500 dark:text-slate-400 text-sm space-x-2">
                  <MapPin size={14} />
                  <span>{event.venue_name || 'Venue TBD'}</span>
                </div>
              </div>
              <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-blue-600 dark:text-blue-400 font-bold">
                <span>Access Dashboard</span>
                <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default EventDiscovery;
