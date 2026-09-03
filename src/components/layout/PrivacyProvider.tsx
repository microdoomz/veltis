"use client";

import React, { createContext, useContext, useEffect, useState } from 'react';

type PrivacyContextType = {
  isPrivacyModeEnabled: boolean;
  setPrivacyMode: (enabled: boolean) => void;
  temporarilyReveal: () => void;
  isRevealed: boolean;
};

export const PrivacyContext = createContext<PrivacyContextType | undefined>(undefined);

export function PrivacyProvider({ children }: { children: React.ReactNode }) {
  const [isPrivacyModeEnabled, setIsPrivacyModeEnabled] = useState(false);
  const [isRevealed, setIsRevealed] = useState(false);

  useEffect(() => {
    // Load from local storage
    const saved = localStorage.getItem('veltis_privacy_mode');
    if (saved === 'true') {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setIsPrivacyModeEnabled(true);
    }
  }, []);

  const setPrivacyMode = (enabled: boolean) => {
    setIsPrivacyModeEnabled(enabled);
    localStorage.setItem('veltis_privacy_mode', enabled ? 'true' : 'false');
    if (!enabled) {
      setIsRevealed(false);
    }
  };

  const temporarilyReveal = () => {
    // V1: Simple reveal without biometric prompt. 
    // This can be replaced with a WebAuthn prompt later.
    setIsRevealed(true);
    // Auto-hide after 30 seconds
    setTimeout(() => {
      setIsRevealed(false);
    }, 30000);
  };

  return (
    <PrivacyContext.Provider value={{
      isPrivacyModeEnabled,
      setPrivacyMode,
      temporarilyReveal,
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
