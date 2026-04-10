import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import Recommendation from '../Recommendation';
import { MemoryRouter } from 'react-router-dom';
import axios from 'axios';

vi.mock('axios');

const mockVenue = {
  id: 'venue_001',
  name: 'M. Chinnaswamy Stadium',
  entry_label: 'Gate',
  location_ref_label: 'Seat section',
  coordinates: { lat: 12.9716, lng: 77.5946 }
};

const mockEvent = {
  id: 'event_001',
  name: 'India vs Australia — T20'
};

const mockRecommendation = {
  recommended_entry: 'entry_B',
  wait_minutes: 2,
  crowd_level: 'low',
  reason: 'Gate B is much faster.',
  alt_entry: 'entry_A'
};

// Define a mutable object to control mock values
const venueContextMock = {
  venue: mockVenue,
  event: mockEvent,
  loading: false
};

vi.mock('../../context/VenueContext', () => ({
  useVenue: () => venueContextMock,
  VenueProvider: ({ children }) => <div>{children}</div>
}));

vi.mock('../../hooks/useEntryPoints', () => ({
  useEntryPoints: () => ({
    entryPoints: {
      'entry_A': { label: 'Gate A', wait_minutes: 10, status: 'busy' },
      'entry_B': { label: 'Gate B', wait_minutes: 2, status: 'open' }
    }
  })
}));

describe('Recommendation Page', () => {
  it('renders loading state when loading is true', () => {
    venueContextMock.loading = true;
    render(
      <MemoryRouter initialEntries={['/recommend?ref=Seat-101']}>
        <Recommendation />
      </MemoryRouter>
    );
    expect(screen.getByText(/AI is calculating/i)).toBeDefined();
    venueContextMock.loading = false; // Reset for next tests
  });

  it('renders recommendation data after fetching', async () => {
    axios.get.mockResolvedValue({ data: mockRecommendation });

    render(
      <MemoryRouter initialEntries={['/recommend?ref=Seat-101']}>
        <Recommendation />
      </MemoryRouter>
    );

    await waitFor(() => {
      // Component renders the entry label ("Gate B"), not the key ("entry_B")
      expect(screen.getByText(/Gate B is much faster/i)).toBeDefined();
    });
  });
});
