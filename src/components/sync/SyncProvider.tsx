"use client";

import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { 
  getPendingTransactions, 
  updateTransactionStatus, 
  initializeQueue,
  removeTransaction
} from '@/lib/sync/db';

type SyncContextType = {
  triggerSync: () => void;
  isOnline: boolean;
  isSyncing: boolean;
};

const SyncContext = createContext<SyncContextType | undefined>(undefined);

export function useSync() {
  const context = useContext(SyncContext);
  if (!context) {
    throw new Error('useSync must be used within a SyncProvider');
  }
  return context;
}

export function SyncProvider({ children }: { children: React.ReactNode }) {
  const [isOnline, setIsOnline] = useState<boolean>(true);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  
  // Use a ref to track if we're currently executing a sync to prevent overlap
  const syncInProgress = useRef(false);
  const backoffDelay = useRef(2000); // Start with 2 seconds

  const triggerSync = useCallback(async function triggerSyncFn() {
    if (typeof window === 'undefined' || !navigator.onLine) {
      return;
    }

    if (syncInProgress.current) {
      return;
    }

    syncInProgress.current = true;
    setIsSyncing(true);

    try {
      const pending = await getPendingTransactions();
      if (pending.length === 0) {
        syncInProgress.current = false;
        setIsSyncing(false);
        backoffDelay.current = 2000; // Reset backoff on successful empty queue check
        return;
      }

      // Mark all as syncing
      for (const item of pending) {
        await updateTransactionStatus(item.id, 'syncing');
      }

      // Send to server
      const response = await fetch('/api/sync/transactions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          transactions: pending.map(t => ({
            id: t.id,
            type: t.type,
            payload: t.payload
          }))
        })
      });

      if (!response.ok) {
        // Transient error (500) or Auth error (401)
        if (response.status === 401) {
            // Unrecoverable without login
            for (const item of pending) {
                await updateTransactionStatus(item.id, 'error', 'Unauthorized. Please log in again.');
            }
        } else {
            // Transient 5xx or network disconnect during request
            throw new Error(`Server returned ${response.status}`);
        }
      } else {
        const data = await response.json();
        const results = data.results || [];

        // Process results
        for (const result of results) {
          if (result.status === 'success') {
            await removeTransaction(result.id);
          } else if (result.status === 'permanent_error') {
            await updateTransactionStatus(result.id, 'error', result.error || 'Validation failed');
          }
        }

        // Reset backoff on success
        backoffDelay.current = 2000;
      }

    } catch (error) {
      console.warn('Sync failed, will retry later:', error);
      // Revert 'syncing' items back to 'pending'
      try {
        await initializeQueue(); // Resets syncing to pending
      } catch (e) {
        console.error('Failed to revert queue status:', e);
      }
      
      // Schedule exponential backoff retry if online
      if (navigator.onLine) {
         setTimeout(() => triggerSyncFn(), backoffDelay.current);
         backoffDelay.current = Math.min(backoffDelay.current * 2, 60000); // Max 1 minute backoff
      }
    } finally {
      syncInProgress.current = false;
      setIsSyncing(false);
    }
  }, []);

  // Initialize queue on mount to recover any crashed 'syncing' items
  useEffect(() => {
    const init = async () => {
      try {
        await initializeQueue();
        triggerSync();
      } catch (e) {
        console.error('Failed to initialize sync queue:', e);
      }
    };
    init();
  }, [triggerSync]);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      backoffDelay.current = 2000; // Reset backoff on reconnect
      triggerSync();
    };
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Periodic sync attempt (e.g. catch anything that was missed)
    const interval = setInterval(() => {
      if (navigator.onLine && !syncInProgress.current) {
        triggerSync();
      }
    }, 15000); // Check every 15 seconds

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      clearInterval(interval);
    };
  }, [triggerSync]);

  return (
    <SyncContext.Provider value={{ triggerSync, isOnline, isSyncing }}>
      {children}
    </SyncContext.Provider>
  );
}
