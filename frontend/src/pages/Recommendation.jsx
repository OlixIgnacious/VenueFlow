import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useVenue } from '../context/VenueContext';
import { useEntryPoints } from '../hooks/useEntryPoints';
import EntryPointCard from '../components/EntryPointCard';
import VenueMap from '../components/VenueMap';
import { ArrowLeft, Loader2, Sparkles } from 'lucide-react';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

const Recommendation = () => {
  const { venue, event, loading: venueLoading } = useVenue();
  const [searchParams] = useSearchParams();
  const refValue = searchParams.get('ref');
  const [recommendation, setRecommendation] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  const { entryPoints } = useEntryPoints(event?.id);

  useEffect(() => {
    if (!refValue) {
      navigate('/');
      return;
    }

    const fetchRecommendation = async () => {
      try {
        setLoading(true);
        const response = await axios.get(`${API_BASE_URL}/api/recommend?ref=${refValue}`);
        setRecommendation(response.data);
      } catch (err) {
        setError('Failed to get recommendation');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchRecommendation();
  }, [refValue, navigate]);

  if (venueLoading || loading) {
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
        className="flex items-center text-slate-400 hover:text-white transition-colors"
      >
        <ArrowLeft size={18} className="mr-2" />
        <span>Back</span>
      </button>

      <div className="space-y-2">
        <h2 className="text-slate-400 font-medium uppercase tracking-widest text-sm flex items-center">
          <Sparkles size={14} className="mr-2 text-blue-400" />
          AI Recommendation
        </h2>
        <h1 className="text-3xl font-bold">Your Optimal {venue?.entry_label}</h1>
      </div>

      <div aria-live="polite">
        {recommendedEntry && (
          <EntryPointCard 
            label={recommendedEntry.label}
            waitMinutes={recommendedEntry.wait_minutes}
            crowdLevel={recommendedEntry.status}
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
            waitMinutes={altEntry.wait_minutes}
            crowdLevel={altEntry.status}
            reason={`If you prefer a different route, ${altEntry.label} is also available.`}
          />
        </div>
      )}

      {/* Map Integration */}
      <div className="h-80 bg-slate-900/60 rounded-3xl border border-slate-800 overflow-hidden shadow-2xl relative">
        <VenueMap 
          venue={venue} 
          entryPoints={Object.values(entryPoints)} 
          recommendedEntryId={recommendation.recommended_entry}
        />
        <div className="absolute bottom-4 left-4 glass px-3 py-1.5 rounded-full text-xs font-bold text-blue-400 flex items-center shadow-lg pointer-events-none">
          <Navigation size={12} className="mr-1.5" />
          WALKING ROUTE
        </div>
      </div>
    </div>
  );
};

export default Recommendation;
