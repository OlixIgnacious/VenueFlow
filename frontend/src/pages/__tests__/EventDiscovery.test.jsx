import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { axe } from 'vitest-axe';
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
  "event_004": {
    "name": "Summer Solstice Fest 2026",
    "type": "festival",
    "venue_id": "venue_004",
    "start_time": "2026-06-21T12:00:00",
    "status": "live"
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
    expect(screen.getByText('Summer Solstice Fest 2026')).toBeInTheDocument();

    // Test search
    const searchInput = screen.getByPlaceholderText(/search by name/i);
    fireEvent.change(searchInput, { target: { value: 'India' } });

    expect(screen.getByText('India vs Australia — T20')).toBeInTheDocument();
    expect(screen.queryByText('Summer Solstice Fest 2026')).not.toBeInTheDocument();
  });

  it('has no accessibility violations', async () => {
    axios.get.mockResolvedValue({ data: mockEvents });
    const { container } = render(
      <BrowserRouter>
        <EventDiscovery />
      </BrowserRouter>
    );
    
    // Wait for content to render before checking accessibility
    await waitFor(() => {
      expect(screen.getByText('India vs Australia — T20')).toBeInTheDocument();
    });
    
    const results = await axe(container);
    expect(results.violations).toHaveLength(0);
  });
});
