import React, { useEffect, useRef } from 'react';
import { Loader } from '@googlemaps/js-api-loader';

const VenueMap = ({ 
  venue, 
  entryPoints = [], 
  recommendedEntryId = null, 
  showHeatmap = false 
}) => {
  const mapRef = useRef(null);
  const googleRef = useRef(null);
  const markersRef = useRef([]);
  const heatmapRef = useRef(null);
  const directionsRef = useRef(null);

  useEffect(() => {
    const loader = new Loader({
      apiKey: import.meta.env.VITE_MAPS_API_KEY,
      version: "weekly",
      libraries: ["visualization", "routes"]
    });

    loader.load().then((google) => {
      googleRef.current = google;
      const center = venue.coordinates;
      
      const map = new google.maps.Map(mapRef.current, {
        center,
        zoom: 18,
        styles: mapStyles,
        disableDefaultUI: true,
        zoomControl: true,
      });

      // 1. Entry Point Markers
      renderMarkers(map, google);

      // 2. Heatmap
      if (showHeatmap) {
        renderHeatmap(map, google);
      }

      // 3. Directions
      if (recommendedEntryId) {
        renderDirections(map, google);
      }
    });

    return () => {
      markersRef.current.forEach(m => m.setMap(null));
      if (heatmapRef.current) heatmapRef.current.setMap(null);
    };
  }, [venue, entryPoints, recommendedEntryId, showHeatmap]);

  const renderMarkers = (map, google) => {
    markersRef.current.forEach(m => m.setMap(null));
    markersRef.current = entryPoints.map(ep => {
      const isRecommended = ep.id === recommendedEntryId;
      return new google.maps.Marker({
        position: ep.coordinates,
        map,
        title: ep.label,
        label: {
          text: ep.label,
          color: isRecommended ? "#60a5fa" : "#94a3b8",
          fontSize: "12px",
          fontWeight: "bold"
        },
        icon: {
          path: google.maps.SymbolPath.CIRCLE,
          fillColor: isRecommended ? "#2563eb" : "#1e293b",
          fillOpacity: 1,
          strokeWeight: 2,
          strokeColor: isRecommended ? "#60a5fa" : "#475569",
          scale: 8
        }
      });
    });
  };

  const renderHeatmap = (map, google) => {
    const data = entryPoints.map(ep => ({
      location: new google.maps.LatLng(ep.coordinates.lat, ep.coordinates.lng),
      weight: ep.density * 10
    }));

    if (heatmapRef.current) heatmapRef.current.setMap(null);
    heatmapRef.current = new google.maps.visualization.HeatmapLayer({
      data,
      map,
      radius: 40,
      opacity: 0.8
    });
  };

  const renderDirections = (map, google) => {
    const recommended = entryPoints.find(ep => ep.id === recommendedEntryId);
    if (!recommended) return;

    const directionsService = new google.maps.DirectionsService();
    const directionsRenderer = new google.maps.DirectionsRenderer({
      map,
      suppressMarkers: true,
      polylineOptions: {
        strokeColor: "#3b82f6",
        strokeWeight: 6,
        strokeOpacity: 0.8
      }
    });

    directionsService.route({
      origin: venue.coordinates, // Start from venue main coordinates
      destination: recommended.coordinates,
      travelMode: google.maps.TravelMode.WALKING
    }, (result, status) => {
      if (status === "OK") {
        directionsRenderer.setDirections(result);
      }
    });
  };

  return (
    <div 
      ref={mapRef} 
      className="w-full h-full rounded-3xl" 
      aria-label={`${venue.name} map showing ${venue.entry_label} locations`}
    />
  );
};

const mapStyles = [
  { "elementType": "geometry", "stylers": [{ "color": "#0f172a" }] },
  { "elementType": "labels.text.fill", "stylers": [{ "color": "#475569" }] },
  { "elementType": "labels.text.stroke", "stylers": [{ "color": "#0f172a" }] },
  { "featureType": "administrative", "elementType": "geometry", "stylers": [{ "color": "#1e293b" }] },
  { "featureType": "poi", "elementType": "geometry", "stylers": [{ "color": "#1e293b" }] },
  { "featureType": "road", "elementType": "geometry", "stylers": [{ "color": "#1e293b" }] },
  { "featureType": "water", "elementType": "geometry", "stylers": [{ "color": "#020617" }] }
];

export default VenueMap;
