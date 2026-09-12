'use client';

import React, { createContext, useContext, useState, useCallback } from 'react';
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
  const [isRefreshing, setIsRefreshing] = useState(false);

  const triggerRefresh = useCallback(async () => {
    if (isRefreshing) return;
    setIsRefreshing(true);
    try {
      await refreshAllDataAction();
      router.refresh();
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('app:refresh'));
      }
    } catch (e) {
      console.error('Refresh error:', e);
      router.refresh();
    } finally {
      setTimeout(() => {
        setIsRefreshing(false);
      }, 750);
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
