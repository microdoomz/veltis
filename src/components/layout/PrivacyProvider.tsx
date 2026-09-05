"use client";

import React, { createContext, useContext, useEffect, useState } from 'react';

type PrivacyContextType = {
  isPrivacyModeEnabled: boolean;
  setPrivacyMode: (enabled: boolean) => void;
  togglePrivacyMode: () => void;
  temporarilyReveal: () => void;
  toggleReveal: () => void;
  isRevealed: boolean;
};

export const PrivacyContext = createContext<PrivacyContextType | undefined>(undefined);

export function PrivacyProvider({ children }: { children: React.ReactNode }) {
  const [isPrivacyModeEnabled, setIsPrivacyModeEnabled] = useState(false);
  const [isRevealed, setIsRevealed] = useState(false);
  const revealTimerRef = React.useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // Load from local storage
    const saved = localStorage.getItem('veltis_privacy_mode');
    if (saved === 'true') {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setIsPrivacyModeEnabled(true);
    }
    return () => {
      if (revealTimerRef.current) clearTimeout(revealTimerRef.current);
    };
  }, []);

  const setPrivacyMode = (enabled: boolean) => {
    setIsPrivacyModeEnabled(enabled);
    localStorage.setItem('veltis_privacy_mode', enabled ? 'true' : 'false');
    if (!enabled) {
      setIsRevealed(false);
    }
  };

  const togglePrivacyMode = () => {
    setPrivacyMode(!isPrivacyModeEnabled);
  };

  const toggleReveal = () => {
    if (revealTimerRef.current) clearTimeout(revealTimerRef.current);
    if (isRevealed) {
      setIsRevealed(false);
    } else {
      setIsRevealed(true);
      revealTimerRef.current = setTimeout(() => {
        setIsRevealed(false);
      }, 15000);
    }
  };

  const temporarilyReveal = () => {
    if (revealTimerRef.current) clearTimeout(revealTimerRef.current);
    setIsRevealed(true);
    // Auto-hide after 15 seconds
    revealTimerRef.current = setTimeout(() => {
      setIsRevealed(false);
    }, 15000);
  };

  return (
    <PrivacyContext.Provider value={{
      isPrivacyModeEnabled,
      setPrivacyMode,
      togglePrivacyMode,
      temporarilyReveal,
      toggleReveal,
      isRevealed
    }}>
      {children}
    </PrivacyContext.Provider>
  );
}

export function usePrivacy() {
  const context = useContext(PrivacyContext);
  if (context === undefined) {
    throw new Error('usePrivacy must be used within a PrivacyProvider');
  }
  return context;
}
