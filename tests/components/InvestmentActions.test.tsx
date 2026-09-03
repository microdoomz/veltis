import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import { InvestmentActions } from '@/components/investments/InvestmentActions';

// Mock fetch globally
const globalFetch = vi.fn();
global.fetch = globalFetch;

describe('InvestmentActions Component', () => {
  const mockOnUpdate = vi.fn();
  const defaultProps = {
    workspaceId: 'ws-1',
    accounts: [{ id: 'acc-1', name: 'Brokerage' }],
    positions: [{ id: 'pos-1', name: 'Apple', symbol: 'AAPL' }],
    onUpdate: mockOnUpdate
  };

  beforeEach(() => {
    vi.clearAllMocks();
    globalFetch.mockResolvedValue({ ok: true });
  });

  afterEach(() => {
    cleanup();
  });

  it('renders action buttons correctly', () => {
    render(<InvestmentActions {...defaultProps} />);
    
    expect(screen.getByRole('button', { name: /Contribute Cash/i })).toBeDefined();
    expect(screen.getByRole('button', { name: /Withdraw Cash/i })).toBeDefined();
    expect(screen.getByRole('button', { name: /Buy Asset/i })).toBeDefined();
    expect(screen.getByRole('button', { name: /Sell Asset/i })).toBeDefined();
    expect(screen.getByRole('button', { name: /Update Price/i })).toBeDefined();
  });

  it('opens and submits contribute cash form', async () => {
    render(<InvestmentActions {...defaultProps} />);
    
    fireEvent.click(screen.getByRole('button', { name: /Contribute Cash/i }));
    
    const amountInput = screen.getAllByRole('spinbutton')[0]; // There's only one number input
    fireEvent.change(amountInput, { target: { value: '1000' } });
    
    const sourceBankInput = screen.getByPlaceholderText('UUID of bank account');
    fireEvent.change(sourceBankInput, { target: { value: 'bank-acc-1' } });
    
    fireEvent.click(screen.getByRole('button', { name: /Save/i }));
    
    await waitFor(() => {
      expect(globalFetch).toHaveBeenCalledTimes(1);
      const callArgs = globalFetch.mock.calls[0];
      expect(callArgs[0]).toBe('/api/investments');
      expect(JSON.parse(callArgs[1].body)).toMatchObject({
        workspaceId: 'ws-1',
        type: 'contribution',
        investmentAccountId: 'acc-1',
        sourceAccountId: 'bank-acc-1',
        amountMinor: 100000,
        currency: 'USD'
      });
      expect(mockOnUpdate).toHaveBeenCalled();
    });
  });

  it('opens and submits buy asset form', async () => {
    render(<InvestmentActions {...defaultProps} />);
    
    fireEvent.click(screen.getByRole('button', { name: /Buy Asset/i }));
    
    // Fill form
    const spinButtons = screen.getAllByRole('spinbutton');
    // Spinbutton 0 is Units, Spinbutton 1 is Price
    fireEvent.change(spinButtons[0], { target: { value: '5' } });
    fireEvent.change(spinButtons[1], { target: { value: '150.50' } });
    
    fireEvent.click(screen.getByRole('button', { name: /Save Trade/i }));
    
    await waitFor(() => {
      expect(globalFetch).toHaveBeenCalledTimes(1);
      const callArgs = globalFetch.mock.calls[0];
      expect(callArgs[0]).toBe('/api/investments');
      expect(JSON.parse(callArgs[1].body)).toMatchObject({
        workspaceId: 'ws-1',
        type: 'buy',
        investmentAccountId: 'acc-1',
        positionId: 'pos-1',
        units: '5',
        priceMinor: 15050,
        currency: 'USD'
      });
      expect(mockOnUpdate).toHaveBeenCalled();
    });
  });

  it('opens and submits update price form', async () => {
    render(<InvestmentActions {...defaultProps} />);
    
    fireEvent.click(screen.getByRole('button', { name: /Update Price/i }));
    
    const amountInput = screen.getByRole('spinbutton');
    fireEvent.change(amountInput, { target: { value: '160.00' } });
    
    fireEvent.click(screen.getByRole('button', { name: /Save Price/i }));
    
    await waitFor(() => {
      expect(globalFetch).toHaveBeenCalledTimes(1);
      const callArgs = globalFetch.mock.calls[0];
      expect(callArgs[0]).toBe('/api/investments/snapshots');
      expect(JSON.parse(callArgs[1].body)).toMatchObject({
        workspaceId: 'ws-1',
        positionId: 'pos-1',
        manualPriceMinor: 16000,
        manualCurrency: 'USD'
      });
      expect(mockOnUpdate).toHaveBeenCalled();
    });
  });
});
