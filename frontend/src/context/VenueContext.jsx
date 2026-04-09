import React, { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';

const VenueContext = createContext();

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

export const VenueProvider = ({ children }) => {
  const [venue, setVenue] = useState(null);
  const [event, setEvent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchConfig = async (eventId = null) => {
    try {
      setLoading(true);
      
      // Retrieval hierarchy: 1. Manual param, 2. sessionStorage, 3. Backend default
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
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const eventId = params.get('event_id');
    fetchConfig(eventId);
  }, []);

  return (
    <VenueContext.Provider value={{ venue, event, loading, error, refreshConfig: fetchConfig }}>
      {children}
    </VenueContext.Provider>
  );
};

export const useVenue = () => {
  const context = useContext(VenueContext);
  if (!context) {
    throw new Error('useVenue must be used within a VenueProvider');
  }
  return context;
};
