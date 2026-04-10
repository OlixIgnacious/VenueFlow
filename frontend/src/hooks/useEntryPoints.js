/**
 * Custom hook to subscribe to real-time entry point density updates from Firebase.
 * 
 * @param {string} eventId - The unique ID of the event to monitor.
 * @returns {Object} { entryPoints, loading } - Real-time gate data and loading state.
 */
import { useState, useEffect } from 'react';
import { ref, onValue } from 'firebase/database';
import { rtdb } from '../services/firebase';

export const useEntryPoints = (eventId) => {
  const [entryPoints, setEntryPoints] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Prevent subscription if no event ID is provided
    if (!eventId) return;

    // Create a reference to the specific event's entry point node in RTDB
    const entryPointsRef = ref(rtdb, `entry_points/${eventId}`);
    
    // Establish a real-time listener
    const unsubscribe = onValue(entryPointsRef, (snapshot) => {
      const data = snapshot.val();
      setEntryPoints(data || {});
      setLoading(false);
    }, (error) => {
      console.error("Firebase RTDB error:", error);
      setLoading(false);
    });

    // Cleanup: unsubscribe from the RTDB listener on component unmount
    return () => unsubscribe();
  }, [eventId]);

  return { entryPoints, loading };
};
