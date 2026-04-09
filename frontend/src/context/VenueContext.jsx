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
      const url = eventId 
        ? `${API_BASE_URL}/api/events/list` // In a real app, this would be /api/events/{id}
        : `${API_BASE_URL}/api/venue/current`;
      
      const response = await axios.get(url);
      
      // If eventId provided, we filter from the list for now (mocking specific endpoint)
      const data = eventId ? { 
        event: { ...response.data[eventId], id: eventId }, 
        venue: await axios.get(`${API_BASE_URL}/api/venue/current`).then(r => r.data.venue) // Placeholder for venue fetch
      } : response.data;

      setVenue(data.venue);
      setEvent(data.event);
      setError(null);
    } catch (err) {
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
