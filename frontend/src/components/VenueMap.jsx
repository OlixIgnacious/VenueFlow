import React, { useEffect, useRef, useState } from 'react';
import { MapPin } from 'lucide-react';

const MAPS_API_KEY = import.meta.env.VITE_MAPS_API_KEY;

/**
 * Singleton Maps loader — appends the script once and waits for
 * window.google.maps to be fully initialized before resolving.
 */
let _resolveMap = null;
let _rejectMap = null;
const mapsReadyPromise = new Promise((res, rej) => {
  _resolveMap = res;
  _rejectMap = rej;
});

function ensureMapsLoaded() {
  // Already loaded
  if (window.google && window.google.maps && window.google.maps.Map) {
    _resolveMap(window.google.maps);
    return mapsReadyPromise;
  }

  // Script already injected by a previous call
  if (document.getElementById('gmap-script')) return mapsReadyPromise;

  // Expose a global callback that Maps JS API will call when ready
  window.__venueflowMapsReady = () => {
    if (window.google && window.google.maps) {
      _resolveMap(window.google.maps);
    } else {
      _rejectMap(new Error('google.maps not available after callback'));
    }
  };

  const script = document.createElement('script');
  script.id = 'gmap-script';
  script.src = `https://maps.googleapis.com/maps/api/js?key=${MAPS_API_KEY}&libraries=visualization,routes&callback=__venueflowMapsReady&loading=async`;
  script.async = true;
  script.defer = true;
  script.onerror = () => _rejectMap(new Error('Google Maps script failed to load'));
  document.head.appendChild(script);

  return mapsReadyPromise;
}

const VenueMap = ({
  venue,
  entryPoints = [],
  recommendedEntryId = null,
  showHeatmap = false,
  userLocation = null,
}) => {
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markersRef = useRef([]);
  const heatmapRef = useRef(null);
  const [mapError, setMapError] = useState(null);

  useEffect(() => {
    if (!venue || !mapRef.current) return;

    let cancelled = false;

    ensureMapsLoaded()
      .then((maps) => {
        if (cancelled || !mapRef.current) return;

        // Dispose old map if venue changed
        if (mapInstanceRef.current) {
          markersRef.current.forEach(m => m.setMap(null));
          markersRef.current = [];
        }

        const center = venue.coordinates || { lat: 12.97, lng: 77.59 };

        const map = new maps.Map(mapRef.current, {
          center,
          zoom: 18,
          styles: mapStyles,
          disableDefaultUI: true,
          zoomControl: true,
        });
        mapInstanceRef.current = map;

        // --- Entry point markers ---
        markersRef.current = (entryPoints || [])
          .filter(ep => ep?.coordinates)
          .map(ep => {
            const isRec = ep.id === recommendedEntryId;
            return new maps.Marker({
              position: ep.coordinates,
              map,
              title: ep.label || '',
              label: {
                text: String(ep.label || ''),
                color: isRec ? '#60a5fa' : '#94a3b8',
                fontSize: '12px',
                fontWeight: 'bold',
              },
              icon: {
                path: maps.SymbolPath.CIRCLE,
                fillColor: isRec ? '#2563eb' : '#1e293b',
                fillOpacity: 1,
                strokeWeight: 2,
                strokeColor: isRec ? '#60a5fa' : '#475569',
                scale: 8,
              },
            });
          });

        // --- Heatmap ---
        if (showHeatmap && maps.visualization?.HeatmapLayer) {
          const data = (entryPoints || [])
            .filter(ep => ep?.coordinates)
            .map(ep => ({
              location: new maps.LatLng(ep.coordinates.lat, ep.coordinates.lng),
              weight: (ep.density || 0) * 10,
            }));
          if (heatmapRef.current) heatmapRef.current.setMap(null);
          heatmapRef.current = new maps.visualization.HeatmapLayer({
            data, map, radius: 40, opacity: 0.8,
          });
        }

        // --- Walking directions ---
        if (recommendedEntryId) {
          const dest = (entryPoints || []).find(ep => ep.id === recommendedEntryId);
          if (dest?.coordinates) {
            const svc = new maps.DirectionsService();
            const renderer = new maps.DirectionsRenderer({
              map,
              suppressMarkers: true,
              polylineOptions: { strokeColor: '#3b82f6', strokeWeight: 6, strokeOpacity: 0.8 },
            });
            svc.route(
              {
                origin: userLocation || center,
                destination: dest.coordinates,
                travelMode: maps.TravelMode.WALKING,
              },
              (result, status) => {
                if (status === 'OK') renderer.setDirections(result);
              }
            );
          }
        }
      })
      .catch(err => {
        console.error('[VenueMap] Maps load error:', err);
        if (!cancelled) setMapError(err.message);
      });

    return () => {
      cancelled = true;
      markersRef.current.forEach(m => m.setMap(null));
      markersRef.current = [];
      if (heatmapRef.current) { heatmapRef.current.setMap(null); heatmapRef.current = null; }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [venue, entryPoints, recommendedEntryId, showHeatmap, userLocation]);

  if (!venue) return null;

  if (mapError) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center space-y-2 text-slate-500">
        <MapPin size={28} className="text-slate-600" />
        <p className="text-xs text-center px-4">Map unavailable<br />{mapError}</p>
      </div>
    );
  }

  return (
    <div
      ref={mapRef}
      className="w-full h-full rounded-3xl"
      aria-label={`${venue.name || 'Venue'} map showing entry locations`}
    />
  );
};

const mapStyles = [
  { elementType: 'geometry', stylers: [{ color: '#0f172a' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#475569' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#0f172a' }] },
  { featureType: 'administrative', elementType: 'geometry', stylers: [{ color: '#1e293b' }] },
  { featureType: 'poi', elementType: 'geometry', stylers: [{ color: '#1e293b' }] },
  { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#1e293b' }] },
  { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#020617' }] },
];

export default VenueMap;
