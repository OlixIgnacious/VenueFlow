import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { BrowserRouter } from 'react-router-dom';
import AttendeeEntry from '../AttendeeEntry';
import { VenueProvider } from '../../context/VenueContext';
import axios from 'axios';

vi.mock('axios');
vi.mock('../../context/VenueContext', () => ({
  useVenue: () => ({
    venue: { name: 'Test Stadium', location_ref_label: 'Seat section', entry_label: 'Gate' },
    event: { id: 'event_001', name: 'Test Match' },
    loading: false,
    error: null
  }),
  VenueProvider: ({ children }) => <div>{children}</div>
}));

describe('AttendeeEntry', () => {
  it('renders venue and event context correctly', () => {
    render(
      <BrowserRouter>
        <AttendeeEntry />
      </BrowserRouter>
    );
    
    expect(screen.getByText('Test Stadium')).toBeInTheDocument();
    expect(screen.getByText('Test Match')).toBeInTheDocument();
    expect(screen.getByText(/Scan My Ticket/i)).toBeInTheDocument();
  });

  it('allows manual entry of seat section', () => {
    render(
      <BrowserRouter>
        <AttendeeEntry />
      </BrowserRouter>
    );
    
    const input = screen.getByPlaceholderText(/e.g. Block B/i);
    fireEvent.change(input, { target: { value: 'Block B12' } });
    expect(input.value).toBe('Block B12');
    
    const button = screen.getByText(/Find My Gate/i);
    expect(button).not.toBeDisabled();
  });

  it('opens scanner when Scan My Ticket is clicked', () => {
    render(
      <BrowserRouter>
        <AttendeeEntry />
      </BrowserRouter>
    );
    
    fireEvent.click(screen.getByText(/Scan My Ticket/i));
    expect(screen.getByText(/Ticket Scanner/i)).toBeInTheDocument();
  });
});
