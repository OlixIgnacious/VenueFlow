/**
 * VenueContext provides global access to the current venue and event configuration.
 * It handles the retrieval, caching (via sessionStorage), and refreshing of 
 * the operational metadata used throughout the attendee and staff dashboards.
 */
import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import axios from 'axios';

const VenueContext = createContext();

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '';

/**
 * Provider component that wraps the application and manages venue/event state.
 * 
 * @param {Object} props - Component props.
 * @param {React.ReactNode} props.children - Child components to be wrapped.
 * @returns {JSX.Element} The decorated provider.
 */
export const VenueProvider = ({ children }) => {
  const [venue, setVenue] = useState(null);
  const [event, setEvent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const location = useLocation();

  // Memoize search params to avoid unnecessary re-renders
  const searchParams = useMemo(() => new URLSearchParams(location.search), [location.search]);

  /**
   * Fetches the venue and event configuration from the backend.
   * 
   * Resolves the target event ID using a hierarchy:
   * 1. The eventId parameter passed to the function.
   * 2. The 'active_event_id' stored in sessionStorage.
   * 3. The backend's default active event.
   * 
   * @param {string|null} eventId - Optional specific event ID to load.
   */
  const fetchConfig = async (eventId = null) => {
    try {
      setLoading(true);
      
      // Update or retrieve the sticky event ID from session storage
      if (eventId) {
        sessionStorage.setItem('active_event_id', eventId);
      } else {
        eventId = sessionStorage.getItem('active_event_id');
      }
      
      const response = await axios.get(`${API_BASE_URL}/api/venue/current`, {
        params: eventId ? { event_id: eventId } : {}
      });
      
      const { venue: venueData, event: eventData } = response.data;

      setVenue(venueData);
      setEvent(eventData);
      setError(null);
    } catch (err) {
      console.error('FetchConfig error:', err);
      setError('Failed to load configuration');
      // If we failed with a sticky ID, clear it so next refresh can recover
      sessionStorage.removeItem('active_event_id');
    } finally {
      setLoading(false);
    }
  };

  /**
   * Monitor URL search parameters for event_id changes.
   * This ensures that the context refreshes automatically when navigating 
   * between different events via the discovery page or direct links.
   */
  // SYNC CONTEXT WITH URL: 
  // This effect ensures that whenever the URL changes (e.g. via navigate), 
  // the global venue context is synchronized.
  useEffect(() => {
    const searchParams = new URLSearchParams(location.search);
    // 1. Check Query Params (?event_id=...)
    const eventIdFromUrl = searchParams.get('event_id');
    
    // 2. Check Path Params (/staff/event/:eventId or similar)
    // We manually parse the path for 'event/' segments as useParams isn't available outside Routes
    const pathSegments = location.pathname.split('/');
    const eventIndex = pathSegments.indexOf('event');
    const eventIdFromPath = eventIndex !== -1 && pathSegments[eventIndex + 1] ? pathSegments[eventIndex + 1] : null;

    const targetEventId = eventIdFromUrl || eventIdFromPath;
    
    console.log(`[VenueContext] URL Change Detected. Target ID: ${targetEventId}, Current State: ${event?.id}`);

    if (targetEventId) {
      if (targetEventId !== event?.id && !error) {
        console.log(`[VenueContext] URL/State mismatch. Syncing to: ${targetEventId}`);
        fetchConfig(targetEventId);
      }
    } else if (!event && !error) {
      // Fetch default/cached if we have nothing in state and no error yet
      console.log('[VenueContext] Initializing default context.');
      fetchConfig(null);
    }
  }, [location.search]);

  return (
    <VenueContext.Provider value={{ venue, event, loading, error, refreshConfig: fetchConfig }}>
      {children}
    </VenueContext.Provider>
  );
};

/**
 * Custom hook to consume the VenueContext.
 * 
 * @throws {Error} If used outside of a VenueProvider.
 * @returns {Object} { venue, event, loading, error, refreshConfig }
 */
export const useVenue = () => {
  const context = useContext(VenueContext);
  if (!context) {
    throw new Error('useVenue must be used within a VenueProvider');
  }
  return context;
};
