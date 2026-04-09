import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import TicketScanner from '../TicketScanner';

describe('TicketScanner', () => {
  it('renders and allows typing a ticket ID', () => {
    const onScan = vi.fn();
    const onClose = vi.fn();
    
    render(<TicketScanner onScan={onScan} onClose={onClose} event_id="event_001" />);
    
    const input = screen.getByPlaceholderText(/type ticket id manually/i);
    fireEvent.change(input, { target: { value: 'TEST-ID' } });
    expect(input.value).toBe('TEST-ID');
  });

  it('triggers onScan when simulation button is clicked', async () => {
    const onScan = vi.fn().mockResolvedValue({});
    const onClose = vi.fn();
    
    render(<TicketScanner onScan={onScan} onClose={onClose} event_id="event_001" />);
    
    // Find the simulation button for India match
    const simButton = screen.getByText(/scan IND-AUS-101/i);
    fireEvent.click(simButton);
    
    // Check if input is filled
    const input = screen.getByPlaceholderText(/type ticket id manually/i);
    expect(input.value).toBe('IND-AUS-101');
    
    // Check if onScan was called after the simulated relay
    await waitFor(() => {
      expect(onScan).toHaveBeenCalledWith('IND-AUS-101');
    }, { timeout: 2000 });
  });

  it('shows error if validation fails', async () => {
    const onScan = vi.fn().mockRejectedValue(new Error('Invalid Ticket'));
    const onClose = vi.fn();
    
    render(<TicketScanner onScan={onScan} onClose={onClose} event_id="event_001" />);
    
    const input = screen.getByPlaceholderText(/type ticket id manually/i);
    fireEvent.change(input, { target: { value: 'BAD-ID' } });
    
    const confirmButton = screen.getByText(/confirm ticket/i);
    fireEvent.click(confirmButton);
    
    await waitFor(() => {
      expect(screen.getByText(/invalid ticket/i)).toBeInTheDocument();
    });
  });
});
