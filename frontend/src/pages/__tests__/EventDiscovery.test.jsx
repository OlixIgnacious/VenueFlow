import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { BrowserRouter } from 'react-router-dom';
import EventDiscovery from '../EventDiscovery';
import axios from 'axios';

vi.mock('axios');
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => vi.fn(),
  };
});

const mockEvents = {
  "event_001": {
    "name": "India vs Australia — T20",
    "type": "sports_match",
    "venue_id": "venue_001",
    "start_time": "2026-04-09T20:31:11",
    "status": "upcoming"
  },
  "event_002": {
    "name": "Tech Summit",
    "type": "conference",
    "venue_id": "venue_002",
    "start_time": "2026-04-14T10:00:00",
    "status": "upcoming"
  }
};

describe('EventDiscovery', () => {
  it('renders loading state initially', () => {
    axios.get.mockReturnValue(new Promise(() => {})); // Never resolves
    render(
      <BrowserRouter>
        <EventDiscovery />
      </BrowserRouter>
    );
    expect(screen.getByText(/discovering events/i)).toBeInTheDocument();
  });

  it('renders events and handles search filtering', async () => {
    axios.get.mockResolvedValue({ data: mockEvents });
    
    render(
      <BrowserRouter>
        <EventDiscovery />
      </BrowserRouter>
    );

    // Wait for events to load
    await waitFor(() => {
      expect(screen.getByText('India vs Australia — T20')).toBeInTheDocument();
    });
    expect(screen.getByText('Tech Summit')).toBeInTheDocument();

    // Test search
    const searchInput = screen.getByPlaceholderText(/search by name/i);
    fireEvent.change(searchInput, { target: { value: 'India' } });

    expect(screen.getByText('India vs Australia — T20')).toBeInTheDocument();
    expect(screen.queryByText('Tech Summit')).not.toBeInTheDocument();
  });
});
