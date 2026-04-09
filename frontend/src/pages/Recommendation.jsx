import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useVenue } from '../context/VenueContext';
import { useEntryPoints } from '../hooks/useEntryPoints';
import EntryPointCard from '../components/EntryPointCard';
import VenueMap from '../components/VenueMap';
import ErrorBoundary from '../components/ErrorBoundary';
import { ArrowLeft, Loader2, Sparkles, Navigation } from 'lucide-react';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

const Recommendation = () => {
  const { venue, event, loading: venueLoading } = useVenue();
  const [searchParams] = useSearchParams();
  const refValue = searchParams.get('ref');
  const [recommendation, setRecommendation] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [userLocation, setUserLocation] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude
          });
        },
        (error) => console.log("Geolocation error:", error)
      );
    }
  }, []);

  const { entryPoints } = useEntryPoints(event?.id);

  useEffect(() => {
    if (!refValue) {
      navigate('/');
      return;
    }

    const fetchRecommendation = async () => {
      try {
        setLoading(true);
        console.log(`[Recommendation] Fetching from ${API_BASE_URL}/api/recommend?ref=${refValue}`);
        const response = await axios.get(`${API_BASE_URL}/api/recommend?ref=${encodeURIComponent(refValue)}`);
        console.log('[Recommendation] API response:', response.data);
        setRecommendation(response.data);
      } catch (err) {
        const status = err?.response?.status;
        const detail = err?.response?.data?.detail || err.message;
        console.error(`[Recommendation] API error — HTTP ${status}: ${detail}`);
        setError(detail);
      } finally {
        setLoading(false);
      }
    };

    fetchRecommendation();
  }, [refValue, navigate]);

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen text-center p-6 space-y-6">
        <div className="bg-red-500/10 p-4 rounded-full">
           <ArrowLeft className="text-red-400" size={48} onClick={() => navigate('/')} />
        </div>
        <div className="space-y-2">
          <h2 className="text-2xl font-bold text-red-400">Recommendation Failed</h2>
          <p className="text-slate-400 max-w-xs mx-auto">{error}</p>
        </div>
        <button onClick={() => navigate('/')} className="bg-slate-800 px-6 py-3 rounded-2xl font-bold hover:bg-slate-700 transition-colors">Return to Entry</button>
      </div>
    );
  }

  if (venueLoading || loading || !venue || !recommendation) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen space-y-4">
        <Loader2 className="w-12 h-12 text-blue-500 animate-spin" />
        <p className="text-slate-400">AI is calculating the best route for you...</p>
      </div>
    );
  }

  const recommendedEntry = entryPoints[recommendation?.recommended_entry];
  const altEntry = entryPoints[recommendation?.alt_entry];

  return (
    <div className="max-w-xl mx-auto p-6 min-h-screen space-y-8 pb-12 animate-in fade-in duration-500">
      <button 
        onClick={() => navigate(-1)}
        className="flex items-center text-slate-500 hover:text-blue-600 dark:text-slate-400 dark:hover:text-white transition-colors"
      >
        <ArrowLeft size={18} className="mr-2" />
        <span>Back</span>
      </button>

      <div className="space-y-2">
        <h2 className="text-slate-500 dark:text-slate-400 font-medium uppercase tracking-widest text-sm flex items-center">
          <Sparkles size={14} className="mr-2 text-blue-600 dark:text-blue-400" />
          AI Recommendation
        </h2>
        <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100">Your Optimal {venue?.entry_label}</h1>
      </div>

      <div aria-live="polite">
        {recommendedEntry && (
          <EntryPointCard 
            label={recommendedEntry.label}
            wait_minutes={recommendedEntry.wait_minutes}
            status={recommendedEntry.status}
            reason={recommendation.reason}
            tip={recommendation.tip}
            isRecommended={true}
          />
        )}
      </div>

      {altEntry && (
        <div className="space-y-4">
          <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider px-1">
            Alternative {venue?.entry_label}
          </h3>
          <EntryPointCard 
            label={altEntry.label}
            wait_minutes={altEntry.wait_minutes}
            status={altEntry.status}
            reason={`If you prefer a different route, ${altEntry.label} is also available.`}
          />
        </div>
      )}

      {/* Map Integration */}
      <div className="h-80 bg-white dark:bg-slate-900/60 rounded-3xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-2xl relative">
        <ErrorBoundary>
          <VenueMap 
            venue={venue} 
            entryPoints={Object.values(entryPoints)} 
            recommendedEntryId={recommendation?.recommended_entry}
            userLocation={userLocation}
          />
        </ErrorBoundary>
        <div className="absolute bottom-4 left-4 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md px-3 py-1.5 rounded-full text-xs font-bold text-blue-600 dark:text-blue-400 flex items-center shadow-lg border border-slate-200 dark:border-slate-800 pointer-events-none">
          <Navigation size={12} className="mr-1.5" />
          WALKING ROUTE
        </div>
      </div>
    </div>
  );
};

export default Recommendation;
