import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { describe, it, expect, afterEach, vi } from 'vitest';
import { PrivacyProvider } from '@/components/layout/PrivacyProvider';
import { PrivacyToggle } from '@/components/layout/PrivacyToggle';
import { Amount } from '@/components/ui/amount';

// Mock framer-motion to avoid animation timing in tests
vi.mock('framer-motion', () => ({
  motion: {
    span: ({ children, ...props }: any) => <span {...props}>{children}</span>,
  },
  AnimatePresence: ({ children }: any) => <>{children}</>,
}));

// Mock CurrencyProvider
vi.mock('@/components/layout/CurrencyProvider', () => ({
  useCurrency: () => ({ baseCurrency: 'USD' }),
}));

afterEach(() => {
  cleanup();
  localStorage.clear();
});

describe('Privacy Mode & Amount Masking', () => {
  it('renders unmasked amount when privacy mode is disabled', () => {
    localStorage.setItem('veltis_privacy_mode', 'false');
    render(
      <PrivacyProvider>
        <Amount valueMinor={150000n} currency="USD" />
      </PrivacyProvider>
    );

    expect(screen.getByText('$1,500.00')).toBeDefined();
  });

  it('renders masked amount with cash emoji 💵 •••••• by default when privacy mode is active', () => {
    render(
      <PrivacyProvider>
        <Amount valueMinor={150000n} currency="USD" />
      </PrivacyProvider>
    );

    expect(screen.getByText('💵 ••••••')).toBeDefined();
  });

  it('toggles reveal on click when privacy mode is active', () => {
    render(
      <PrivacyProvider>
        <Amount valueMinor={150000n} currency="USD" />
      </PrivacyProvider>
    );

    const maskedEl = screen.getByText('💵 ••••••');
    expect(maskedEl).toBeDefined();

    // Click to reveal
    fireEvent.click(maskedEl);
    expect(screen.getByText('$1,500.00')).toBeDefined();

    // Click again to re-hide
    const revealedEl = screen.getByText('$1,500.00');
    fireEvent.click(revealedEl);
    expect(screen.getByText('💵 ••••••')).toBeDefined();
  });

  it('toggles privacy mode using PrivacyToggle', () => {
    render(
      <PrivacyProvider>
        <PrivacyToggle />
        <Amount valueMinor={250000n} currency="USD" />
      </PrivacyProvider>
    );

    // Default is active (masked)
    expect(screen.getByText('💵 ••••••')).toBeDefined();

    const toggleBtn = screen.getByRole('button', { name: /Toggle Privacy Mode/i });
    fireEvent.click(toggleBtn);

    // Now unmasked
    expect(screen.getByText('$2,500.00')).toBeDefined();

    // Toggle back on
    fireEvent.click(toggleBtn);
    expect(screen.getByText('💵 ••••••')).toBeDefined();
  });
});

