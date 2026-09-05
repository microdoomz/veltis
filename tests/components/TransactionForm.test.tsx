import React from 'react';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import { TransactionForm } from '@/components/transactions/TransactionForm';
import { enqueueTransaction } from '@/lib/sync/db';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';

afterEach(cleanup);

vi.mock('@/lib/sync/db', () => ({
  enqueueTransaction: vi.fn().mockResolvedValue('new-tx-id')
}));

vi.mock('@/components/sync/SyncProvider', () => ({
  useSync: () => ({ triggerSync: vi.fn() })
}));

const mockPush = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush, refresh: vi.fn(), prefetch: vi.fn() }),
  useSearchParams: () => ({ get: () => null }),
}));

describe('TransactionForm Offline Sync Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  const accounts = [
    { id: 'acc-1', name: 'Bank' },
    { id: 'acc-2', name: 'Wallet' }
  ];
  const categories = [{ id: 'cat-1', name: 'Food' }];

  it('enqueues an expense transaction and redirects', async () => {
    render(<TransactionForm workspaceId="ws-1" accounts={accounts} categories={categories} />);
    
    // Switch to expense (default)
    const amountInput = screen.getByPlaceholderText('0.00');
    fireEvent.change(amountInput, { target: { value: '50.50' } });
    
    const descInput = screen.getByPlaceholderText('Where or what?');
    fireEvent.change(descInput, { target: { value: 'Lunch' } });

    // In the DOM, select elements do not have associated labels with htmlFor
    // so we need to find them by name
    const accountSelect = document.querySelector('select[name="accountId"]')!;
    fireEvent.change(accountSelect, { target: { value: 'acc-1' } });

    const categorySelect = document.querySelector('select[name="categoryId"]')!;
    fireEvent.change(categorySelect, { target: { value: 'cat-1' } });

    const saveBtn = screen.getByRole('button', { name: /Save Expense/i });
    fireEvent.click(saveBtn);

    await waitFor(() => {
      expect(enqueueTransaction).toHaveBeenCalledWith('expense', expect.objectContaining({
        workspaceId: 'ws-1',
        amountMajor: 50.5,
        description: 'Lunch',
        accountId: 'acc-1',
        categoryId: 'cat-1'
      }));
      expect(mockPush).toHaveBeenCalledWith('/transactions');
    });
  });

  it('enqueues a transfer transaction and redirects', async () => {
    render(<TransactionForm workspaceId="ws-1" accounts={accounts} categories={categories} />);
    
    // Switch to transfer
    fireEvent.click(screen.getAllByText('Transfer')[0]);

    // Transfer tab is the 3rd tab (Expense, Income, Transfer)
    const amountInputs = screen.getAllByPlaceholderText('0.00');
    const amountInput = amountInputs[2] || amountInputs[amountInputs.length - 1];
    fireEvent.change(amountInput, { target: { value: '100' } });

    const sourceSelect = document.querySelector('select[name="sourceAccountId"]')!;
    fireEvent.change(sourceSelect, { target: { value: 'acc-1' } });
    
    const destSelect = document.querySelector('select[name="destAccountId"]')!;
    fireEvent.change(destSelect, { target: { value: 'acc-2' } });

    const saveBtn = screen.getByRole('button', { name: /Save Transfer/i });
    fireEvent.click(saveBtn);

    await waitFor(() => {
      expect(enqueueTransaction).toHaveBeenCalledWith('transfer', expect.objectContaining({
        workspaceId: 'ws-1',
        amountMajor: 100,
        sourceAccountId: 'acc-1',
        destAccountId: 'acc-2'
      }));
    });
  });

  it('preselects initialType tab when provided', () => {
    render(<TransactionForm workspaceId="ws-1" initialType="income" accounts={accounts} categories={categories} />);
    const saveBtn = screen.getByRole('button', { name: /Save Income/i });
    expect(saveBtn).toBeDefined();
  });
});
