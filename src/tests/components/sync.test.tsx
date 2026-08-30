import React from 'react';
import { SyncProvider, useSync } from '@/components/sync/SyncProvider';
import { SyncStatus } from '@/components/sync/SyncStatus';
import * as db from '@/lib/sync/db';
import { vi, describe, it, expect, beforeEach, afterEach, Mock } from 'vitest';
import { cleanup, render, screen, act, waitFor } from '@testing-library/react';
import * as matchers from '@testing-library/jest-dom/matchers';
expect.extend(matchers);

vi.mock('@/lib/sync/db', () => ({
  initializeQueue: vi.fn().mockResolvedValue(undefined),
  getPendingTransactions: vi.fn().mockResolvedValue([]),
  getTransactionsByStatus: vi.fn().mockResolvedValue([]),
  updateTransactionStatus: vi.fn().mockResolvedValue(undefined),
  removeTransaction: vi.fn().mockResolvedValue(undefined),
}));

const globalFetch = global.fetch;

describe('Sync UI & Provider', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ results: [] })
    });
    // Default online
    Object.defineProperty(navigator, 'onLine', { value: true, configurable: true });
  });

  afterEach(() => {
    cleanup();
    global.fetch = globalFetch;
  });

  const TestChild = () => {
    const { isOnline, isSyncing, triggerSync } = useSync();
    return (
      <div>
        <span data-testid="online">{isOnline ? 'Online' : 'Offline'}</span>
        <span data-testid="syncing">{isSyncing ? 'Syncing' : 'Idle'}</span>
        <button onClick={triggerSync} data-testid="trigger">Trigger</button>
      </div>
    );
  };

  it('SyncProvider provides context and initializes queue', async () => {
    render(
      <SyncProvider>
        <TestChild />
      </SyncProvider>
    );

    expect(screen.getByTestId('online')).toHaveTextContent('Online');
    await waitFor(() => {
      expect(db.initializeQueue).toHaveBeenCalled();
    });
  });

  it('SyncProvider reacts to offline events', async () => {
    render(
      <SyncProvider>
        <TestChild />
      </SyncProvider>
    );
    
    act(() => {
      window.dispatchEvent(new Event('offline'));
    });
    
    await waitFor(() => {
      expect(screen.getByTestId('online')).toHaveTextContent('Offline');
    });
  });

  it('SyncProvider processes pending transactions successfully', async () => {
    const mockTx = { id: 'tx-1', type: 'expense', payload: {} };
    (db.getPendingTransactions as Mock).mockResolvedValueOnce([mockTx]);
    
    (global.fetch as Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        results: [{ id: 'tx-1', status: 'success' }]
      })
    });

    render(
      <SyncProvider>
        <TestChild />
      </SyncProvider>
    );

    // Initial render triggers sync automatically via useEffect
    await waitFor(() => {
      expect(db.updateTransactionStatus).toHaveBeenCalledWith('tx-1', 'syncing');
      expect(global.fetch).toHaveBeenCalled();
      expect(db.removeTransaction).toHaveBeenCalledWith('tx-1');
    });
  });

  it('SyncStatus renders online empty state correctly', () => {
    render(
      <SyncProvider>
        <SyncStatus />
      </SyncProvider>
    );
    // When there are no errors, no pending, it's basically empty or just a cloud icon.
    // The component renders correctly without crashing.
    expect(document.querySelector('.lucide-cloud')).toBeInTheDocument();
  });

  it('SyncStatus renders error state and allows manual retry', async () => {
    (db.getTransactionsByStatus as Mock).mockResolvedValueOnce([{ id: 'err-1' }]);
    
    render(
      <SyncProvider>
        <SyncStatus />
      </SyncProvider>
    );
    
    // Status polls db periodically, so wait for it
    await waitFor(() => {
      expect(screen.getByText(/1 error/i)).toBeInTheDocument();
    });

    const retryBtn = screen.getByRole('button');
    expect(retryBtn).toHaveTextContent(/Retry/i);
    
    act(() => {
      retryBtn.click();
    });

    // Should trigger getPendingTransactions 
    await waitFor(() => {
      expect(db.getPendingTransactions).toHaveBeenCalled();
    });
  });
});
