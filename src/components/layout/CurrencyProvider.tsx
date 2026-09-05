"use client"

import React, { createContext, useContext, useMemo } from 'react';

interface CurrencyContextType {
  baseCurrency: string;
}

const CurrencyContext = createContext<CurrencyContextType>({
  baseCurrency: 'USD',
});

export function CurrencyProvider({
  baseCurrency = 'USD',
  children,
}: {
  baseCurrency?: string;
  children: React.ReactNode;
}) {
  const value = useMemo(
    () => ({
      baseCurrency: (baseCurrency || 'USD').toUpperCase(),
    }),
    [baseCurrency]
  );

  return (
    <CurrencyContext.Provider value={value}>
      {children}
    </CurrencyContext.Provider>
  );
}

export function useCurrency(): CurrencyContextType {
  return useContext(CurrencyContext);
}
