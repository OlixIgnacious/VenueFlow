import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render } from '@testing-library/react';
import React from 'react';
import VenueMap from '../VenueMap';

describe('VenueMap Component', () => {
  beforeEach(() => {
    // Inject a mock google.maps into the window
    window.google = {
      maps: {
        Map: vi.fn().mockReturnValue({ 
          setOptions: vi.fn(),
          panTo: vi.fn(),
        }),
        Marker: vi.fn().mockReturnValue({
          setMap: vi.fn(),
          setPosition: vi.fn(),
        }),
        SymbolPath: { CIRCLE: 0 },
        visualization: { HeatmapLayer: vi.fn().mockReturnValue({ setMap: vi.fn() }) },
        LatLng: vi.fn().mockImplementation((lat, lng) => ({ lat, lng })),
        DirectionsService: vi.fn().mockReturnValue({ route: vi.fn() }),
        DirectionsRenderer: vi.fn().mockReturnValue({ setDirections: vi.fn(), setMap: vi.fn() }),
        TravelMode: { WALKING: 'WALKING' },
      }
    };
    
    // Mock the script element check so it thinks it is already loaded
    document.getElementById = vi.fn().mockImplementation((id) => {
      if (id === 'gmap-script') return { id: 'gmap-script' };
      return null;
    });
  });

  const mockVenue = {
    name: 'Test Venue',
    coordinates: { lat: 12.9716, lng: 77.5946 }
  };

  it('renders without crashing when venue is provided', () => {
    render(<VenueMap venue={mockVenue} />);
    // Check if the container exists
    expect(document.querySelector('.relative.w-full')).toBeDefined();
  });

  it('handles null venue gracefully', () => {
    const { container } = render(<VenueMap venue={null} />);
    // Component returns null when venue is falsy
    expect(container.firstChild).toBeNull();
  });
});
