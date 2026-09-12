'use client';

import React, { createContext, useContext, useState, useTransition, useCallback } from 'react';
import { useRouter } from 'next/navigation';

import { refreshAllDataAction } from '@/app/actions/refresh';

interface RefreshContextType {
  isRefreshing: boolean;
  triggerRefresh: () => void;
}

const RefreshContext = createContext<RefreshContextType>({
  isRefreshing: false,
  triggerRefresh: () => {},
});

export function RefreshProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [isActionPending, setIsActionPending] = useState(false);

  const isRefreshing = isPending || isActionPending;

  const triggerRefresh = useCallback(async () => {
    if (isRefreshing) return;
    setIsActionPending(true);
    try {
      await refreshAllDataAction();
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('app:refresh'));
      }
      startTransition(() => {
        router.refresh();
      });
    } catch (e) {
      console.error('Refresh error:', e);
    } finally {
      setIsActionPending(false);
    }
  }, [isRefreshing, router]);

  return (
    <RefreshContext.Provider value={{ isRefreshing, triggerRefresh }}>
      {children}
    </RefreshContext.Provider>
  );
}

export function useRefresh() {
  return useContext(RefreshContext);
}
