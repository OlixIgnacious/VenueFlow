import { useState, useEffect } from 'react';
import { ref, onValue } from 'firebase/database';
import { rtdb } from '../services/firebase';

export const useEntryPoints = (eventId) => {
  const [entryPoints, setEntryPoints] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!eventId) return;

    const entryPointsRef = ref(rtdb, `entry_points/${eventId}`);
    
    const unsubscribe = onValue(entryPointsRef, (snapshot) => {
      const data = snapshot.val();
      setEntryPoints(data || {});
      setLoading(false);
    }, (error) => {
      console.error("Firebase RTDB error:", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [eventId]);

  return { entryPoints, loading };
};
